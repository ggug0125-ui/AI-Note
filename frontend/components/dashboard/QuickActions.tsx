import type { ReactNode } from "react";
import { ArrowRightLeft, BarChart3, MessageSquareText, Sparkles, UploadCloud } from "lucide-react";
import type { WorkspaceTab } from "./types";
import { QuickActionCard } from "./QuickActionCard";

type QuickActionsProps = {
  onNavigate: (tab: WorkspaceTab) => void;
};

export function QuickActions({ onNavigate }: QuickActionsProps) {
  const actionCards: Array<{ title: string; description: string; tab: WorkspaceTab; icon: ReactNode }> = [
    {
      title: "문서 업로드",
      description: "문서 목록과 분석 상태를 확인합니다.",
      tab: "documents",
      icon: <UploadCloud size={22} />,
    },
    {
      title: "AI 분석",
      description: "요약과 키워드 추출을 시작합니다.",
      tab: "analysis",
      icon: <BarChart3 size={22} />,
    },
    {
      title: "AI Chat",
      description: "문서 기반 질문을 바로 이어갑니다.",
      tab: "chat",
      icon: <MessageSquareText size={22} />,
    },
    {
      title: "파일 변환",
      description: "Excel, HWPX 변환 도구로 이동합니다.",
      tab: "convert",
      icon: <ArrowRightLeft size={22} />,
    },
  ];

  return (
    <section className="rounded-3xl border border-border bg-[linear-gradient(135deg,rgb(var(--ai-card))_0%,rgb(var(--ai-surface))_100%)] p-5 shadow-soft md:p-6">
      <div className="flex items-center gap-3">
        <Sparkles className="text-primary" size={22} />
        <h2 className="text-xl font-black text-title">빠른 시작</h2>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {actionCards.map((card) => (
          <QuickActionCard
            key={card.title}
            title={card.title}
            description={card.description}
            icon={card.icon}
            onClick={() => onNavigate(card.tab)}
          />
        ))}
      </div>
    </section>
  );
}
