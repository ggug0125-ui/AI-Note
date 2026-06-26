import { ArrowRightLeft, BarChart3, FileSearch, MessageSquareText } from "lucide-react";

type DashboardStatsProps = {
  documentCount: number;
  analysisCount: number;
  questionCount: number;
  conversionCount: number;
};

export function DashboardStats({
  documentCount,
  analysisCount,
  questionCount,
  conversionCount,
}: DashboardStatsProps) {
  const statCards = [
    { label: "업로드 문서", value: documentCount, icon: <FileSearch size={20} /> },
    { label: "AI 분석", value: analysisCount, icon: <BarChart3 size={20} /> },
    { label: "AI 질문", value: questionCount, icon: <MessageSquareText size={20} /> },
    { label: "변환 작업", value: conversionCount, icon: <ArrowRightLeft size={20} /> },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {statCards.map((card) => (
        <article
          key={card.label}
          className="rounded-3xl border border-[#E9D8BD] bg-white p-5 shadow-[0_14px_34px_rgba(124,82,27,0.07)]"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#8A7354]">{card.label}</p>
              <strong className="mt-2 block text-4xl font-black text-[#2F2418]">{card.value}</strong>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF3E5] text-coral">
              {card.icon}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
