import { ArrowRightLeft, BarChart3, FileText, History, MessageSquareText, Tags, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { WorkspaceTab } from "../types";
import { formatDocumentInfo, type DocumentViewModel } from "./types";

type SelectedDocumentPanelProps = {
  document: DocumentViewModel | null;
  onNavigate: (tab: WorkspaceTab) => void;
  onDelete: (document: DocumentViewModel) => Promise<boolean>;
  isDeleting: boolean;
  statusMessage?: string;
};

export function SelectedDocumentPanel({
  document,
  onNavigate,
  onDelete,
  isDeleting,
  statusMessage = "",
}: SelectedDocumentPanelProps) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  if (!document) {
    return (
      <aside className="ai-card min-w-0 p-6 2xl:sticky 2xl:top-28">
        <div className="ai-modal-icon h-12 w-12">
          <FileText size={23} />
        </div>
        <h2 className="mt-5 text-2xl font-black text-title">문서를 선택하면 AI 작업을 시작할 수 있어요</h2>
        <p className="ai-caption mt-3 font-bold">
          왼쪽 문서 카드에서 분석할 문서를 선택해주세요.
        </p>
        {statusMessage && (
          <p className="ai-alert mt-5">
            {statusMessage}
          </p>
        )}
      </aside>
    );
  }

  const actions: Array<{ label: string; tab: WorkspaceTab; icon: ReactNode }> = [
    { label: "요약하기", tab: "analysis", icon: <BarChart3 size={17} /> },
    { label: "키워드 추출", tab: "analysis", icon: <Tags size={17} /> },
    { label: "AI 채팅", tab: "chat", icon: <MessageSquareText size={17} /> },
    { label: "파일 변환", tab: "convert", icon: <ArrowRightLeft size={17} /> },
    { label: "기록 보기", tab: "history", icon: <History size={17} /> },
  ];

  return (
    <aside className="ai-card min-w-0 p-6 transition-all duration-200 2xl:sticky 2xl:top-28">
      <p className="ai-modal-eyebrow text-muted">Selected Document</p>
      <h2 className="mt-2 min-w-0 break-words text-2xl font-black text-title">{document.filename}</h2>

      <div className="mt-5 grid gap-3 text-sm font-bold text-body">
        <InfoRow label="파일 형식" value={document.extension} />
        <InfoRow label="상태" value={document.statusLabel} />
        <InfoRow label="업로드 날짜" value={document.createdLabel} />
        <InfoRow label="문서 정보" value={formatDocumentInfo(document)} />
      </div>

      <div className="ai-panel-compact mt-5">
        <p className="text-xs font-black uppercase tracking-wide text-muted">크레딧 안내</p>
        <p className="ai-caption mt-2 font-bold">
          문서 분석이 성공한 경우에만 크레딧이 차감됩니다.
        </p>
      </div>

      {statusMessage && !isDeleteModalOpen && (
        <p className="ai-alert mt-5">
          {statusMessage}
        </p>
      )}

      <div className="mt-5 grid gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => onNavigate(action.tab)}
            className="ai-btn ai-btn-secondary h-11 gap-2 px-4"
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setIsDeleteModalOpen(true)}
        disabled={isDeleting}
        className="ai-btn ai-btn-danger mt-5 h-11 w-full gap-2 px-4"
      >
        <Trash2 size={17} />
        {isDeleting ? "삭제 중" : "문서 삭제"}
      </button>

      {isDeleteModalOpen && (
        <div className="ai-modal-backdrop z-[70]">
          <section className="ai-modal max-w-md p-5">
            <div className="flex items-start gap-3">
              <div className="ai-modal-icon h-11 w-11 bg-red-50 text-red-700">
                <Trash2 size={21} />
              </div>
              <div className="min-w-0">
                <p className="ai-modal-eyebrow">Delete Document</p>
                <h2 className="mt-1 text-xl font-black text-title">문서 삭제</h2>
              </div>
            </div>

            <div className="ai-panel-compact mt-5 bg-panel text-sm font-bold leading-6">
              <p>
                <span className="font-black text-title [overflow-wrap:anywhere]">{document.filename}</span>
                {" "}문서를 삭제할까요?
              </p>
              <p className="mt-2">관련 요약, 키워드, 질문 기록도 함께 삭제됩니다.</p>
            </div>

            {statusMessage && (
              <p className="ai-alert mt-4 p-3">
                {statusMessage}
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="ai-btn ai-btn-secondary h-11"
              >
                취소
              </button>
              <button
                type="button"
                onClick={async () => {
                  const didDelete = await onDelete(document);
                  if (didDelete) {
                    setIsDeleteModalOpen(false);
                  }
                }}
                disabled={isDeleting}
                className="ai-btn ai-btn-danger h-11 px-4"
              >
                {isDeleting ? "삭제 중..." : "삭제하기"}
              </button>
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="ai-panel-compact flex min-w-0 items-start justify-between gap-4 px-4 py-3">
      <span className="shrink-0 text-[var(--ai-color-text-secondary)]">{label}</span>
      <span className="min-w-0 break-words text-right text-[var(--ai-color-text-primary)]">{value}</span>
    </div>
  );
}
