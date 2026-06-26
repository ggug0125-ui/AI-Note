import type { ReactNode } from "react";
import { ArrowRightLeft, BarChart3, MessageSquareText, Sparkles, UploadCloud } from "lucide-react";
import type { WorkspaceTab } from "../../app/dashboard/page";

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
    <section className="rounded-3xl border border-[#E9D8BD] bg-[linear-gradient(135deg,#FFFDF8_0%,#FFF8EE_100%)] p-5 shadow-[0_14px_34px_rgba(124,82,27,0.07)] md:p-6">
      <div className="flex items-center gap-3">
        <Sparkles className="text-coral" size={22} />
        <h2 className="text-xl font-black text-[#2F2418]">빠른 시작</h2>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {actionCards.map((card) => (
          <button
            key={card.title}
            type="button"
            onClick={() => onNavigate(card.tab)}
            className="rounded-2xl border border-[#EAD8C1] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#D8AE5E] hover:shadow-[0_12px_26px_rgba(124,82,27,0.12)]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF3E5] text-coral">
              {card.icon}
            </span>
            <strong className="mt-4 block text-base font-black text-[#2F2418]">{card.title}</strong>
            <span className="mt-2 block text-sm font-bold leading-6 text-[#6F5A40]">{card.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
