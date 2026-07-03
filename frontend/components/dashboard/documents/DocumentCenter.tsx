"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRightLeft, BarChart3, FileText, FileUp, Hash, History, MessageSquareText } from "lucide-react";
import { PdfAnalysis } from "../../PdfAnalysis";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";
import type { WorkspaceTab } from "../types";
import { DocumentCard } from "./DocumentCard";
import { DocumentFilterBar } from "./DocumentFilterBar";
import { DocumentUploadCard } from "./DocumentUploadCard";
import { SelectedDocumentPanel } from "./SelectedDocumentPanel";
import { SupportedFileTypes } from "./SupportedFileTypes";
import { formatDocumentInfo, type DocumentFilter, type DocumentItem, type DocumentSort, type DocumentStatus, type DocumentViewModel } from "./types";
import {
  estimateDocumentCredits,
  formatCreditEstimateLabel,
  formatCreditLabel,
  formatPageLabel,
  type SheetPageCount,
} from "../../ai-workspace/creditUtils";

type DocumentCenterProps = {
  onNavigate: (tab: WorkspaceTab) => void;
  selectedDocumentId: string;
  onDocumentSelect: (documentId: string) => void;
  isAdmin?: boolean;
  mobile?: boolean;
};

type UploadCreditPreview = {
  file: File;
  pageCount: number | null;
  credits: number | null;
  currentCredits: number | null;
  basisLabel: string;
  sheetCount?: number | null;
  sheetPageCounts?: SheetPageCount[];
  note?: string;
};

type UploadCreditUsage = {
  credit_cost?: number;
  credits_after?: number;
  page_count?: number | null;
  basis_count?: number | null;
  sheet_count?: number | null;
  sheet_page_counts?: SheetPageCount[];
};

type UploadResponse = {
  file_id?: string;
  filename?: string;
  chunk_count?: number;
  text_length?: number;
  page_count?: number | null;
  file_type?: string;
  status?: string;
  created_at?: string;
  document?: {
    file_id?: string;
    filename?: string;
    chunk_count?: number;
    text_length?: number;
    page_count?: number | null;
    file_type?: string;
    status?: string;
    created_at?: string;
  };
  credit_usage?: UploadCreditUsage;
};

function isTxtFile(file: File) {
  return file.name.toLowerCase().endsWith(".txt") || file.type === "text/plain";
}

function isFixedCreditUpload(file: File) {
  const filename = file.name.toLowerCase();
  return (
    isTxtFile(file) ||
    filename.endsWith(".xlsx") ||
    filename.endsWith(".csv") ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "text/csv" ||
    file.type === "application/csv"
  );
}

function getUploadFileTypeLabel(file: File) {
  const filename = file.name.toLowerCase();
  if (filename.endsWith(".xlsx") || file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    return "XLSX";
  }
  if (filename.endsWith(".csv") || file.type === "text/csv" || file.type === "application/csv") {
    return "CSV";
  }
  if (isTxtFile(file)) {
    return "TXT";
  }
  return "PDF";
}

function calculateDocumentCredits(pageCount: number) {
  if (pageCount <= 0) {
    return 0;
  }
  if (pageCount <= 2) {
    return 1;
  }
  return pageCount * 0.5;
}

function formatCreditAmount(credits: number | null) {
  if (credits === null) {
    return "서버 계산 후 확정";
  }
  return Number.isInteger(credits) ? String(credits) : credits.toFixed(1);
}

function getFriendlyUploadError(message: string) {
  if (message.includes("No readable text found in PDF")) {
    return "PDF에서 읽을 수 있는 텍스트를 찾지 못했습니다. 스캔 이미지 PDF라면 OCR 기능이 필요할 수 있습니다.";
  }
  if (message.includes("No readable text found")) {
    return "문서에서 읽을 수 있는 텍스트를 찾지 못했습니다. 다른 파일로 다시 시도해주세요.";
  }
  if (message.includes("No text chunks were created")) {
    return "문서 분석에 필요한 텍스트 조각을 만들지 못했습니다. 다른 파일로 다시 시도해주세요.";
  }
  if (message.includes("데이터가 없습니다")) {
    return "데이터가 없습니다. 내용이 있는 XLSX 또는 CSV 파일을 업로드해주세요.";
  }
  if (message.includes("Unsupported") || message.includes("not supported")) {
    return "지원하지 않는 파일 형식입니다. PDF, TXT, XLSX, CSV 파일을 업로드해주세요.";
  }
  if (message.includes("credit") || message.includes("크레딧")) {
    return message;
  }
  return "업로드에 실패했습니다. 다시 시도해주세요.";
}

