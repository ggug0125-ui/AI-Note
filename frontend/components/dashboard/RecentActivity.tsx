import { History } from "lucide-react";

type RecentActivityProps = {
  recentDocument: string;
  recentAnalysis: string;
  recentQuestion: string;
  recentConversion: string;
};

export function RecentActivity({
  recentDocument,
  recentAnalysis,
  recentQuestion,
  recentConversion,
}: RecentActivityProps) {
  const recentCards = [
    { label: "최근 업로드 문서", value: recentDocument },
    { label: "최근 AI 분석", value: recentAnalysis },
    { label: "최근 질문", value: recentQuestion },
    { label: "최근 변환", value: recentConversion },
  ];

  return (
    <section className="rounded-3xl border border-[#E9D8BD] bg-white p-5 shadow-[0_14px_34px_rgba(124,82,27,0.07)] md:p-6">
      <div className="flex items-center gap-3">
        <History className="text-coral" size={22} />
        <h2 className="text-xl font-black text-[#2F2418]">최근 활동</h2>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {recentCards.map((card) => (
          <article key={card.label} className="rounded-2xl border border-[#EAD8C1] bg-[#FFFDF8] p-4">
            <p className="text-xs font-black uppercase tracking-wide text-[#8A7354]">{card.label}</p>
            <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-[#4F3B25]">{card.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
