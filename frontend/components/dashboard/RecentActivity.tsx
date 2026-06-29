import { History } from "lucide-react";
import { ActivityCard } from "./ActivityCard";

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
          <ActivityCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>
    </section>
  );
}
