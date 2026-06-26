"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, CreditCard, ReceiptText, Sparkles } from "lucide-react";
import { Suspense, useState, type ReactNode } from "react";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsSdk;
  }
}

type TossPaymentsSdk = {
  payment: (options: { customerKey: string }) => TossPayment;
};

type TossPayment = {
  requestPayment: (options: {
    method: string;
    amount: {
      currency: string;
      value: number;
    };
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
  }) => Promise<void>;
};

const TOSS_SDK_URL = "https://js.tosspayments.com/v2/standard";
const TOSS_ENV = process.env.NEXT_PUBLIC_TOSS_ENV === "live" ? "live" : "test";
// 운영 전 환경변수로 교체
const TOSS_TEST_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_TEST_CLIENT_KEY || "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";
const TOSS_LIVE_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_LIVE_CLIENT_KEY || "";
const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || (TOSS_ENV === "live" ? TOSS_LIVE_CLIENT_KEY : TOSS_TEST_CLIENT_KEY);
let tossSdkPromise: Promise<void> | null = null;

function loadTossSdk() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저에서만 Toss 결제창을 열 수 있습니다."));
  }

  if (window.TossPayments) {
    return Promise.resolve();
  }

  if (!tossSdkPromise) {
    tossSdkPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${TOSS_SDK_URL}"]`);
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Toss SDK 로드에 실패했습니다.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = TOSS_SDK_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Toss SDK 로드에 실패했습니다."));
      document.head.appendChild(script);
    });
  }

  return tossSdkPromise;
}

function formatAmount(value: string | null, currency = "KRW") {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    return value || "-";
  }

  if (currency === "KRW") {
    return `\u20a9${amount.toLocaleString("ko-KR")}`;
  }

  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US")} USD`;
  }

  return `$${amount.toLocaleString("en-US")}`;
}

function formatCredits(value: string | null) {
  const credits = Number(value ?? 0);
  if (!Number.isFinite(credits)) {
    return value || "-";
  }

  return `${credits.toLocaleString("en-US")} Credits`;
}

function getReadyGemIcon(productName: string) {
  const normalized = productName.toLowerCase();
  if (normalized.includes("business")) {
    return "/images/credit-business-gem.png";
  }
  if (normalized.includes("premium")) {
    return "/images/credit-standard-gem.png";
  }
  if (normalized.includes("standard")) {
    return "/images/credit-premium-gem.png";
  }
  if (normalized.includes("starter")) {
    return "/images/credit-starter-gem.png";
  }

  return "/images/credit-starter-gem.png";
}

function getRequiredParam(value: string, label: string) {
  if (!value || value === "-") {
    throw new Error(`${label} 정보가 없습니다.`);
  }

  return value;
}

export default function TossReadyPage() {
  return (
    <Suspense fallback={<TossReadyShell />}>
      <TossReadyContent />
    </Suspense>
  );
}

function TossReadyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("payment_id") || "-";
  const orderId = searchParams.get("order_id") || "-";
  const productName = searchParams.get("product_name") || "AI Note Credit";
  const amount = searchParams.get("amount");
  const credits = searchParams.get("credits");
  const currency = searchParams.get("currency") || "KRW";
  const gemIcon = getReadyGemIcon(productName);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpeningToss, setIsOpeningToss] = useState(false);

  async function handleInternalTestSuccess() {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/payments/toss/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_id: getRequiredParam(paymentId, "결제 ID"),
          order_id: getRequiredParam(orderId, "주문 ID"),
          amount: Number(amount ?? 0),
          payment_key: "test_payment_key",
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorData?.detail || "Toss 테스트 결제 처리에 실패했습니다.");
      }

      alert("테스트 결제가 완료되어 크레딧이 지급되었습니다.");
      router.push("/mypage?tab=payments");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Toss 테스트 결제 처리에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOpenTossTestPayment() {
    setErrorMessage("");
    setIsOpeningToss(true);

    try {
      const safePaymentId = getRequiredParam(paymentId, "결제 ID");
      const safeOrderId = getRequiredParam(orderId, "주문 ID");
      const amountValue = Number(amount ?? 0);
      const creditsValue = credits || "0";

      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        throw new Error("결제 금액이 올바르지 않습니다.");
      }

      await loadTossSdk();
      if (!window.TossPayments) {
        throw new Error("Toss SDK가 초기화되지 않았습니다.");
      }
      if (!TOSS_CLIENT_KEY) {
        throw new Error("Toss 클라이언트 키가 설정되지 않았습니다.");
      }

      const origin = window.location.origin;
      const successParams = new URLSearchParams({
        payment_id: safePaymentId,
        orderId: safeOrderId,
        amount: String(amountValue),
        credits: creditsValue,
        currency,
        product_name: productName,
      });
      const failParams = new URLSearchParams({
        payment_id: safePaymentId,
        orderId: safeOrderId,
        amount: String(amountValue),
        credits: creditsValue,
        currency,
        product_name: productName,
      });

      const tossPayments = window.TossPayments(TOSS_CLIENT_KEY);
      const payment = tossPayments.payment({
        customerKey: `noteflow_${safePaymentId}`,
      });

      await payment.requestPayment({
        method: "CARD",
        amount: {
          currency: "KRW",
          value: Math.round(amountValue),
        },
        orderId: safeOrderId,
        orderName: `AI Note Credit ${creditsValue}`,
        successUrl: `${origin}/payments/toss/success?${successParams.toString()}`,
        failUrl: `${origin}/payments/toss/fail?${failParams.toString()}`,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Toss 테스트 결제창을 열지 못했습니다.");
      setIsOpeningToss(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#FFFDF8_0%,#FFF8EE_48%,#F7EFE2_100%)] px-4 py-10 text-[#2F2418] sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-4xl flex-col gap-6">
        <Link
          href="/mypage?tab=billing"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E2C985]/70 bg-white/75 px-4 py-2 text-sm font-black text-[#7A551D] shadow-[0_10px_24px_rgba(124,82,27,0.08)] transition hover:-translate-y-0.5 hover:bg-white"
        >
          <ArrowLeft size={16} />
          마이페이지로 돌아가기
        </Link>

        <div className="rounded-3xl border border-[#E9D8BD] bg-[#FFFDF7] p-5 shadow-[0_18px_45px_rgba(124,82,27,0.08)] md:p-7">
          <div className="rounded-3xl border border-[#E9D8C1] bg-[linear-gradient(135deg,#FFFDF8_0%,#FFF8EE_100%)] p-5 shadow-[0_14px_34px_rgba(124,82,27,0.08)] md:p-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#8A6A35]">Toss Payments</p>
                <h1 className="mt-2 text-3xl font-black text-[#2F2418] sm:text-4xl">
                  결제 준비 확인
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-[#6F5A40]">
                  토스페이먼츠 테스트 결제창을 열거나, 내부 테스트 성공 처리로 크레딧 지급 흐름을 확인할 수 있습니다.
                </p>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E2C985]/70 bg-white/80 px-4 py-2 text-sm font-black text-[#7A551D]">
                <CheckCircle2 size={16} />
                상태: ready
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border border-[#E8C77A]/60 bg-[linear-gradient(135deg,#FFFDF8_0%,#FFF5DF_54%,#F7E8C6_100%)] p-5 shadow-[0_16px_34px_rgba(124,82,27,0.08)]">
            <p className="text-xs font-black uppercase tracking-wide text-[#8A7354]">Selected Plan</p>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center">
                  <Image
                    src={gemIcon}
                    alt={`${productName} gem icon`}
                    width={42}
                    height={42}
                    className="max-h-full max-w-full object-contain"
                  />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-4xl font-black text-[#2F2418]">{productName}</h2>
                  <p className="mt-1 text-sm font-bold text-[#7A6245]">Toss 테스트 결제 준비가 완료되었습니다.</p>
                </div>
              </div>
              <div className="grid gap-3 sm:min-w-[320px] sm:grid-cols-2">
                <div className="rounded-2xl border border-[#EAD8C1] bg-white/72 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-[#8A7354]">Pay</p>
                  <p className="ready-price-shimmer mt-1 text-3xl font-black">{formatAmount(amount, currency)}</p>
                </div>
                <div className="rounded-2xl border border-[#EAD8C1] bg-white/72 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-[#8A7354]">Receive</p>
                  <p className="ready-credit-glow mt-1 text-3xl font-black">{formatCredits(credits)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <InfoCard icon={<CreditCard size={18} />} label="결제 제공자" value="Toss" />
            <InfoCard icon={<ReceiptText size={18} />} label="결제 ID" value={paymentId} />
            <InfoCard icon={<ReceiptText size={18} />} label="주문 ID" value={orderId} />
            <InfoCard icon={<CreditCard size={18} />} label="결제 금액" value={formatAmount(amount, currency)} />
            <InfoCard icon={<Sparkles size={18} />} label="지급 예정 크레딧" value={formatCredits(credits)} />
            <InfoCard icon={<CheckCircle2 size={18} />} label="상태" value="ready" />
          </div>

          {errorMessage && (
            <div className="mt-5 rounded-2xl border border-[#E8A77A]/60 bg-[#FFF3EE] p-4 text-sm font-bold text-[#9A3E1F]">
              {errorMessage}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/mypage?tab=billing"
              className="inline-flex h-12 items-center justify-center rounded-full border border-[#E2C985]/70 bg-white px-5 text-sm font-black text-[#7A551D] shadow-[0_10px_22px_rgba(124,82,27,0.1)] transition hover:-translate-y-0.5 hover:bg-[#FFF8EE]"
            >
              마이페이지로 돌아가기
            </Link>
            <button
              type="button"
              onClick={handleInternalTestSuccess}
              disabled={isSubmitting || isOpeningToss}
              className="inline-flex h-12 items-center justify-center rounded-full border border-[#E2C985]/70 bg-white px-5 text-sm font-black text-[#7A551D] shadow-[0_10px_22px_rgba(124,82,27,0.1)] transition hover:-translate-y-0.5 hover:bg-[#FFF8EE] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "처리 중..." : "내부 테스트 성공 처리"}
            </button>
            <button
              type="button"
              onClick={handleOpenTossTestPayment}
              disabled={isSubmitting || isOpeningToss}
              className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#F7D774_0%,#E7A93B_100%)] px-5 text-sm font-black text-[#34220F] shadow-[0_10px_22px_rgba(124,82,27,0.16)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isOpeningToss ? "결제창 여는 중..." : "토스 테스트 결제창 열기"}
            </button>
          </div>
        </div>
      </section>
      <style>{`
        .ready-price-shimmer,
        .ready-credit-glow {
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
        }

        .ready-price-shimmer {
          background-image: linear-gradient(105deg, #2f2418 0%, #7a551d 38%, #d89b22 52%, #5f3d13 100%);
          background-size: 220% 100%;
          animation: ready-price-shimmer 4.4s ease-in-out infinite;
        }

        .ready-credit-glow {
          background-image: linear-gradient(105deg, #7a551d 0%, #a56f20 42%, #d7a142 55%, #6f4713 100%);
          text-shadow: 0 8px 20px rgba(124, 82, 27, 0.12);
        }

        @keyframes ready-price-shimmer {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ready-price-shimmer {
            animation: none;
            background-position: 45% 50%;
          }
        }
      `}</style>
    </main>
  );
}

function TossReadyShell() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#FFFDF8_0%,#FFF8EE_48%,#F7EFE2_100%)] px-4 py-10 text-[#2F2418] sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl rounded-3xl border border-[#E9D8BD] bg-[#FFFDF7] p-6 shadow-[0_18px_45px_rgba(124,82,27,0.08)]">
        <p className="text-sm font-black text-[#7A551D]">Toss 결제 준비 정보를 불러오는 중입니다.</p>
      </section>
    </main>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E8C77A]/55 bg-white/75 p-4 shadow-[0_12px_28px_rgba(124,82,27,0.06)]">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#8A7354]">
        <span className="text-[#A66A1F]">{icon}</span>
        {label}
      </div>
      <p className="mt-3 break-words text-lg font-black text-[#2F2418]">{value}</p>
    </div>
  );
}
