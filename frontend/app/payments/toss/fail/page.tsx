"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, ReceiptText } from "lucide-react";
import { Suspense, type ReactNode } from "react";

export default function TossFailPage() {
  return (
    <Suspense fallback={<TossFailShell />}>
      <TossFailContent />
    </Suspense>
  );
}

function TossFailContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "-";
  const message = searchParams.get("message") || "Toss 테스트 결제가 취소되었거나 실패했습니다.";
  const paymentId = searchParams.get("payment_id") || "-";

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,rgb(var(--ai-bg))_0%,rgb(var(--ai-surface))_48%,rgb(var(--ai-panel))_100%)] px-4 py-10 text-title sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl rounded-3xl border border-border bg-card p-5 shadow-soft md:p-7">
        <div className="rounded-3xl border border-[#F0C4AC] bg-[#FFF3EE] p-5 shadow-[0_14px_34px_rgba(124,82,27,0.08)] md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#9A3E1F]">Toss Payments</p>
              <h1 className="mt-2 text-3xl font-black text-[#2F2418] sm:text-4xl">
                테스트 결제 실패
              </h1>
              <p className="mt-3 text-sm font-bold leading-6 text-[#6F5A40]">
                Toss 결제창에서 실패 또는 취소 응답을 받았습니다. 크레딧은 지급되지 않았습니다.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E8A77A]/70 bg-white/80 px-4 py-2 text-sm font-black text-[#9A3E1F]">
              <AlertCircle size={16} />
              실패
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <InfoCard icon={<ReceiptText size={18} />} label="결제 ID" value={paymentId} />
          <InfoCard icon={<AlertCircle size={18} />} label="실패 코드" value={code} />
          <InfoCard icon={<AlertCircle size={18} />} label="실패 메시지" value={message} />
        </div>

        <div className="mt-6">
          <Link
            href="/mypage?tab=billing"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-gold/70 bg-surface px-5 text-sm font-black text-gold shadow-soft transition hover:-translate-y-0.5 hover:bg-panel"
          >
            <ArrowLeft size={16} />
            결제 정보로 돌아가기
          </Link>
        </div>
      </section>
    </main>
  );
}

function TossFailShell() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,rgb(var(--ai-bg))_0%,rgb(var(--ai-surface))_48%,rgb(var(--ai-panel))_100%)] px-4 py-10 text-title sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl rounded-3xl border border-border bg-card p-6 shadow-soft">
        <p className="text-sm font-black text-[#7A551D]">Toss 실패 정보를 불러오는 중입니다.</p>
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
    <div className="rounded-2xl border border-gold/55 bg-card/75 p-4 shadow-soft md:col-span-1">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#8A7354]">
        <span className="text-[#A66A1F]">{icon}</span>
        {label}
      </div>
      <p className="mt-3 break-words text-lg font-black text-[#2F2418]">{value}</p>
    </div>
  );
}
