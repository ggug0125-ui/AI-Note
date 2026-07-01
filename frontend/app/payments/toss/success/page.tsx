"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, CreditCard, ReceiptText, Sparkles } from "lucide-react";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";

type TossConfirmResponse = {
  payment_id?: string;
  order_id?: string;
  provider?: string;
  status?: string;
  amount?: number;
  credits?: number;
  current_credits?: number;
  already_paid?: boolean;
};

function formatAmount(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    return String(value || "-");
  }

  return `$${amount.toLocaleString("en-US")}`;
}

function formatCredits(value: string | number | null | undefined) {
  const credits = Number(value ?? 0);
  if (!Number.isFinite(credits)) {
    return String(value || "-");
  }

  return `${credits.toLocaleString("en-US")} Credits`;
}

function formatCreditNumber(value: number) {
  return Math.max(0, Math.round(value)).toLocaleString("en-US");
}

function useCountUp(targetValue: number, isActive: boolean, durationMs = 900) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isActive || !Number.isFinite(targetValue)) {
      setDisplayValue(0);
      return;
    }

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayValue(targetValue);
      return;
    }

    let frameId = 0;
    let startTime = 0;

    const animate = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp;
      }

      const progress = Math.min((timestamp - startTime) / durationMs, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(targetValue * easedProgress);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, [durationMs, isActive, targetValue]);

  return displayValue;
}

export default function TossSuccessPage() {
  return (
    <Suspense fallback={<TossResultShell text="Toss 결제 승인 정보를 확인하는 중입니다." />}>
      <TossSuccessContent />
    </Suspense>
  );
}

