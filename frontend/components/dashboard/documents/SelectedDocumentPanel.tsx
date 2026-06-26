import { ArrowRightLeft, BarChart3, FileText, History, MessageSquareText, Tags } from "lucide-react";
import type { ReactNode } from "react";
import type { WorkspaceTab } from "../types";
import type { DocumentViewModel } from "./types";

type SelectedDocumentPanelProps = {
  document: DocumentViewModel | null;
  onNavigate: (tab: WorkspaceTab) => void;
};

export function SelectedDocumentPanel({ document, onNavigate }: SelectedDocumentPanelProps) {
  if (!document) {
    return (
      <aside className="min-w-0 rounded-3xl border border-[#E9D8BD] bg-white p-6 shadow-[0_14px_34px_rgba(124,82,27,0.07)] 2xl:sticky 2xl:top-28">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF3E5] text-coral">
          <FileText size={23} />
        </div>
        <h2 className="mt-5 text-2xl font-black text-[#2F2418]">문서를 선택하면 AI 작업을 시작할 수 있어요</h2>
        <p className="mt-3 text-sm font-bold leading-6 text-[#6F5A40]">
          왼쪽 문서 카드에서 분석할 문서를 선택해주세요.
        </p>
      </aside>
    );
  }

  const actions: Array<{ label: string; tab: WorkspaceTab; icon: ReactNode }> = [
    { label: "요약하기", tab: "analysis", icon: <BarChart3 size={17} /> },
    { label: "키워드 추출", tab: "analysis", icon: <Tags size={17} /> },
    { label: "AI Chat", tab: "chat", icon: <MessageSquareText size={17} /> },
    { label: "파일 변환", tab: "convert", icon: <ArrowRightLeft size={17} /> },
    { label: "기록 보기", tab: "history", icon: <History size={17} /> },
  ];

  return (
    <aside className="min-w-0 rounded-3xl border border-[#E9D8BD] bg-white p-6 shadow-[0_14px_34px_rgba(124,82,27,0.07)] transition-all duration-200 2xl:sticky 2xl:top-28">
      <p className="text-xs font-black uppercase tracking-wide text-[#8A7354]">Selected Document</p>
      <h2 className="mt-2 min-w-0 break-words text-2xl font-black text-[#2F2418]">{document.filename}</h2>

      <div className="mt-5 grid gap-3 text-sm font-bold text-[#5F4B32]">
        <InfoRow label="파일 형식" value={document.extension} />
        <InfoRow label="상태" value={document.statusLabel} />
        <InfoRow label="업로드 날짜" value={document.createdLabel} />
        <InfoRow
          label="문서 정보"
          value={
            document.chunkCount !== null
              ? `${document.chunkCount.toLocaleString("en-US")} chunks`
              : document.textLength !== null
              ? `${document.textLength.toLocaleString("en-US")} chars`
              : "정보 없음"
          }
        />
      </div>

      <div className="mt-5 rounded-2xl border border-[#EAD8C1] bg-[#FFFDF8] p-4">
        <p className="text-xs font-black uppercase tracking-wide text-[#8A7354]">크레딧 안내</p>
        <p className="mt-2 text-sm font-bold leading-6 text-[#6F5A40]">
          성공 시에만 크레딧 차감. 최종 확인 단계에서 예상 차감량을 확인할 수 있어요.
        </p>
      </div>

      <div className="mt-5 grid gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => onNavigate(action.tab)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#E2C985]/70 bg-[#FFF8EE] px-4 text-sm font-black text-[#6F4713] transition hover:-translate-y-0.5 hover:border-[#D8AE5E] hover:bg-white hover:shadow-[0_10px_22px_rgba(124,82,27,0.12)]"
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </aside>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 rounded-2xl border border-[#EAD8C1] bg-[#FFFDF8] px-4 py-3">
      <span className="shrink-0 text-[#8A7354]">{label}</span>
      <span className="min-w-0 break-words text-right text-[#2F2418]">{value}</span>
    </div>
  );
}
