import { ArrowRightLeft, BarChart3, FileSearch, MessageSquareText } from "lucide-react";
import { StatCard } from "./StatCard";

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
        <StatCard key={card.label} label={card.label} value={card.value} icon={card.icon} />
      ))}
    </div>
  );
}
