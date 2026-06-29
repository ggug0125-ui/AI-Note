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
      <aside className="min-w-0 rounded-3xl border border-[#E9D8BD] bg-white p-6 shadow-[0_14px_34px_rgba(124,82,27,0.07)] 2xl:sticky 2xl:top-28">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF3E5] text-coral">
          <FileText size={23} />
        </div>
        <h2 className="mt-5 text-2xl font-black text-[#2F2418]">문서를 선택하면 AI 작업을 시작할 수 있어요</h2>
        <p className="mt-3 text-sm font-bold leading-6 text-[#6F5A40]">
          왼쪽 문서 카드에서 분석할 문서를 선택해주세요.
        </p>
        {statusMessage && (
          <p className="mt-5 rounded-2xl border border-[#F0C7A6] bg-[#FFF3E5] p-4 text-sm font-bold leading-6 text-[#8A3F22]">
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
    <aside className="min-w-0 rounded-3xl border border-[#E9D8BD] bg-white p-6 shadow-[0_14px_34px_rgba(124,82,27,0.07)] transition-all duration-200 2xl:sticky 2xl:top-28">
      <p className="text-xs font-black uppercase tracking-wide text-[#8A7354]">Selected Document</p>
      <h2 className="mt-2 min-w-0 break-words text-2xl font-black text-[#2F2418]">{document.filename}</h2>

      <div className="mt-5 grid gap-3 text-sm font-bold text-[#5F4B32]">
        <InfoRow label="파일 형식" value={document.extension} />
        <InfoRow label="상태" value={document.statusLabel} />
        <InfoRow label="업로드 날짜" value={document.createdLabel} />
        <InfoRow label="문서 정보" value={formatDocumentInfo(document)} />
      </div>

      <div className="mt-5 rounded-2xl border border-[#EAD8C1] bg-[#FFFDF8] p-4">
        <p className="text-xs font-black uppercase tracking-wide text-[#8A7354]">크레딧 안내</p>
        <p className="mt-2 text-sm font-bold leading-6 text-[#6F5A40]">
          문서 분석이 성공한 경우에만 크레딧이 차감됩니다.
        </p>
      </div>

      {statusMessage && !isDeleteModalOpen && (
        <p className="mt-5 rounded-2xl border border-[#F0C7A6] bg-[#FFF3E5] p-4 text-sm font-bold leading-6 text-[#8A3F22]">
          {statusMessage}
        </p>
      )}

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

      <button
        type="button"
        onClick={() => setIsDeleteModalOpen(true)}
        disabled={isDeleting}
        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 size={17} />
        {isDeleting ? "삭제 중" : "문서 삭제"}
      </button>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-3xl border border-[#EFC29D] bg-[#FFFDF8] p-5 shadow-[0_26px_80px_rgba(88,54,28,0.24)]">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700">
                <Trash2 size={21} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-[#B26B38]">Delete Document</p>
                <h2 className="mt-1 text-xl font-black text-[#2F2418]">문서 삭제</h2>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#F0C7A6] bg-white/75 p-4 text-sm font-bold leading-6 text-[#6F5137]">
              <p>
                <span className="font-black text-[#2F2418] [overflow-wrap:anywhere]">{document.filename}</span>
                {" "}문서를 삭제할까요?
              </p>
              <p className="mt-2">관련 요약, 키워드, 질문 기록도 함께 삭제됩니다.</p>
            </div>

            {statusMessage && (
              <p className="mt-4 rounded-2xl border border-[#F0C7A6] bg-[#FFF3E5] p-3 text-sm font-bold leading-6 text-[#8A3F22]">
                {statusMessage}
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white text-sm font-black text-neutral-700 transition hover:border-coral/40 hover:text-coral disabled:cursor-not-allowed disabled:opacity-50"
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
                className="inline-flex h-11 items-center justify-center rounded-full border border-red-200 bg-red-100 px-4 text-sm font-black text-red-700 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
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
    <div className="flex min-w-0 items-start justify-between gap-4 rounded-2xl border border-[#EAD8C1] bg-[#FFFDF8] px-4 py-3">
      <span className="shrink-0 text-[#8A7354]">{label}</span>
      <span className="min-w-0 break-words text-right text-[#2F2418]">{value}</span>
    </div>
  );
}