function TossSuccessContent() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("payment_id") || "";
  const paymentKey = searchParams.get("paymentKey") || "";
  const orderId = searchParams.get("orderId") || "";
  const amount = searchParams.get("amount") || "";
  const credits = searchParams.get("credits") || "";
  const hasConfirmedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmResult, setConfirmResult] = useState<TossConfirmResponse | null>(null);
  const awardedCreditsTarget = Number(confirmResult?.credits ?? credits ?? 0);
  const currentCreditsTarget = Number(confirmResult?.current_credits ?? 0);
  const displayedAwardedCredits = useCountUp(awardedCreditsTarget, Boolean(confirmResult), 820);
  const displayedCurrentCredits = useCountUp(currentCreditsTarget, Boolean(confirmResult), 980);

  useEffect(() => {
    if (hasConfirmedRef.current) {
      return;
    }
    hasConfirmedRef.current = true;

    async function confirmPayment() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        if (!paymentId || !paymentKey || !orderId || !amount) {
          throw new Error("Toss 결제 승인 정보가 부족합니다.");
        }

        const response = await authenticatedFetch(`${API_BASE_URL}/payments/toss/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            payment_id: paymentId,
            order_id: orderId,
            amount: Number(amount),
            payment_key: paymentKey,
          }),
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => null)) as { detail?: string } | null;
          throw new Error(errorData?.detail || "Toss 테스트 결제 승인 처리에 실패했습니다.");
        }

        const data = (await response.json()) as TossConfirmResponse;
        setConfirmResult(data);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Toss 테스트 결제 승인 처리에 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    }

    void confirmPayment();
  }, [amount, orderId, paymentId, paymentKey]);

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,rgb(var(--ai-bg))_0%,rgb(var(--ai-surface))_48%,rgb(var(--ai-panel))_100%)] px-4 py-10 text-title sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl rounded-3xl border border-border bg-card p-5 shadow-soft md:p-7">
        <div className="rounded-3xl border border-gold/60 bg-[linear-gradient(135deg,rgb(var(--ai-card))_0%,rgb(var(--ai-panel))_100%)] p-5 shadow-soft md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-muted">Toss Payments</p>
              <h1 className="mt-2 text-3xl font-black text-title sm:text-4xl">
                테스트 결제 승인 처리
              </h1>
              <p className="mt-3 text-sm font-bold leading-6 text-body">
                Toss 결제창 성공 복귀 후 내부 confirm endpoint로 크레딧 지급을 확인합니다.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-gold/70 bg-card/80 px-4 py-2 text-sm font-black text-gold">
              <CheckCircle2 size={16} />
              {isLoading ? "처리 중" : confirmResult ? "완료" : "확인 필요"}
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="mt-5 rounded-2xl border border-gold/55 bg-card/75 p-4 text-sm font-bold text-gold">
            테스트 결제 승인 정보를 처리하는 중입니다.
          </div>
        )}

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm font-bold text-primary">
            {errorMessage}
          </div>
        )}

        {confirmResult && (
          <>
            <div className="mt-5 rounded-3xl border border-gold/60 bg-[linear-gradient(135deg,rgb(var(--ai-card))_0%,rgb(var(--ai-panel))_100%)] p-6 text-center shadow-soft">
              <div className="success-check-pop mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold/15 text-gold shadow-soft">
                <CheckCircle2 size={48} strokeWidth={2.4} />
              </div>
              <h2 className="mt-4 text-3xl font-black text-title">🎉 결제가 완료되었습니다.</h2>
              <p className="mt-3 text-lg font-black text-body">
                {formatCreditNumber(displayedAwardedCredits)} Credits가 지급되었습니다.
              </p>
              <div className="success-sparkle-field relative mx-auto mt-4 w-fit">
                <span className="success-sparkle-dot success-sparkle-dot-a" />
                <span className="success-sparkle-dot success-sparkle-dot-b" />
                <span className="success-sparkle-dot success-sparkle-dot-c" />
                <p className="success-credit-sparkle text-4xl font-black">
                  +{formatCreditNumber(displayedAwardedCredits)} Credits ✨
                </p>
              </div>
              <p className="mt-2 text-sm font-bold text-muted">현재 보유 크레딧</p>
              <p className="success-current-credit mt-1 text-4xl font-black">
                {formatCreditNumber(displayedCurrentCredits)} Credits
              </p>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoCard icon={<ReceiptText size={18} />} label="주문 ID" value={confirmResult.order_id || orderId} />
              <InfoCard icon={<Sparkles size={18} />} label="지급 크레딧" value={formatCredits(confirmResult.credits ?? credits)} />
              <InfoCard icon={<CreditCard size={18} />} label="현재 크레딧" value={formatCredits(confirmResult.current_credits)} />
              <InfoCard icon={<CheckCircle2 size={18} />} label="상태" value={confirmResult.status || "paid"} />
            </div>
          </>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {errorMessage ? (
            <Link
              href="/mypage?tab=billing"
              className="inline-flex h-12 items-center justify-center rounded-full border border-gold/70 bg-surface px-5 text-sm font-black text-gold shadow-soft transition hover:-translate-y-0.5 hover:bg-panel"
            >
              결제 정보로 돌아가기
            </Link>
          ) : (
            <>
              <Link
                href="/mypage?tab=billing"
                className="inline-flex h-12 items-center justify-center rounded-full border border-gold/70 bg-surface px-5 text-sm font-black text-gold shadow-soft transition hover:-translate-y-0.5 hover:bg-panel"
              >
                결제 정보로 이동
              </Link>
              <Link
                href="/mypage?tab=payments"
                className="ai-btn ai-btn-payment h-12 px-5"
              >
                결제 내역으로 이동
              </Link>
            </>
          )}
        </div>
      </section>
      <style>{`
        .success-credit-sparkle,
        .success-current-credit {
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
        }

        .success-check-pop {
          animation: success-check-pop 0.38s ease-out both;
        }

        .success-credit-sparkle {
          background-image: linear-gradient(105deg, #2f7a1f 0%, #56a63a 34%, #d7b85a 52%, #2f7a1f 100%);
          background-size: 220% 100%;
          animation: success-credit-sparkle 1s ease-in-out 2;
          text-shadow: 0 10px 24px rgba(55, 107, 36, 0.16);
        }

        .success-current-credit {
          background-image: linear-gradient(105deg, #264f18 0%, #3f7d29 48%, #76a84b 100%);
          text-shadow: 0 8px 20px rgba(55, 107, 36, 0.12);
        }

        .success-sparkle-dot {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: #d7b85a;
          box-shadow: 0 0 14px rgba(215, 184, 90, 0.62);
          animation: success-sparkle-dot 1.2s ease-in-out 2;
          pointer-events: none;
        }

        .success-sparkle-dot-a {
          left: -14px;
          top: 8px;
        }

        .success-sparkle-dot-b {
          right: -12px;
          top: -2px;
          animation-delay: 0.12s;
        }

        .success-sparkle-dot-c {
          right: 12px;
          bottom: -8px;
          animation-delay: 0.22s;
        }

        @keyframes success-check-pop {
          0% {
            opacity: 0;
            transform: scale(0.86);
          }
          70% {
            opacity: 1;
            transform: scale(1.06);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes success-credit-sparkle {
          0%, 100% {
            background-position: 0% 50%;
            transform: scale(1);
          }
          50% {
            background-position: 100% 50%;
            transform: scale(1.025);
          }
        }

        @keyframes success-sparkle-dot {
          0%, 100% {
            opacity: 0;
            transform: translateY(3px) scale(0.75);
          }
          45% {
            opacity: 1;
            transform: translateY(-2px) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .success-check-pop,
          .success-credit-sparkle {
            animation: none;
          }

          .success-credit-sparkle {
            background-position: 45% 50%;
          }

          .success-sparkle-dot {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}

function TossResultShell({ text }: { text: string }) {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,rgb(var(--ai-bg))_0%,rgb(var(--ai-surface))_48%,rgb(var(--ai-panel))_100%)] px-4 py-10 text-title sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl rounded-3xl border border-border bg-card p-6 shadow-soft">
        <p className="text-sm font-black text-gold">{text}</p>
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
    <div className="rounded-2xl border border-gold/55 bg-panel p-4 shadow-soft">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-muted">
        <span className="text-gold">{icon}</span>
        {label}
      </div>
      <p className="mt-3 break-words text-lg font-black text-title">{value}</p>
    </div>
  );
}