function getFriendlyDeleteError(message: string) {
  if (message.includes("not found") || message.includes("404")) {
    return "삭제할 문서를 찾지 못했습니다. 목록을 새로고침한 뒤 다시 시도해주세요.";
  }
  return "문서 삭제에 실패했습니다. 다시 시도해주세요.";
}

async function estimatePdfPageCount(file: File) {
  try {
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder("latin1").decode(buffer);
    const matches = text.match(/\/Type\s*\/Page\b/g);
    return matches?.length ? matches.length : null;
  } catch {
    return null;
  }
}

function inferExtension(file: DocumentItem) {
  const explicit = file.file_type?.trim();
  if (explicit) {
    return explicit.replace(/^\./, "").toUpperCase();
  }

  const filename = file.filename || "";
  const extension = filename.includes(".") ? filename.split(".").pop() : "";
  return (extension || "FILE").toUpperCase();
}

function normalizeStatus(status: string | undefined): { status: DocumentStatus; label: string } {
  const normalized = (status || "").toLowerCase();
  if (["ready", "success", "complete", "completed", "analyzed"].includes(normalized)) {
    return { status: "complete", label: "완료" };
  }
  if (["pending", "processing", "uploading", "running"].includes(normalized)) {
    return { status: "processing", label: "진행 중" };
  }
  if (["failed", "error"].includes(normalized)) {
    return { status: "failed", label: "실패" };
  }
  return { status: "unknown", label: "확인 필요" };
}

