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
        <div className="rounded-3xl border border-primary/40 bg-primary/10 p-5 shadow-soft md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-primary">Toss Payments</p>
              <h1 className="mt-2 text-3xl font-black text-title sm:text-4xl">
                테스트 결제 실패
              </h1>
              <p className="mt-3 text-sm font-bold leading-6 text-body">
                Toss 결제창에서 실패 또는 취소 응답을 받았습니다. 크레딧은 지급되지 않았습니다.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-card/80 px-4 py-2 text-sm font-black text-primary">
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
        <p className="text-sm font-black text-gold">Toss 실패 정보를 불러오는 중입니다.</p>
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
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-muted">
        <span className="text-gold">{icon}</span>
        {label}
      </div>
      <p className="mt-3 break-words text-lg font-black text-title">{value}</p>
    </div>
  );
}
