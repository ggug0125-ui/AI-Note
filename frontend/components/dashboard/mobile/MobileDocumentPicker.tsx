"use client";

import { CheckCircle2, UploadCloud } from "lucide-react";
import type { ReactNode } from "react";
import { formatDocumentInfo, type DocumentViewModel } from "../documents/types";

type MobileDocumentPickerProps = {
  documents: DocumentViewModel[];
  selectedDocument: DocumentViewModel | null;
  onSelectDocument: (documentId: string) => void;
  onClearSelection?: () => void;
  title: string;
  description?: string;
  showUpload?: boolean;
  onUpload?: () => void;
  uploadStatus?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  compact?: boolean;
  emptyMessage?: string;
};

export function MobileDocumentPicker({
  documents,
  selectedDocument,
  onSelectDocument,
  onClearSelection,
  title,
  description,
  showUpload = false,
  onUpload,
  uploadStatus = "",
  isUploading = false,
  uploadProgress = 0,
  compact = false,
  emptyMessage = "아직 문서가 없습니다. 문서를 업로드하고 AI 작업을 시작해보세요.",
}: MobileDocumentPickerProps) {
  const visibleDocuments = selectedDocument
    ? documents.filter((document) => document.id !== selectedDocument.id)
    : documents;

  return (
    <section className="grid gap-2">
      <div className="px-1">
        <h2 className="text-sm font-black text-title">{title}</h2>
        {description && <p className="mt-0.5 text-xs font-bold leading-5 text-muted">{description}</p>}
      </div>

      {selectedDocument && (
        <article className="rounded-2xl border border-primary/55 bg-primary/10 p-2.5 shadow-soft transition">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.68rem] font-black text-primary">선택된 문서</p>
            {onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="rounded-full border border-primary/30 bg-card px-2 py-1 text-[0.65rem] font-black text-primary transition hover:border-primary active:scale-95"
              >
                선택 해제
              </button>
            )}
          </div>
          <div className="mt-1 flex min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <PickerBadge>{selectedDocument.extension}</PickerBadge>
              <h3 className="line-clamp-1 min-w-0 text-sm font-black text-title">{selectedDocument.filename}</h3>
            </div>
            <PickerBadge muted>{selectedDocument.statusLabel}</PickerBadge>
          </div>
          <p className="mt-1 truncate text-[0.68rem] font-bold text-muted">
            {selectedDocument.createdLabel} · {formatDocumentInfo(selectedDocument)}
          </p>
        </article>
      )}

      {showUpload && (
        <button
          type="button"
          onClick={onUpload}
          disabled={isUploading}
          className="grid gap-2 rounded-2xl border border-border bg-card p-2.5 text-left shadow-sm transition hover:border-primary/50 active:scale-[0.98] active:shadow-soft disabled:opacity-60"
        >
          <span className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-sm font-black text-title">문서 업로드</span>
              <span className="mt-0.5 block text-[0.68rem] font-bold text-muted">PDF · TXT · DOCX 예정 · XLSX 예정</span>
            </span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
              {uploadProgress >= 100 ? <CheckCircle2 size={17} /> : <UploadCloud size={17} />}
            </span>
          </span>
          {(uploadStatus || isUploading) && (
            <span className="block h-1.5 overflow-hidden rounded-full bg-panel">
              <span
                className="block h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </span>
          )}
          {uploadStatus && <span className="text-[0.68rem] font-bold text-body">{uploadStatus}</span>}
        </button>
      )}

      <div className="grid gap-2">
        {documents.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-4 text-sm font-bold leading-6 text-body">
            {emptyMessage}
          </p>
        ) : (
          visibleDocuments.map((document) => (
            <button
              key={document.id}
              type="button"
              onClick={() => onSelectDocument(document.id)}
              className={[
                "grid text-left shadow-sm transition hover:border-primary/50 active:scale-[0.98] active:shadow-soft",
                compact ? "min-h-[3.65rem] gap-1 rounded-2xl p-2.5" : "min-h-[4.1rem] gap-1.5 rounded-2xl p-3",
                selectedDocument?.id === document.id
                  ? "border border-primary bg-primary/10 shadow-soft"
                  : "border border-border bg-card",
              ].join(" ")}
            >
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <PickerBadge>{document.extension}</PickerBadge>
                  <span className="line-clamp-1 min-w-0 text-sm font-black text-title">{document.filename}</span>
                </span>
                <PickerBadge muted>{document.statusLabel}</PickerBadge>
              </span>
              <span className="truncate text-[0.68rem] font-bold text-muted">
                {document.createdLabel} · {formatDocumentInfo(document)}
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function PickerBadge({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <span
      className={[
        "shrink-0 rounded-full border px-2 py-1 text-[0.64rem] font-black",
        muted ? "border-border bg-panel text-body" : "border-gold/45 bg-gold/12 text-gold",
      ].join(" ")}
    >
      {children}
    </span>
  );
}