function formatDate(value: string) {
  if (!value) {
    return "날짜 정보 없음";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toViewModel(file: DocumentItem): DocumentViewModel {
  const timestamp = file.created_at || file.uploaded_at || "";
  const status = normalizeStatus(file.status);
  const fileSizeBytes = file.size_bytes ?? file.file_size ?? null;

  return {
    id: file.file_id,
    filename: file.filename || "이름 없는 문서",
    extension: inferExtension(file),
    createdAt: timestamp,
    createdLabel: formatDate(timestamp),
    rawStatus: file.status || "",
    status: status.status,
    statusLabel: status.label,
    chunkCount: typeof file.chunk_count === "number" ? file.chunk_count : null,
    textLength: typeof file.text_length === "number" ? file.text_length : null,
    pageCount: typeof file.page_count === "number" ? file.page_count : null,
    fileSizeBytes: typeof fileSizeBytes === "number" ? fileSizeBytes : null,
  };
}

function filterDocuments(documents: DocumentViewModel[], filter: DocumentFilter) {
  if (filter === "all") {
    return documents;
  }
  if (filter === "recent") {
    return documents.slice(0, 5);
  }
  return documents.filter((document) => document.status === filter);
}

function sortDocuments(documents: DocumentViewModel[], sort: DocumentSort) {
  const sorted = [...documents];
  if (sort === "name") {
    return sorted.sort((a, b) => a.filename.localeCompare(b.filename));
  }
  return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function SheetPageCountsPanel({
  sheetCount,
  pageCount,
  sheetPageCounts,
  isOpen,
  onToggle,
}: {
  sheetCount?: number | null;
  pageCount?: number | null;
  sheetPageCounts?: SheetPageCount[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  if (!sheetCount && !sheetPageCounts?.length) {
    return null;
  }

  return (
    <div className="ai-panel-compact bg-panel px-4 py-3 text-sm font-bold text-body">
      <div className="grid gap-2 sm:grid-cols-2">
        {typeof sheetCount === "number" && (
          <div>
            <span className="block text-xs font-black uppercase tracking-wide text-muted">총 시트</span>
            <strong className="mt-1 block text-title">{sheetCount.toLocaleString("ko-KR")}개</strong>
          </div>
        )}
        {typeof pageCount === "number" && (
          <div>
            <span className="block text-xs font-black uppercase tracking-wide text-muted">총 예상 페이지</span>
            <strong className="mt-1 block text-title">{formatPageLabel(pageCount)}</strong>
          </div>
        )}
      </div>
      {Boolean(sheetPageCounts?.length) && (
        <div className="mt-3">
          <button type="button" onClick={onToggle} className="text-xs font-black text-primary">
            시트별 예상 페이지 {isOpen ? "접기" : "보기"}
          </button>
          {isOpen && (
            <div className="mt-2 grid gap-1.5">
              {sheetPageCounts!.map((sheet) => (
                <div key={sheet.sheet_name} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2">
                  <span className="min-w-0 truncate font-black text-title">{sheet.sheet_name}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {sheet.row_count.toLocaleString("ko-KR")}행 · {formatPageLabel(sheet.page_count)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DocumentCenter({ onNavigate, selectedDocumentId, onDocumentSelect, isAdmin = true, mobile = false }: DocumentCenterProps) {
  const [documents, setDocuments] = useState<DocumentViewModel[]>([]);
  const [filter, setFilter] = useState<DocumentFilter>("recent");
  const [sort, setSort] = useState<DocumentSort>("latest");
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadCreditUsage, setUploadCreditUsage] = useState<UploadCreditUsage | null>(null);
  const [creditPreview, setCreditPreview] = useState<UploadCreditPreview | null>(null);
  const [isPreviewSheetsOpen, setIsPreviewSheetsOpen] = useState(false);
  const [isResultSheetsOpen, setIsResultSheetsOpen] = useState(false);
  const [isPreparingCreditPreview, setIsPreparingCreditPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isStartConfirmOpen, setIsStartConfirmOpen] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState("");
  const [deletingDocumentId, setDeletingDocumentId] = useState("");

  const isUploadDisabled = !isAdmin || isUploading || isPreparingCreditPreview;

  async function loadCurrentCredits() {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/credits/me`);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return Number(data.credits ?? data.user?.credits ?? 0);
    } catch {
      return null;
    }
  }

  async function prepareUpload(file: File | null = selectedUploadFile) {
    if (!isAdmin) {
    setUploadStatus("업로드 중입니다...");
      return;
    }
    if (!file) {
      return;
    }

    setSelectedUploadFile(file);
    setIsPreparingCreditPreview(true);
    setUploadStatus("업로드 중입니다...");
    setUploadCreditUsage(null);
    setDeleteStatus("");
    setIsPreviewSheetsOpen(false);
    setIsResultSheetsOpen(false);

    try {
      const [creditEstimate, currentCredits] = await Promise.all([estimateDocumentCredits(file), loadCurrentCredits()]);
      setCreditPreview({
        file,
        pageCount: creditEstimate.pageCount,
        credits: creditEstimate.creditCost,
        currentCredits,
        basisLabel: creditEstimate.basisLabel,
        sheetCount: creditEstimate.sheetCount,
        sheetPageCounts: creditEstimate.sheetPageCounts,
        note: creditEstimate.note,
      });
    } finally {
      setIsPreparingCreditPreview(false);
    }
  }

  async function performUpload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    setIsUploading(true);
    setUploadStatus("업로드 중입니다...");
    setDeleteStatus("");

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(String(error.detail ?? ""));
      }

      const result = (await response.json()) as UploadResponse;
      const uploadedFileId = result.file_id || result.document?.file_id || "";
      const uploadedFilename = result.filename || result.document?.filename || file.name;
      const uploadedPageCount = result.page_count ?? result.document?.page_count ?? result.credit_usage?.page_count ?? null;

      setSelectedUploadFile(null);
      setUploadCreditUsage(result.credit_usage ?? null);
      setIsResultSheetsOpen(false);
      setUploadStatus(`${uploadedFilename} 업로드 완료`);
      if (uploadedFileId) {
        const optimisticDocument = toViewModel({
          file_id: uploadedFileId,
          filename: uploadedFilename,
          file_type: result.file_type ?? result.document?.file_type,
          status: result.status ?? result.document?.status ?? "ready",
          created_at: result.created_at ?? result.document?.created_at ?? new Date().toISOString(),
          text_length: result.text_length ?? result.document?.text_length,
          chunk_count: result.chunk_count ?? result.document?.chunk_count,
          page_count: uploadedPageCount,
        });
        setDocuments((current) => [
          optimisticDocument,
          ...current.filter((document) => document.id !== uploadedFileId),
        ]);
        onDocumentSelect(uploadedFileId);
      }
      setReloadVersion((current) => current + 1);
      window.dispatchEvent(new Event("credits:refresh"));
    } catch (error) {
      setUploadCreditUsage(null);
      setUploadStatus(getFriendlyUploadError(error instanceof Error ? error.message : ""));
    } finally {
      setIsUploading(false);
    }
  }

  function handleUploadFileSelect(file: File | null) {
    setSelectedUploadFile(file);
    setUploadStatus("업로드 중입니다...");
    setUploadCreditUsage(null);
    setDeleteStatus("");
    setIsPreviewSheetsOpen(false);
    setIsResultSheetsOpen(false);
  }

  function handleUploadFileDrop(file: File) {
    setSelectedUploadFile(file);
    void prepareUpload(file);
  }

  function handleCancelCreditPreview() {
    setIsStartConfirmOpen(false);
    setCreditPreview(null);
    setIsPreviewSheetsOpen(false);
  }

  function handleConfirmCreditPreview() {
    setIsStartConfirmOpen(true);
  }

  function handleCancelStartConfirm() {
    setIsStartConfirmOpen(false);
  }

  async function handleStartAnalysisConfirmed() {
    const file = creditPreview?.file;
    setIsStartConfirmOpen(false);
    setCreditPreview(null);
    if (!file) {
      return;
    }
    await performUpload(file);
  }

  async function handleDeleteDocument(document: DocumentViewModel): Promise<boolean> {
    if (!isAdmin) {
      setDeleteStatus("관리자 전용 기능입니다.");
      return false;
    }


    setDeletingDocumentId(document.id);
    setDeleteStatus("문서를 삭제하는 중입니다...");
    setUploadStatus("업로드 중입니다...");

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/files/${document.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(String(error.detail ?? response.status));
      }

      onDocumentSelect("");
      setDeleteStatus("문서를 삭제했습니다.");
      setReloadVersion((current) => current + 1);
      return true;
    } catch (error) {
      setDeleteStatus(getFriendlyDeleteError(error instanceof Error ? error.message : ""));
      return false;
    } finally {
      setDeletingDocumentId("");
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadDocuments() {
      setIsLoading(true);
      setStatusMessage("");

      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/files`);
        if (!response.ok) {
          throw new Error("문서 목록을 불러오지 못했습니다.");
        }

        const data = (await response.json()) as { files?: DocumentItem[] };
        const nextDocuments = sortDocuments((data.files || []).map(toViewModel), "latest");

        if (isMounted) {
          setDocuments(nextDocuments);
          if (selectedDocumentId && !nextDocuments.some((document) => document.id === selectedDocumentId)) {
            onDocumentSelect("");
          }
          setStatusMessage(nextDocuments.length === 0 ? "아직 업로드된 문서가 없습니다." : "");
        }
      } catch (error) {
        if (isMounted) {
          setDocuments([]);
          onDocumentSelect("");
          setStatusMessage(error instanceof Error ? error.message : "문서 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDocuments();

    return () => {
      isMounted = false;
    };
  }, [onDocumentSelect, reloadVersion, selectedDocumentId]);

  const visibleDocuments = useMemo(() => (
    filterDocuments(sortDocuments(documents, sort), filter)
  ), [documents, filter, sort]);

  const selectedDocument = useMemo(() => (
    documents.find((document) => document.id === selectedDocumentId) || null
  ), [documents, selectedDocumentId]);

  if (mobile) {
    const mobileActions: Array<{ label: string; tab: WorkspaceTab; icon: typeof FileText }> = [
      { label: "요약", tab: "analysis", icon: BarChart3 },
      { label: "키워드", tab: "analysis", icon: Hash },
      { label: "AI Chat", tab: "chat", icon: MessageSquareText },
      { label: "변환", tab: "convert", icon: ArrowRightLeft },
      { label: "기록", tab: "history", icon: History },
    ];

    if (selectedDocument) {
      return (
        <section className="grid gap-3">
          <button
            type="button"
            onClick={() => onDocumentSelect("")}
            className="inline-flex h-9 w-fit items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-black text-body"
          >
            <ArrowLeft size={15} />
            뒤로
          </button>

          <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="shrink-0 rounded-full border border-gold/45 bg-gold/12 px-2.5 py-1 text-[0.68rem] font-black text-gold">
                {selectedDocument.extension}
              </span>
              <span className="shrink-0 rounded-full border border-border bg-panel px-2.5 py-1 text-[0.68rem] font-black text-body">
                {selectedDocument.statusLabel}
              </span>
            </div>
            <h2 className="mt-3 line-clamp-2 break-words text-lg font-black leading-6 text-title">
              {selectedDocument.filename}
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-body">
              <span className="rounded-xl bg-panel px-3 py-2">{selectedDocument.createdLabel}</span>
              <span className="rounded-xl bg-panel px-3 py-2">{formatDocumentInfo(selectedDocument)}</span>
            </div>
          </article>

          <section className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-muted">작업</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {mobileActions.map((action) => {
                const Icon = action.icon;

                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => onNavigate(action.tab)}
                    className="flex min-h-14 items-center gap-2 rounded-2xl border border-border bg-panel px-3 text-left text-sm font-black text-title transition active:scale-[0.98]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0 truncate">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </section>
      );
    }

    return (
      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-muted">문서 목록</p>
            <h2 className="truncate text-lg font-black text-title">{documents.length.toLocaleString("ko-KR")}개 문서</h2>
          </div>
          <div className="flex shrink-0 rounded-full border border-border bg-card p-1 text-[0.68rem] font-black">
            {(["recent", "all"] as const).map((nextFilter) => (
              <button
                key={nextFilter}
                type="button"
                onClick={() => setFilter(nextFilter)}
                className={[
                  "rounded-full px-3 py-1.5 transition",
                  filter === nextFilter ? "bg-primary text-white" : "text-body",
                ].join(" ")}
              >
                {nextFilter === "recent" ? "최근 문서" : "전체 문서"}
              </button>
            ))}
          </div>
        </div>

        {uploadStatus && (
          <p className="rounded-2xl border border-border bg-panel p-3 text-xs font-bold leading-5 text-body">
            {uploadStatus}
          </p>
        )}

        <div className="grid gap-2">
          {isLoading ? (
            <p className="rounded-2xl border border-border bg-card p-4 text-sm font-bold text-body">
              문서 목록을 불러오는 중입니다.
            </p>
          ) : visibleDocuments.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-4 text-sm font-bold text-body">
              {statusMessage || "아직 업로드된 문서가 없습니다."}
            </p>
          ) : (
            visibleDocuments.map((document) => (
              <button
                key={document.id}
                type="button"
                onClick={() => {
                  setDeleteStatus("");
                  onDocumentSelect(document.id);
                }}
                className="grid min-h-[5.25rem] gap-2 rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition active:scale-[0.99]"
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 rounded-full border border-gold/45 bg-gold/12 px-2.5 py-1 text-[0.66rem] font-black text-gold">
                      {document.extension}
                    </span>
                    <h3 className="line-clamp-1 min-w-0 text-sm font-black text-title">{document.filename}</h3>
                  </div>
                  <span className="shrink-0 rounded-full border border-border bg-panel px-2 py-1 text-[0.62rem] font-black text-body">
                    {document.statusLabel}
                  </span>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3 text-[0.68rem] font-bold text-muted">
                  <span className="min-w-0 truncate">{document.createdLabel}</span>
                  <span className="shrink-0">{formatDocumentInfo(document)}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 gap-5">
          <DocumentUploadCard
            selectedFile={selectedUploadFile}
            disabled={isUploadDisabled}
            isPreparing={isPreparingCreditPreview}
            isUploading={isUploading}
            onFileSelect={handleUploadFileSelect}
            onFileDrop={handleUploadFileDrop}
            onUploadClick={() => void prepareUpload()}
          />

          {uploadStatus && (
            uploadCreditUsage ? (
              <div className="rounded-2xl border border-primary/30 bg-card p-4 shadow-soft">
                <p className="text-sm font-black text-title">{uploadStatus}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="ai-panel-compact bg-panel px-4 py-3">
                    <span className="block text-xs font-black uppercase tracking-wide text-muted">차감 크레딧</span>
                    <strong className="mt-1 block text-2xl font-black text-primary">
                      {formatCreditLabel(Number(uploadCreditUsage.credit_cost ?? 0))}
                    </strong>
                  </div>
                  <div className="ai-panel-compact bg-gold/10 px-4 py-3">
                    <span className="block text-xs font-black uppercase tracking-wide text-muted">현재 보유 크레딧</span>
                    <strong className="mt-1 block text-2xl font-black text-gold">
                      {Number(uploadCreditUsage.credits_after ?? 0).toLocaleString("en-US")} Credits
                    </strong>
                  </div>
                </div>
                <div className="mt-3">
                  <SheetPageCountsPanel
                    sheetCount={uploadCreditUsage.sheet_count}
                    pageCount={uploadCreditUsage.basis_count ?? uploadCreditUsage.page_count}
                    sheetPageCounts={uploadCreditUsage.sheet_page_counts}
                    isOpen={isResultSheetsOpen}
                    onToggle={() => setIsResultSheetsOpen((current) => !current)}
                  />
                </div>
              </div>
            ) : (
              <p className="ai-alert bg-panel p-4">
                {uploadStatus}
              </p>
            )
          )}

          <DocumentFilterBar
            filter={filter}
            sort={sort}
            totalCount={documents.length}
            onFilterChange={setFilter}
            onSortChange={setSort}
          />

          <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {isLoading ? (
              <p className="ai-alert bg-panel p-5 sm:col-span-2 xl:col-span-3">
                문서 목록을 불러오는 중입니다.
              </p>
            ) : visibleDocuments.length === 0 ? (
              <p className="ai-alert bg-panel p-5 sm:col-span-2 xl:col-span-3">
              {statusMessage || "아직 업로드된 문서가 없습니다."}
              </p>
            ) : (
              visibleDocuments.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  isSelected={selectedDocumentId === document.id}
                  onSelect={(nextDocument) => {
                    setDeleteStatus("");
                    onDocumentSelect(nextDocument.id);
                  }}
                />
              ))
            )}
          </div>

          <SupportedFileTypes />
        </div>

        <SelectedDocumentPanel
          document={selectedDocument}
          onNavigate={onNavigate}
          onDelete={handleDeleteDocument}
          isDeleting={Boolean(deletingDocumentId)}
          statusMessage={deleteStatus}
        />
      </div>

      <section className="ai-card p-4 md:p-5">
        <div className="mb-5">
          <p className="ai-modal-eyebrow text-muted">Legacy Analysis Tool</p>
          <h2 className="mt-2 text-2xl font-black text-title">문서 업로드 및 분석</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-body">
            기존 분석 도구는 그대로 유지됩니다. 위 드롭존에서 문서를 업로드하고, 아래 영역에서 분석 상태를 확인할 수 있습니다.
          </p>
        </div>
        <PdfAnalysis />
      </section>

      {creditPreview && (
        <div className="ai-modal-backdrop z-50">
          <section className="ai-modal max-w-lg p-6">
            <div className="flex items-start gap-3">
              <div className="ai-modal-icon h-12 w-12">
                <FileUp size={22} />
              </div>
              <div>
                <p className="ai-modal-eyebrow text-primary">Credit Preview</p>
                <h2 className="mt-1 text-2xl font-black text-title">문서 분석 크레딧 안내</h2>
                <p className="ai-modal-description">
                  요약, 키워드, 문서 질문은 문서 분석 비용에 포함됩니다.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 text-sm font-bold text-body">
                <div className="ai-panel-compact bg-panel px-4 py-3">
                <span className="block text-xs font-black uppercase tracking-wide text-muted">업로드할 문서</span>
                <span className="mt-1 block [overflow-wrap:anywhere]">{creditPreview.file.name}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="ai-panel-compact bg-panel px-4 py-3">
                  <span className="block text-xs font-black uppercase tracking-wide text-muted">{creditPreview.basisLabel}</span>
                  <span className="mt-1 block text-lg font-black text-title">
                    {formatPageLabel(creditPreview.pageCount)}
                  </span>
                </div>
                <div className="ai-panel-compact bg-gold/10 px-4 py-3 text-gold">
                  <span className="block text-xs font-black uppercase tracking-wide">예상 차감 크레딧</span>
                  <span className="mt-1 block text-lg font-black">
                    {formatCreditEstimateLabel(creditPreview.credits)}
                  </span>
                </div>
              </div>
              <div className="ai-panel-compact bg-panel px-4 py-3">
                <span className="block text-xs font-black uppercase tracking-wide text-muted">현재 보유 크레딧</span>
                <span className="mt-1 block text-lg font-black text-title">
                  {creditPreview.currentCredits === null
                    ? "확인할 수 없음"
                    : `${creditPreview.currentCredits.toLocaleString("en-US")} Credits`}
                </span>
              </div>
            </div>

            <div className="ai-panel-compact mt-5 bg-panel">
              <p className="text-xs font-black uppercase tracking-wide text-muted">포함 기능</p>
              <ul className="mt-3 grid gap-2 text-sm font-bold text-body sm:grid-cols-3">
                <li className="rounded-xl bg-card px-3 py-2 text-center">요약</li>
                <li className="rounded-xl bg-card px-3 py-2 text-center">키워드</li>
                <li className="rounded-xl bg-card px-3 py-2 text-center">문서 질문</li>
              </ul>
              {typeof creditPreview.sheetCount === "number" && (
                <p className="mt-3 text-xs font-bold leading-5 text-muted">
                  총 시트 {creditPreview.sheetCount.toLocaleString("ko-KR")}개 기준으로 예상 페이지를 계산합니다.
                </p>
              )}
              {creditPreview.note && <p className="mt-3 text-xs font-bold leading-5 text-muted">{creditPreview.note}</p>}
            </div>
            <SheetPageCountsPanel
              sheetCount={creditPreview.sheetCount}
              pageCount={creditPreview.pageCount}
              sheetPageCounts={creditPreview.sheetPageCounts}
              isOpen={isPreviewSheetsOpen}
              onToggle={() => setIsPreviewSheetsOpen((current) => !current)}
            />

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCancelCreditPreview}
                disabled={isUploading}
                className="ai-btn ai-btn-secondary h-11"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmCreditPreview}
                disabled={isUploading}
                className="ai-btn ai-btn-primary h-11"
              >
                {isUploading ? "업로드 중" : "분석 시작"}
              </button>
            </div>
          </section>
        </div>
      )}

      {creditPreview && isStartConfirmOpen && (
        <div className="ai-modal-backdrop z-[60]">
          <section className="ai-modal max-w-md p-5">
            <div className="flex items-start gap-3">
              <div className="ai-modal-icon h-10 w-10">
                <FileUp size={20} />
              </div>
              <div>
                <p className="ai-modal-eyebrow">Final Check</p>
                <h2 className="mt-1 text-xl font-black text-title">업로드 전 확인</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-body">문서 분석을 시작합니다.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-2.5 text-sm font-bold text-body">
              <div className="ai-panel-compact flex items-start justify-between gap-4 bg-panel px-4 py-3">
                <span className="shrink-0 text-muted">업로드할 문서</span>
                <span className="text-right text-title [overflow-wrap:anywhere]">{creditPreview.file.name}</span>
              </div>
              <div className="ai-panel-compact flex items-center justify-between gap-4 bg-panel px-4 py-3">
                <span className="text-muted">{creditPreview.basisLabel}</span>
                <span className="text-title">
                  {formatPageLabel(creditPreview.pageCount)}
                </span>
              </div>
              <div className="ai-panel-compact flex items-center justify-between gap-4 bg-gold/10 px-4 py-3 text-gold">
                <span>예상 차감</span>
                <span className="text-lg font-black">{formatCreditEstimateLabel(creditPreview.credits)}</span>
              </div>
              <div className="ai-panel-compact flex items-center justify-between gap-4 bg-panel px-4 py-3">
                <span className="text-muted">현재 보유 크레딧</span>
                <span className="text-title">
                  {creditPreview.currentCredits === null
                    ? "확인할 수 없음"
                    : `${creditPreview.currentCredits.toLocaleString("en-US")} Credits`}
                </span>
              </div>
            </div>
            <div className="mt-3">
              <SheetPageCountsPanel
                sheetCount={creditPreview.sheetCount}
                pageCount={creditPreview.pageCount}
                sheetPageCounts={creditPreview.sheetPageCounts}
                isOpen={isPreviewSheetsOpen}
                onToggle={() => setIsPreviewSheetsOpen((current) => !current)}
              />
            </div>

            <div className="my-5 h-px bg-border" />

            <div className="ai-alert p-4">
              <p>문서 분석은 업로드 완료 후 자동으로 시작됩니다.</p>
              <p className="mt-1 font-black text-primary">업로드와 분석이 성공한 경우에만 크레딧이 차감됩니다.</p>
              <p className="mt-3">업로드 또는 분석 과정에서 오류가 발생하면 크레딧은 차감되지 않습니다.</p>
            </div>

            <p className="mt-4 text-center text-sm font-black text-title">계속 진행하시겠습니까?</p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCancelStartConfirm}
                disabled={isUploading}
                className="ai-btn ai-btn-secondary h-11"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleStartAnalysisConfirmed()}
                disabled={isUploading}
                className="ai-btn ai-btn-payment h-11 px-4"
              >
                확인하고 분석 시작
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

