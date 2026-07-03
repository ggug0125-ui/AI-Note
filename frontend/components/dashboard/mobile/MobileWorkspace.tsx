"use client";

import { Children, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useSwipeable } from "react-swipeable";
import {
  ArrowRightLeft,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Download,
  Filter,
  FileSearch,
  FileText,
  Hash,
  MessageSquareText,
  RefreshCw,
  Send,
  SlidersHorizontal,
  Sparkles,
  Search,
  UploadCloud,
} from "lucide-react";
import type { WorkspaceTab } from "../types";
import { formatDocumentInfo, type DocumentViewModel } from "../documents/types";
import { MobileCompleteDialog } from "../../ai-workspace/MobileCompleteDialog";
import { MobileCreditConfirmSheet } from "../../ai-workspace/MobileCreditConfirmSheet";
import {
  calculateDocumentCredits,
  estimateDocumentCredits,
  formatCreditLabel,
  type DocumentCreditBasisType,
  type SheetPageCount,
} from "../../ai-workspace/creditUtils";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";

type MobileWorkspaceProps = {
  activePanel: WorkspaceTab;
  selectedDocumentId: string;
  credits?: number;
  onNavigate: (tab: WorkspaceTab) => void;
  onDocumentSelect: (documentId: string) => void;
  onCreditsRefresh?: () => Promise<void> | void;
};

type FileItem = {
  file_id: string;
  filename?: string;
  created_at?: string;
  uploaded_at?: string;
  status?: string;
  chunk_count?: number;
  text_length?: number;
  page_count?: number | null;
  file_size?: number | null;
  size_bytes?: number | null;
  file_type?: string;
};

type ResultItem = {
  filename?: string;
  file_id?: string;
  created_at?: string;
  summary_type?: string;
  summary?: string;
  scope?: string;
  keywords?: string[];
  question?: string;
  answer?: string;
  type?: "summary" | "keyword" | "chat";
};

type ResultsData = {
  summaries?: ResultItem[];
  keywords?: ResultItem[];
  chats?: ResultItem[];
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type HistoryFilter = "today" | "week" | "month";
type DocumentPickerTarget = "documents" | "analysis" | "chat" | "convert" | null;
type HistorySheetType = "summaries" | "keywords" | null;
type ConvertFileType = "pdf" | "txt" | "xlsx" | "hwpx";

type MobileConversionResult = {
  status: "success" | "unsupported";
  message?: string;
  conversion_id?: string;
  original_filename: string;
  output_filename?: string;
  display_filename?: string;
  original_type?: ConvertFileType;
  target_type?: ConvertFileType;
  target_format: ConvertFileType;
  page_count?: number;
  credit_cost?: number;
};

type MobileConversionHistoryItem = {
  conversion_id: string;
  original_filename: string;
  display_filename?: string;
  original_type: ConvertFileType;
  target_type: ConvertFileType;
  output_filename: string;
  page_count?: number;
  credit_cost?: number;
  created_at?: string;
};

type CreditConfirmState =
  | {
      kind: "upload";
      file: File;
      fileName: string;
      pageCount: number | null;
      creditCost: number | null;
      basisType: DocumentCreditBasisType;
      basisLabel: string;
      sheetCount?: number | null;
      sheetPageCounts?: SheetPageCount[];
      note?: string;
    }
  | {
      kind: "convert";
      fileName: string;
      pageCount: number;
      creditCost: number;
      conversionFormat: string;
      available: boolean;
    };

type CreditUsage = {
  credit_cost?: number;
  credits_after?: number;
  credits_before?: number;
  rule?: string;
  basis_type?: string;
  basis_count?: number;
  sheet_count?: number | null;
  sheet_page_counts?: SheetPageCount[];
};

const emptyText = "기록이 없습니다.";
const swipeTabs = ["overview", "documents", "analysis", "chat", "convert", "history"] as const;
const mobileConversionTargets: Record<ConvertFileType, ConvertFileType[]> = {
  pdf: ["txt", "xlsx", "hwpx"],
  txt: ["pdf", "xlsx", "hwpx"],
  xlsx: ["pdf", "txt", "hwpx"],
  hwpx: ["pdf", "txt", "xlsx"],
};
const mobileConversionLabels: Record<ConvertFileType, string> = {
  pdf: "PDF",
  txt: "TXT",
  xlsx: "XLSX",
  hwpx: "HWPX",
};

function getTimestamp(item: { created_at?: string; uploaded_at?: string }) {
  return item.created_at || item.uploaded_at || "";
}

function formatDate(value?: string) {
  if (!value) {
    return "날짜 없음";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

function formatMobileCreditAmount(value?: number | null) {
  if (typeof value !== "number") {
    return "-";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatMobilePageCount(value?: number | null) {
  if (typeof value !== "number") {
    return "-";
  }
  return `${value.toLocaleString("ko-KR")} Page`;
}

function inferConvertFileType(file: File | null): ConvertFileType | null {
  const extension = file?.name.split(".").pop()?.toLowerCase();
  if (extension === "pdf" || extension === "txt" || extension === "xlsx" || extension === "hwpx") {
    return extension;
  }
  return null;
}

function downloadNameFromHeaders(headers: Headers, fallback: string) {
  const disposition = headers.get("content-disposition") || "";
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || fallback;
}

function inferExtension(file: FileItem) {
  const explicit = file.file_type?.trim();
  if (explicit) {
    return explicit.replace(/^\./, "").toUpperCase();
  }
  const filename = file.filename || "";
  return (filename.includes(".") ? filename.split(".").pop() : "FILE")?.toUpperCase() || "FILE";
}

function normalizeStatus(status?: string): Pick<DocumentViewModel, "status" | "statusLabel"> {
  const normalized = (status || "").toLowerCase();
  if (["ready", "success", "complete", "completed", "analyzed"].includes(normalized)) {
    return { status: "complete", statusLabel: "완료" };
  }
  if (["pending", "processing", "uploading", "running"].includes(normalized)) {
    return { status: "processing", statusLabel: "진행 중" };
  }
  if (["failed", "error"].includes(normalized)) {
    return { status: "failed", statusLabel: "실패" };
  }
  return { status: "unknown", statusLabel: "확인 필요" };
}

function toDocument(file: FileItem): DocumentViewModel {
  const timestamp = getTimestamp(file);
  const fileSizeBytes = file.size_bytes ?? file.file_size ?? null;
  const status = normalizeStatus(file.status);

  return {
    id: file.file_id,
    filename: file.filename || "이름 없는 문서",
    extension: inferExtension(file),
    createdAt: timestamp,
    createdLabel: formatDate(timestamp),
    rawStatus: file.status || "",
    status: status.status,
    statusLabel: status.statusLabel,
    chunkCount: typeof file.chunk_count === "number" ? file.chunk_count : null,
    textLength: typeof file.text_length === "number" ? file.text_length : null,
    pageCount: typeof file.page_count === "number" ? file.page_count : null,
    fileSizeBytes: typeof fileSizeBytes === "number" ? fileSizeBytes : null,
  };
}

function sortByLatest<T extends { created_at?: string; uploaded_at?: string }>(items: T[]) {
  return [...items].sort((a, b) => getTimestamp(b).localeCompare(getTimestamp(a)));
}

function isWithinDays(value: string | undefined, days: number) {
  if (!value) {
    return false;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return date >= start;
}

function getActivityTitle(item: ResultItem, type: string) {
  if (type === "chat") {
    return item.question || "AI 대화";
  }
  if (type === "keyword") {
    return item.scope || item.keywords?.slice(0, 3).join(", ") || "키워드";
  }
  return item.summary_type || item.summary || "요약";
}

export function MobileWorkspace({
  activePanel,
  selectedDocumentId,
  credits,
  onNavigate,
  onDocumentSelect,
  onCreditsRefresh,
}: MobileWorkspaceProps) {
  const [documents, setDocuments] = useState<DocumentViewModel[]>([]);
  const [results, setResults] = useState<ResultsData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatStatus, setChatStatus] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalysisConfirmOpen, setIsAnalysisConfirmOpen] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState("");
  const [summaryResult, setSummaryResult] = useState("");
  const [keywordResult, setKeywordResult] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [convertStatus, setConvertStatus] = useState("");
  const [convertFile, setConvertFile] = useState<File | null>(null);
  const [convertTarget, setConvertTarget] = useState<ConvertFileType>("txt");
  const [convertResult, setConvertResult] = useState<MobileConversionResult | null>(null);
  const [conversionHistory, setConversionHistory] = useState<MobileConversionHistoryItem[]>([]);
  const [isConvertingFile, setIsConvertingFile] = useState(false);
  const [downloadingConversionId, setDownloadingConversionId] = useState("");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("today");
  const [mobileSelectedDocumentId, setMobileSelectedDocumentId] = useState("");
  const [creditConfirm, setCreditConfirm] = useState<CreditConfirmState | null>(null);
  const [mobileToast, setMobileToast] = useState("");
  const [completeDialog, setCompleteDialog] = useState<{
    icon: "check" | "sparkle";
    title: string;
    description: ReactNode;
    confirmText: string;
    onConfirm?: () => void;
  } | null>(null);
  const [documentPickerTarget, setDocumentPickerTarget] = useState<DocumentPickerTarget>(null);
  const [historySheetType, setHistorySheetType] = useState<HistorySheetType>(null);
  const [documentSearch, setDocumentSearch] = useState("");
  const [documentSort, setDocumentSort] = useState<"latest" | "name">("latest");
  const [documentFilter, setDocumentFilter] = useState<"all" | "complete">("all");
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const convertInputRef = useRef<HTMLInputElement | null>(null);
  const previousPanelRef = useRef(activePanel);
  const convertFileType = inferConvertFileType(convertFile);
  const convertTargets = convertFileType ? mobileConversionTargets[convertFileType] : [];
  const canRunMobileConvert = Boolean(convertFileType && convertFile && !isConvertingFile);

  useEffect(() => {
    let isMounted = true;

    async function loadMobileData() {
      setIsLoading(true);
      try {
        const [filesResult, resultsResult] = await Promise.allSettled([
          authenticatedFetch(`${API_BASE_URL}/files`),
          authenticatedFetch(`${API_BASE_URL}/results`),
        ]);

        if (!isMounted) {
          return;
        }

        if (filesResult.status === "fulfilled" && filesResult.value.ok) {
          const data = (await filesResult.value.json()) as { files?: FileItem[] };
          setDocuments(sortByLatest(data.files || []).map(toDocument));
        }

        if (resultsResult.status === "fulfilled" && resultsResult.value.ok) {
          setResults((await resultsResult.value.json()) as ResultsData);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadMobileData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (previousPanelRef.current === activePanel) {
      return;
    }

    setIsAnalysisConfirmOpen(false);

    if (!isUploading) {
      setUploadStatus("");
    }
    if (activePanel !== "convert") {
      setConvertStatus("");
    }

    previousPanelRef.current = activePanel;
  }, [activePanel, isUploading]);

  useEffect(() => {
    if (selectedDocumentId && !mobileSelectedDocumentId) {
      setMobileSelectedDocumentId(selectedDocumentId);
    }
  }, [mobileSelectedDocumentId, selectedDocumentId]);

  useEffect(() => {
    if (convertFileType && !convertTargets.includes(convertTarget)) {
      setConvertTarget(convertTargets[0] || "txt");
    }
  }, [convertFileType, convertTarget, convertTargets]);

  useEffect(() => {
    if (activePanel === "convert") {
      void loadConversionHistory();
    }
  }, [activePanel]);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === mobileSelectedDocumentId) || null,
    [documents, mobileSelectedDocumentId],
  );

  const recentDocuments = documents.slice(0, 5);
  const visibleDocuments = useMemo(() => {
    const keyword = documentSearch.trim().toLowerCase();
    const filtered = documents.filter((document) => {
      const matchesKeyword = !keyword || document.filename.toLowerCase().includes(keyword);
      const matchesFilter = documentFilter === "all" || document.status === "complete";
      return matchesKeyword && matchesFilter;
    });
    return [...filtered].sort((a, b) => {
      if (documentSort === "name") {
        return a.filename.localeCompare(b.filename);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [documentFilter, documentSearch, documentSort, documents]);
  const analyses = useMemo(
    () => sortByLatest([...(results.summaries || []), ...(results.keywords || [])]).slice(0, 6),
    [results.keywords, results.summaries],
  );
  const activities = useMemo(() => {
    const summaryItems = (results.summaries || []).map((item) => ({ ...item, type: "summary" as const }));
    const keywordItems = (results.keywords || []).map((item) => ({ ...item, type: "keyword" as const }));
    const chatItems = (results.chats || []).map((item) => ({ ...item, type: "chat" as const }));
    return sortByLatest([...summaryItems, ...keywordItems, ...chatItems]).slice(0, 12);
  }, [results.chats, results.keywords, results.summaries]);
  const filteredActivities = useMemo(() => {
    const daysByFilter: Record<HistoryFilter, number> = { today: 1, week: 7, month: 31 };
    return activities.filter((activity) => isWithinDays(activity.created_at, daysByFilter[historyFilter]));
  }, [activities, historyFilter]);
  const uploadProgress = isUploading ? 46 : uploadStatus ? 100 : 0;

  function openUploadPicker() {
    uploadInputRef.current?.click();
  }

  async function prepareMobileUpload(file: File | null) {
    if (!file) {
      return;
    }

    const creditEstimate = await estimateDocumentCredits(file);
    setCreditConfirm({
      kind: "upload",
      file,
      fileName: file.name,
      pageCount: creditEstimate.pageCount,
      creditCost: creditEstimate.creditCost,
      basisType: creditEstimate.basisType,
      basisLabel: creditEstimate.basisLabel,
      sheetCount: creditEstimate.sheetCount,
      sheetPageCounts: creditEstimate.sheetPageCounts,
      note: creditEstimate.note,
    });
  }

  async function executeMobileUpload(file: File, expectedCreditCost: number | null) {
    if (typeof expectedCreditCost === "number" && (credits ?? 0) < expectedCreditCost) {
      setUploadStatus(`크레딧이 부족합니다. 필요: ${formatCreditLabel(expectedCreditCost)}, 보유: ${formatCreditLabel(credits ?? 0)}`);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setIsUploading(true);
    setUploadStatus("업로드 중...");
    setMobileToast("");
    setCreditConfirm(null);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(String(error.detail || "업로드에 실패했습니다."));
      }

      const result = (await response.json()) as {
        file_id?: string;
        filename?: string;
        file_type?: string;
        status?: string;
        created_at?: string;
        text_length?: number;
        chunk_count?: number;
        page_count?: number | null;
        document?: FileItem;
        credit_usage?: CreditUsage;
      };
      const uploadedDocument = toDocument({
        file_id: result.file_id || result.document?.file_id || crypto.randomUUID(),
        filename: result.filename || result.document?.filename || file.name,
        file_type: result.file_type || result.document?.file_type,
        status: result.status || result.document?.status || "ready",
        created_at: result.created_at || result.document?.created_at || new Date().toISOString(),
        text_length: result.text_length ?? result.document?.text_length,
        chunk_count: result.chunk_count ?? result.document?.chunk_count,
        page_count: result.page_count ?? result.document?.page_count ?? null,
      });

      setDocuments((current) => [uploadedDocument, ...current.filter((document) => document.id !== uploadedDocument.id)]);
      onDocumentSelect(uploadedDocument.id);
      setMobileSelectedDocumentId(uploadedDocument.id);
      const usedCredits = Number(result.credit_usage?.credit_cost ?? 0);
      setUploadStatus(usedCredits > 0 ? `업로드 완료 · ${formatCreditLabel(usedCredits)} 차감` : "업로드 완료");
      setMobileToast("");
      if (usedCredits > 0) {
        setCompleteDialog({
          icon: "check",
          title: "업로드 완료",
          description: (
            <>
              <p>{formatCreditLabel(usedCredits)} 차감되었습니다.</p>
              {typeof result.credit_usage?.credits_after === "number" && (
                <p className="mt-2">
                  현재 보유<br />
                  <span className="font-black text-primary">{formatCreditLabel(result.credit_usage.credits_after)}</span>
                </p>
              )}
            </>
          ),
          confirmText: "확인",
        });
      }
      await onCreditsRefresh?.();
      window.dispatchEvent(new Event("credits:refresh"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "업로드에 실패했습니다.";
      setUploadStatus(message);
      setMobileToast(`업로드 실패: ${message}`);
    } finally {
      setIsUploading(false);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    }
  }

  async function handleSummaryConfirm() {
    if (!selectedDocument) {
      setAnalysisStatus("분석할 문서를 선택해주세요.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStatus("업로드에 포함된 요약과 키워드를 준비하는 중...");
    setSummaryResult("");
    setKeywordResult([]);

    try {
      const summaryResponse = await authenticatedFetch(`${API_BASE_URL}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_id: selectedDocument.id,
          summary_type: "핵심 요약",
        }),
      });

      if (!summaryResponse.ok) {
        const error = await summaryResponse.json().catch(() => ({}));
        throw new Error(String(error.detail || "요약 생성에 실패했습니다."));
      }

      const keywordResponse = await authenticatedFetch(`${API_BASE_URL}/keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_id: selectedDocument.id,
          count: 12,
          scope: "전체 문서",
        }),
      });

      if (!keywordResponse.ok) {
        const error = await keywordResponse.json().catch(() => ({}));
        throw new Error(String(error.detail || "키워드 생성에 실패했습니다."));
      }

      const data = (await summaryResponse.json()) as { summary?: string };
      const keywordData = (await keywordResponse.json()) as { keywords?: string[]; topics?: string[]; created_at?: string };
      const createdAt = new Date().toISOString();
      setSummaryResult(data.summary || "");
      setKeywordResult(keywordData.keywords || []);
      setResults((current) => ({
        ...current,
        summaries: [
          {
            filename: selectedDocument.filename,
            file_id: selectedDocument.id,
            created_at: createdAt,
            summary_type: "핵심 요약",
            summary: data.summary || "",
          },
          ...(current.summaries || []),
        ],
        keywords: [
          {
            filename: selectedDocument.filename,
            file_id: selectedDocument.id,
            created_at: keywordData.created_at || createdAt,
            scope: "전체 문서",
            keywords: keywordData.keywords || [],
          },
          ...(current.keywords || []),
        ],
      }));
      setAnalysisStatus("AI 분석이 완료되었습니다.");
      setIsAnalysisConfirmOpen(false);
      setCompleteDialog({
        icon: "sparkle",
        title: "AI 분석 완료",
        description: (
          <>
            <p>업로드에 포함된</p>
            <p className="font-black text-title">핵심 요약과 키워드</p>
            <p>를 준비했습니다.</p>
          </>
        ),
        confirmText: "결과 보기",
      });
      await onCreditsRefresh?.();
      window.dispatchEvent(new Event("credits:refresh"));
    } catch (error) {
      setAnalysisStatus(error instanceof Error ? error.message : "요약 생성에 실패했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function prepareConvertAction(label: string, available: boolean) {
    if (!selectedDocument) {
      setConvertStatus("문서를 선택하면 변환 메뉴를 사용할 수 있습니다.");
      return;
    }

    const pageCount = selectedDocument.pageCount ?? 1;
    setCreditConfirm({
      kind: "convert",
      fileName: selectedDocument.filename,
      pageCount,
      creditCost: calculateDocumentCredits(pageCount),
      conversionFormat: label,
      available,
    });
  }

  function executeConvertAction(action: Extract<CreditConfirmState, { kind: "convert" }>) {
    setCreditConfirm(null);

    if (action.available) {
      setConvertStatus(`${action.fileName}의 문서 텍스트가 준비되었습니다. 분석과 AI 대화에서 바로 사용할 수 있습니다.`);
      return;
    }

    setConvertStatus(`${action.conversionFormat} 기능은 준비 중입니다.`);
  }

  async function loadConversionHistory() {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/convert/history?limit=20`);
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as { history?: MobileConversionHistoryItem[] };
      setConversionHistory(data.history || []);
    } catch {
      // History is helpful on mobile, but it should not block the rest of the workspace.
    }
  }

  function handleConvertFileChange(file: File | null) {
    setConvertFile(file);
    setConvertResult(null);
    setConvertStatus("");
  }

  async function executeFileConversion() {
    if (!convertFile || !convertFileType) {
      setConvertStatus("PDF, TXT, XLSX, HWPX 파일을 선택해주세요.");
      return;
    }

    const formData = new FormData();
    formData.append("file", convertFile);
    formData.append("target_format", convertTarget);

    setIsConvertingFile(true);
    setConvertResult(null);
    setConvertStatus("파일을 변환하는 중...");

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/convert`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(data.detail || "파일 변환에 실패했습니다."));
      }
      setConvertResult(data as MobileConversionResult);
      setConvertStatus(data.status === "unsupported" ? String(data.message || "지원하지 않는 변환입니다.") : "변환이 완료되었습니다.");
      await loadConversionHistory();
      await onCreditsRefresh?.();
      if (data.status === "success") {
        window.dispatchEvent(new Event("credits:refresh"));
      }
    } catch (error) {
      setConvertStatus(error instanceof Error ? error.message : "파일 변환에 실패했습니다.");
    } finally {
      setIsConvertingFile(false);
      if (convertInputRef.current) {
        convertInputRef.current.value = "";
      }
    }
  }

  async function downloadConversion(conversionId: string, fallbackName: string) {
    setDownloadingConversionId(conversionId);
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/convert/download/${conversionId}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(String(error.detail || "다운로드에 실패했습니다."));
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = downloadNameFromHeaders(response.headers, fallbackName);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setConvertStatus("다운로드 완료");
    } catch (error) {
      setConvertStatus(error instanceof Error ? error.message : "다운로드에 실패했습니다.");
    } finally {
      setDownloadingConversionId("");
    }
  }

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || !selectedDocument) {
      return;
    }

    setIsAsking(true);
    setChatStatus("답변 생성 중...");
    setMessages((current) => [...current, { role: "user", content: trimmedQuestion }]);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion, file_id: selectedDocument.id }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(String(error.detail || "질문 처리에 실패했습니다."));
      }

      const data = (await response.json()) as { answer?: string };
      setMessages((current) => [...current, { role: "assistant", content: data.answer || "답변이 비어 있습니다." }]);
      setQuestion("");
      setChatStatus("");
    } catch (error) {
      setChatStatus(error instanceof Error ? error.message : "질문 처리에 실패했습니다.");
    } finally {
      setIsAsking(false);
    }
  }

  function closeCreditConfirm() {
    setCreditConfirm(null);
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
  }

  function handleCreditCharge() {
    window.location.assign("/mypage");
  }

  function selectDocumentForTarget(documentId: string, target: Exclude<DocumentPickerTarget, null>) {
    setMobileSelectedDocumentId(documentId);
    onDocumentSelect(documentId);
    if (target === "convert") {
      setConvertStatus("");
    }
    setDocumentPickerTarget(null);
    setDocumentSearch("");
  }

  function confirmCreditAction() {
    if (!creditConfirm) {
      return;
    }

    if (creditConfirm.kind === "upload") {
      void executeMobileUpload(creditConfirm.file, creditConfirm.creditCost);
      return;
    }

    executeConvertAction(creditConfirm);
  }

  function goNextTab() {
    const currentIndex = swipeTabs.indexOf(activePanel);
    const safeIndex = currentIndex < 0 ? 0 : currentIndex;
    const next = swipeTabs[(safeIndex + 1) % swipeTabs.length];
    console.log("[mobile-swipe-next]", activePanel, "->", next);
    onNavigate(next);
  }

  function goPrevTab() {
    const currentIndex = swipeTabs.indexOf(activePanel);
    const safeIndex = currentIndex < 0 ? 0 : currentIndex;
    const prev = swipeTabs[(safeIndex - 1 + swipeTabs.length) % swipeTabs.length];
    console.log("[mobile-swipe-prev]", activePanel, "->", prev);
    onNavigate(prev);
  }

  function shouldIgnoreSwipe(target: EventTarget | null) {
    if (!(target instanceof Element)) {
      return false;
    }

    return Boolean(target.closest("input, textarea, select, [data-swipe-ignore='true']"));
  }

  const isSwipeDisabled = Boolean(documentPickerTarget || creditConfirm || completeDialog || historySheetType);
  const swipeHandlers = useSwipeable({
    onSwipedLeft: ({ event }) => {
      if (!isSwipeDisabled && !shouldIgnoreSwipe(event.target)) {
        goNextTab();
      }
    },
    onSwipedRight: ({ event }) => {
      if (!isSwipeDisabled && !shouldIgnoreSwipe(event.target)) {
        goPrevTab();
      }
    },
    delta: 48,
    trackTouch: true,
    trackMouse: false,
    preventScrollOnSwipe: false,
  });

  const uploadInput = (
    <input
      ref={uploadInputRef}
      type="file"
      accept=".pdf,.txt,.xlsx,.csv,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
      className="hidden"
      onChange={(event) => void prepareMobileUpload(event.target.files?.[0] ?? null)}
    />
  );

  const overlays = (
    <>
      {creditConfirm && (
        <MobileCreditConfirmSheet
          title={creditConfirm.kind === "upload" ? "문서 업로드" : "파일 변환"}
          fileName={creditConfirm.fileName}
          pageCount={creditConfirm.pageCount}
          creditCost={creditConfirm.creditCost}
          currentCredits={credits ?? 0}
          conversionFormat={creditConfirm.kind === "convert" ? creditConfirm.conversionFormat : undefined}
          successNote={creditConfirm.kind === "upload" ? "업로드 성공 시에만 차감됩니다." : "변환 성공 시에만 차감됩니다."}
          confirmText={creditConfirm.kind === "upload" ? "업로드 시작" : "변환 시작"}
          isProcessing={isUploading}
          basisLabel={creditConfirm.kind === "upload" ? creditConfirm.basisLabel : undefined}
          sheetCount={creditConfirm.kind === "upload" ? creditConfirm.sheetCount : undefined}
          sheetPageCounts={creditConfirm.kind === "upload" ? creditConfirm.sheetPageCounts : undefined}
          note={creditConfirm.kind === "upload" ? creditConfirm.note : undefined}
          onCancel={closeCreditConfirm}
          onConfirm={confirmCreditAction}
          onCharge={handleCreditCharge}
        />
      )}
      {completeDialog && (
        <MobileCompleteDialog
          icon={completeDialog.icon}
          title={completeDialog.title}
          description={completeDialog.description}
          confirmText={completeDialog.confirmText}
          onConfirm={() => {
            const next = completeDialog.onConfirm;
            setCompleteDialog(null);
            next?.();
          }}
        />
      )}
      {mobileToast && (
        <div
          data-swipe-ignore="true"
          className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-xl rounded-2xl border border-primary/30 bg-card px-3 py-2 text-xs font-black leading-5 text-primary shadow-soft"
        >
          <div className="flex items-start justify-between gap-3">
            <span>{mobileToast}</span>
            <button type="button" onClick={() => setMobileToast("")} className="shrink-0 text-muted transition hover:text-title">
              닫기
            </button>
          </div>
        </div>
      )}
      {documentPickerTarget && (
        <MobileDocumentPickerSheet
          title="최근 문서 선택"
          documents={visibleDocuments}
          selectedDocumentId={mobileSelectedDocumentId}
          search={documentSearch}
          sort={documentSort}
          filter={documentFilter}
          onSearchChange={setDocumentSearch}
          onSortToggle={() => setDocumentSort((current) => (current === "latest" ? "name" : "latest"))}
          onFilterToggle={() => setDocumentFilter((current) => (current === "all" ? "complete" : "all"))}
          onSelect={(documentId) => selectDocumentForTarget(documentId, documentPickerTarget)}
          onClose={() => setDocumentPickerTarget(null)}
        />
      )}
      {historySheetType && (
        <MobileHistorySheet
          type={historySheetType}
          items={historySheetType === "summaries" ? results.summaries || [] : results.keywords || []}
          onClose={() => setHistorySheetType(null)}
          onDeleteSelected={() => setMobileToast("선택 삭제는 기존 기록 API 연결 범위에서 준비 중입니다.")}
          onDeleteAll={() => setMobileToast("전체 삭제는 기존 기록 API 연결 범위에서 준비 중입니다.")}
        />
      )}
    </>
  );

  function renderActiveMobileTab() {
    switch (activePanel) {
      case "overview": {
    const stats = [
      { label: "문서", value: documents.length, icon: FileSearch },
      { label: "AI 작업", value: analyses.length, icon: BarChart3 },
      { label: "대화", value: results.chats?.length || 0, icon: MessageSquareText },
      { label: "크레딧", value: credits ?? 0, icon: Sparkles },
    ];
    const quickActions: Array<{ label: string; tab: WorkspaceTab; icon: typeof FileText; upload?: boolean }> = [
      { label: "+ 업로드", tab: "documents", icon: UploadCloud, upload: true },
      { label: "분석", tab: "analysis", icon: BarChart3 },
      { label: "AI 대화", tab: "chat", icon: MessageSquareText },
      { label: "변환", tab: "convert", icon: ArrowRightLeft },
    ];

    return (
      <section className="grid gap-3">
        {uploadInput}
        <div className="grid grid-cols-2 gap-2">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <article key={stat.label} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black text-muted">{stat.label}</p>
                  <Icon className="text-primary" size={16} />
                </div>
                <strong className="mt-2 block text-2xl font-black leading-none text-title">
                  {stat.value.toLocaleString("ko-KR")}
                </strong>
              </article>
            );
          })}
        </div>

        <section className="grid gap-2">
          <h2 className="px-1 text-sm font-black text-title">바로 시작</h2>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    onNavigate(action.tab);
                    if (action.upload) {
                      window.setTimeout(openUploadPicker, 0);
                    }
                  }}
                  className="min-h-[4.4rem] rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition hover:border-primary/40 active:scale-[0.98] active:shadow-soft"
                >
                  <Icon className="text-primary" size={18} />
                  <span className="mt-2 block text-sm font-black text-title">{action.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <MobileList title="최근 문서" empty={isLoading ? "불러오는 중..." : emptyText}>
          {recentDocuments.slice(0, 3).map((document) => (
            <DocumentRow
              key={document.id}
              document={document}
              compact
              onClick={() => {
                setMobileSelectedDocumentId(document.id);
                onDocumentSelect(document.id);
                onNavigate("documents");
              }}
            />
          ))}
        </MobileList>

        <MobileList title="최근 AI 작업" empty={isLoading ? "불러오는 중..." : emptyText}>
          {activities.slice(0, 3).map((activity, index) => (
            <TimelineRow
              key={`${activity.type}-${activity.created_at ?? index}`}
              title={getActivityTitle(activity, activity.type || "summary")}
              meta={`${activity.filename || "문서"} · ${formatDate(activity.created_at)}`}
            />
          ))}
        </MobileList>
      </section>
    );
  }

      case "documents": {
    return (
      <section className="grid gap-3">
        {uploadInput}
        <button
          type="button"
          onClick={openUploadPicker}
          disabled={isUploading}
          className="grid min-h-14 gap-2 rounded-2xl border border-primary/35 bg-card p-3 text-left shadow-sm transition active:scale-[0.98] active:shadow-soft disabled:opacity-60"
        >
          <span className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-base font-black text-title">문서 업로드</span>
              <span className="mt-0.5 block text-xs font-bold text-muted">지원 형식 PDF · TXT · XLSX · CSV</span>
            </span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
              <UploadCloud size={18} />
            </span>
          </span>
          {(uploadStatus || isUploading) && (
            <span className="block h-1.5 overflow-hidden rounded-full bg-panel">
              <span className="block h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </span>
          )}
        </button>
        {uploadStatus && (
          <p className="flex items-center gap-2 rounded-2xl border border-border bg-panel px-3 py-2 text-xs font-bold text-body">
            {uploadProgress === 100 && <CheckCircle2 className="text-primary" size={13} />}
            {uploadStatus}
          </p>
        )}
        <section className="grid gap-2">
          <h2 className="px-1 text-sm font-black text-title">최근 문서</h2>
          <MobileDocumentTools
            search={documentSearch}
            sort={documentSort}
            filter={documentFilter}
            onSearchChange={setDocumentSearch}
            onSortToggle={() => setDocumentSort((current) => (current === "latest" ? "name" : "latest"))}
            onFilterToggle={() => setDocumentFilter((current) => (current === "all" ? "complete" : "all"))}
          />
          {visibleDocuments.length > 0 ? (
            visibleDocuments.map((document) => (
              <DocumentRow
                key={document.id}
                document={document}
                compact
                isSelected={selectedDocument?.id === document.id}
                onClick={() => {
                  setMobileSelectedDocumentId(document.id);
                  onDocumentSelect(document.id);
                }}
              />
            ))
          ) : (
            <p className="rounded-2xl border border-border bg-card p-4 text-sm font-bold leading-6 text-body">
              {isLoading ? "문서를 불러오는 중입니다..." : "조건에 맞는 문서가 없습니다."}
            </p>
          )}
        </section>
      </section>
    );
  }

      case "analysis": {
    return (
      <section className="grid gap-3">
        <MobileSectionHeader title="문서 분석" description="업로드에 포함된 기본 요약과 키워드를 확인합니다." />
        <MobileSelectedDocumentCard
          document={selectedDocument}
          emptyTitle="분석할 문서를 선택해주세요."
          actionLabel="다른 문서 선택"
          onAction={() => setDocumentPickerTarget("analysis")}
        />
        <button
          type="button"
          onClick={() => {
            if (!selectedDocument) {
              return;
            }
            setIsAnalysisConfirmOpen(true);
          }}
          disabled={!selectedDocument || isAnalyzing}
          className="flex min-h-11 items-center justify-between rounded-2xl border border-primary/40 bg-primary px-4 text-sm font-black text-white shadow-soft transition active:scale-[0.98] disabled:border-border disabled:bg-card disabled:text-muted disabled:shadow-none"
        >
          {isAnalyzing ? "AI 분석 진행 중..." : "AI 분석 시작"}
          <BarChart3 size={17} />
        </button>
        {analysisStatus && (
          <p className="rounded-2xl border border-border bg-panel px-3 py-2 text-xs font-bold text-body">
            {analysisStatus}
          </p>
        )}
        {summaryResult && (
          <article className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-muted">이번 요약 결과</p>
              <button
                type="button"
                onClick={() => setHistorySheetType("summaries")}
                className="rounded-full border border-border bg-panel px-2 py-1 text-[0.65rem] font-black text-body transition active:scale-95"
              >
                기존 요약 보기
              </button>
            </div>
            <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm font-bold leading-6 text-body">{summaryResult}</p>
          </article>
        )}
        {keywordResult.length > 0 && (
          <article className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-muted">이번 키워드 결과</p>
              <button
                type="button"
                onClick={() => setHistorySheetType("keywords")}
                className="rounded-full border border-border bg-panel px-2 py-1 text-[0.65rem] font-black text-body transition active:scale-95"
              >
                기존 키워드 보기
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {keywordResult.slice(0, 8).map((keyword) => (
                <span key={keyword} className="rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-[0.68rem] font-black text-primary">
                  {keyword}
                </span>
              ))}
            </div>
          </article>
        )}
        {isAnalysisConfirmOpen && (
          <ConfirmModal
            title="AI 분석을 시작할까요?"
            description="업로드에 포함 제공되는 핵심 요약과 키워드를 준비합니다."
            confirmText={isAnalyzing ? "분석 중..." : "분석 시작"}
            onCancel={() => setIsAnalysisConfirmOpen(false)}
            onConfirm={() => void handleSummaryConfirm()}
            disabled={isAnalyzing}
          />
        )}
      </section>
    );
  }

      case "chat": {
    return (
      <section className="grid gap-3">
        <MobileSectionHeader title="AI 채팅" description="선택한 문서에 대해 AI에게 질문하세요." />
        <MobileSelectedDocumentCard
          document={selectedDocument}
          emptyTitle="대화할 문서를 선택해주세요."
          actionLabel="다른 문서 선택"
          onAction={() => setDocumentPickerTarget("chat")}
        />
        <div className="grid gap-1">
          {chatStatus && <p className="px-1 text-xs font-bold text-primary">{chatStatus}</p>}
          <form onSubmit={handleAsk} className="flex gap-2">
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              disabled={!selectedDocument}
              className="min-w-0 flex-1 rounded-2xl border border-border bg-card px-3 text-sm font-bold text-title outline-none"
              placeholder="AI에게 질문을 입력하세요"
            />
            <button
              type="submit"
              disabled={isAsking || !selectedDocument}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-sm transition active:scale-95 disabled:opacity-60"
            >
              <Send size={17} />
            </button>
          </form>
        </div>
        {messages.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="grid gap-2">
              {messages.map((message, index) => (
                <p
                  key={`${message.role}-${index}`}
                  className={[
                    "max-w-[86%] rounded-2xl px-3 py-2 text-sm font-bold leading-6 shadow-sm",
                    message.role === "user"
                      ? "ml-auto rounded-br-md bg-primary text-white"
                      : "mr-auto rounded-bl-md bg-panel text-body",
                  ].join(" ")}
                >
                  {message.content}
                </p>
              ))}
            </div>
          </div>
        )}
        {messages.length === 0 && (
          <div className="flex min-h-24 items-center justify-center rounded-2xl border border-border bg-card px-6 text-center">
            <p className="text-sm font-bold leading-6 text-body">AI에게 질문을 입력하세요.</p>
          </div>
        )}
      </section>
    );
  }

      case "convert": {
    const convertActions = [
      {
        title: "TXT 변환",
        description: "문서 텍스트를 추출합니다.",
        icon: FileText,
        status: "사용 가능",
        available: true,
      },
      {
        title: "PDF 변환",
        description: "PDF 내보내기 준비 중",
        icon: ArrowRightLeft,
        status: "준비 중",
        available: false,
      },
      {
        title: "DOCX 변환",
        description: "Word 형식 변환 준비 중",
        icon: Sparkles,
        status: "준비 중",
        available: false,
      },
      {
        title: "표 추출",
        description: "추후 지원 예정",
        icon: ClipboardList,
        status: "준비 중",
        available: false,
      },
      {
        title: "문서 내보내기",
        description: "추후 지원 예정",
        icon: UploadCloud,
        status: "준비 중",
        available: false,
      },
    ];

    return (
      <section className="grid gap-3">
        {uploadInput}
        <MobileSectionHeader title="파일 변환" description="문서를 선택하고 필요한 변환 형식을 고르세요." />
        <input
          ref={convertInputRef}
          type="file"
          accept=".pdf,.txt,.xlsx,.hwpx"
          className="hidden"
          onChange={(event) => handleConvertFileChange(event.target.files?.[0] ?? null)}
        />
        <section className="grid gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-black text-title">Convert Studio</h2>
              <p className="mt-1 text-[0.68rem] font-bold leading-4 text-muted">
                PDF, TXT, XLSX, HWPX만 지원합니다. 다운로드는 다시 받아도 차감되지 않습니다.
              </p>
            </div>
            <Badge muted>{convertFileType ? mobileConversionLabels[convertFileType] : "FILE-2"}</Badge>
          </div>
          <button
            type="button"
            onClick={() => convertInputRef.current?.click()}
            disabled={isConvertingFile}
            className="min-h-12 rounded-2xl border border-border bg-panel px-3 text-left text-xs font-black text-body transition active:scale-[0.98] disabled:opacity-60"
          >
            {convertFile ? convertFile.name : "변환할 파일 선택"}
          </button>
          <select
            value={convertTarget}
            onChange={(event) => setConvertTarget(event.target.value as ConvertFileType)}
            disabled={!convertFileType || isConvertingFile}
            className="min-h-11 rounded-2xl border border-border bg-panel px-3 text-sm font-black text-title outline-none"
          >
            {convertTargets.length > 0 ? (
              convertTargets.map((target) => (
                <option key={target} value={target}>
                  {convertFileType ? `${mobileConversionLabels[convertFileType]} → ${mobileConversionLabels[target]}` : mobileConversionLabels[target]}
                </option>
              ))
            ) : (
              <option value="txt">파일을 먼저 선택해주세요</option>
            )}
          </select>
          <button
            type="button"
            onClick={() => void executeFileConversion()}
            disabled={!canRunMobileConvert}
            className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-3 text-sm font-black text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
          >
            <ArrowRightLeft size={16} />
            {isConvertingFile ? "변환 중" : "변환 실행"}
          </button>
        </section>
        {convertResult?.status === "success" && convertResult.conversion_id && (
          <article className="rounded-2xl border border-primary/25 bg-primary/10 p-3 shadow-sm">
            <div className="grid gap-3">
              <Badge>변환 완료</Badge>
              <div className="grid gap-2 rounded-2xl border border-primary/20 bg-card/70 p-3">
                <MobileInfoRow label="원본" value={convertResult.original_filename} />
                <MobileInfoRow label="변환" value={convertResult.display_filename || convertResult.output_filename || "converted"} />
                <MobileInfoRow
                  label="형식"
                  value={`${mobileConversionLabels[convertResult.original_type || convertFileType || "pdf"]} → ${mobileConversionLabels[convertResult.target_type || convertResult.target_format]}`}
                />
                <MobileInfoRow label="페이지" value={formatMobilePageCount(convertResult.page_count)} />
                <MobileInfoRow label="차감 크레딧" value={`${formatMobileCreditAmount(convertResult.credit_cost)} Credit`} />
              </div>
              <button
                type="button"
                onClick={() => void downloadConversion(convertResult.conversion_id || "", convertResult.display_filename || convertResult.output_filename || "converted")}
                disabled={downloadingConversionId === convertResult.conversion_id}
                className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-2xl bg-primary px-3 text-xs font-black text-white disabled:opacity-60"
              >
                <Download size={14} />
                다운로드
              </button>
            </div>
          </article>
        )}
        <MobileSelectedDocumentCard
          document={selectedDocument}
          emptyTitle="변환할 문서를 선택해주세요."
          actionLabel="다른 문서 선택"
          onAction={() => setDocumentPickerTarget("convert")}
        />

        <section className="grid gap-2">
          <h2 className="px-1 text-sm font-black text-title">새 문서 업로드</h2>
          <button
            type="button"
            onClick={openUploadPicker}
            disabled={isUploading}
            className="flex min-h-14 items-center justify-between rounded-2xl border border-border bg-card px-3 text-left shadow-sm transition hover:border-primary/40 active:scale-[0.98] active:shadow-soft disabled:opacity-60"
          >
            <span>
              <strong className="block text-sm font-black text-title">새 문서 업로드</strong>
              <span className="mt-0.5 block text-[0.68rem] font-bold text-muted">업로드한 문서를 자동 선택합니다.</span>
            </span>
            <UploadCloud className="text-primary" size={20} />
          </button>
        </section>

        {(uploadStatus || isUploading) && (
          <article className="grid gap-2 rounded-2xl border border-border bg-panel px-3 py-2 text-xs font-bold text-body">
            <span className="flex items-center gap-2">
              {uploadProgress === 100 && <CheckCircle2 className="text-primary" size={13} />}
              {uploadStatus || "업로드 중..."}
            </span>
            <span className="block h-1.5 overflow-hidden rounded-full bg-card">
              <span className="block h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </span>
          </article>
        )}

        {!selectedDocument && (
          <p className="rounded-2xl border border-border bg-panel px-3 py-2 text-xs font-bold text-body">
            문서를 선택하면 변환 메뉴를 사용할 수 있습니다.
          </p>
        )}
        {selectedDocument && (
          <section className="grid gap-2">
            <h2 className="px-1 text-sm font-black text-title">변환 메뉴</h2>
            <div className="grid grid-cols-2 gap-2">
              {convertActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.title}
                    type="button"
                    onClick={() => prepareConvertAction(action.title, action.available)}
                    className="min-h-[5.05rem] rounded-2xl border border-border bg-card p-2.5 text-left shadow-sm transition hover:border-primary/50 active:scale-[0.98] active:border-primary active:bg-primary/10 active:shadow-soft"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <Icon className="text-primary" size={20} />
                      <Badge muted>{action.status}</Badge>
                    </span>
                    <strong className="mt-1.5 block text-[0.8rem] font-black leading-4 text-title">{action.title}</strong>
                    <span className="mt-0.5 line-clamp-2 text-[0.66rem] font-bold leading-4 text-muted">{action.description}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
        {convertStatus && (
          <p className="rounded-2xl border border-border bg-panel px-3 py-2 text-xs font-bold text-body">
            {convertStatus}
          </p>
        )}
        <section className="grid gap-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-black text-title">변환 기록</h2>
            <button
              type="button"
              onClick={() => void loadConversionHistory()}
              className="flex min-h-8 items-center gap-1 rounded-xl border border-border bg-card px-2 text-[0.66rem] font-black text-body"
            >
              <RefreshCw size={12} />
              새로고침
            </button>
          </div>
          {conversionHistory.length > 0 ? (
            conversionHistory.slice(0, 6).map((item) => (
              <article key={item.conversion_id} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="line-clamp-1 text-sm font-black text-title">{item.original_filename}</h3>
                    <p className="mt-1 text-[0.68rem] font-bold text-muted">
                      {mobileConversionLabels[item.original_type]} → {mobileConversionLabels[item.target_type]} · {formatMobileCreditAmount(item.credit_cost)} Credit · {formatMobilePageCount(item.page_count)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void downloadConversion(item.conversion_id, item.display_filename || item.output_filename)}
                    disabled={downloadingConversionId === item.conversion_id}
                    className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-2xl bg-primary px-3 text-xs font-black text-white disabled:opacity-60"
                  >
                    <Download size={14} />
                    받기
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-2xl border border-border bg-panel px-3 py-2 text-xs font-bold text-body">
              아직 변환 기록이 없습니다.
            </p>
          )}
        </section>
      </section>
    );
  }

      case "history": {
    const historyFilters: Array<{ id: HistoryFilter; label: string }> = [
      { id: "today", label: "오늘" },
      { id: "week", label: "이번 주" },
      { id: "month", label: "이번 달" },
    ];

    return (
      <section className="grid gap-3">
        <MobileSectionHeader title="작업 기록" description="선택한 기간의 최근 작업 이력을 확인합니다." />
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-card p-1">
          {historyFilters.map((filter) => {
            const isSelected = historyFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setHistoryFilter(filter.id)}
                className={[
                  "min-h-9 rounded-xl text-xs font-black transition",
                  isSelected ? "bg-primary text-white shadow-soft scale-[1.02]" : "text-body",
                ].join(" ")}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        <MobileList title="최근 작업 이력" empty={isLoading ? "불러오는 중..." : "기록이 없습니다."}>
          {filteredActivities.map((activity, index) => (
            <TimelineRow
              key={`${activity.type}-${historyFilter}-${activity.created_at ?? index}`}
              title={getActivityTitle(activity, activity.type || "summary")}
              meta={`${activity.filename || "문서"} · ${formatDate(activity.created_at)}`}
              detail={activity.answer || activity.summary || activity.keywords?.slice(0, 4).join(", ")}
            />
          ))}
        </MobileList>
      </section>
    );
  }

      default:
        return null;
    }
}

  return (
    <div
      {...swipeHandlers}
      className="h-full min-h-[100dvh] overflow-y-auto overflow-x-hidden touch-pan-y bg-app [scrollbar-width:thin]"
    >
      <main className="min-h-[100dvh] pb-[calc(5.75rem+env(safe-area-inset-bottom))]">
        <section className="mx-auto w-full max-w-md px-4 py-3">
          {renderActiveMobileTab()}
        </section>
      </main>
      {overlays}
    </div>
  );
}

function ConfirmModal({
  title,
  description,
  confirmText,
  onCancel,
  onConfirm,
  disabled,
}: {
  title: string;
  description: string;
  confirmText: string;
  onCancel: () => void;
  onConfirm: () => void;
  disabled: boolean;
}) {
  const checklist = ["핵심 요약", "핵심 키워드", "AI 대화 준비"];

  return (
    <div data-swipe-ignore="true" className="ai-modal-backdrop z-50">
      <section className="ai-modal max-w-sm p-5">
        <div className="flex items-start gap-3">
          <div className="ai-modal-icon h-10 w-10">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="ai-modal-eyebrow">AI Analysis</p>
            <h2 className="mt-1 text-xl font-black text-title">{title}</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-body">{description}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-2 rounded-2xl border border-border bg-panel p-3">
          <p className="text-xs font-black text-primary">업로드에 포함 제공</p>
          {checklist.map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm font-black text-title">
              <CheckCircle2 className="text-primary" size={16} />
              {item}
            </div>
          ))}
          <div className="mt-1 rounded-xl border border-primary/25 bg-card px-3 py-2 text-sm font-black text-primary">
            업로드 포함 제공 · 추가 차감 없음
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} disabled={disabled} className="ai-btn ai-btn-secondary h-11">
            취소
          </button>
          <button type="button" onClick={onConfirm} disabled={disabled} className="ai-btn ai-btn-primary h-11">
            {confirmText}
          </button>
        </div>
      </section>
    </div>
  );
}

function MobileList({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const childArray = useMemo(() => Children.toArray(children), [children]);

  return (
    <section className="grid gap-2">
      <h2 className="px-1 text-sm font-black text-title">{title}</h2>
      {childArray.length > 0 ? (
        childArray
      ) : (
        <p className="rounded-2xl border border-border bg-card p-4 text-sm font-bold leading-6 text-body">{empty}</p>
      )}
    </section>
  );
}

function MobileSectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <section className="grid gap-1 px-1">
      <h2 className="text-lg font-black text-title">{title}</h2>
      {description && <p className="text-xs font-bold leading-5 text-muted">{description}</p>}
    </section>
  );
}

function MobileSelectedDocumentCard({
  document,
  emptyTitle,
  actionLabel,
  onAction,
}: {
  document: DocumentViewModel | null;
  emptyTitle: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <article className="grid gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-2">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileText size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-black text-primary">선택된 문서</p>
          {document ? (
            <>
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <Badge>{document.extension}</Badge>
                <h3 className="line-clamp-1 min-w-0 text-sm font-black text-title">{document.filename}</h3>
              </div>
              <p className="mt-1 truncate text-[0.68rem] font-bold text-muted">
                {document.createdLabel} · {formatDocumentInfo(document)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm font-black text-title">{emptyTitle}</p>
          )}
          </div>
        </div>
        {document && <Badge muted>{document.statusLabel}</Badge>}
      </div>
      <button
        type="button"
        onClick={onAction}
        className="min-h-9 rounded-2xl border border-border bg-panel px-3 text-xs font-black text-body transition hover:border-primary/40 active:scale-[0.98]"
      >
        {actionLabel}
      </button>
    </article>
  );
}

function MobileDocumentTools({
  search,
  sort,
  filter,
  onSearchChange,
  onSortToggle,
  onFilterToggle,
}: {
  search: string;
  sort: "latest" | "name";
  filter: "all" | "complete";
  onSearchChange: (value: string) => void;
  onSortToggle: () => void;
  onFilterToggle: () => void;
}) {
  return (
    <div className="grid gap-2 rounded-2xl border border-border bg-panel p-2">
      <label className="flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-3">
        <Search className="shrink-0 text-muted" size={15} />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="문서 검색"
          className="min-w-0 flex-1 bg-transparent text-sm font-bold text-title outline-none placeholder:text-muted"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onSortToggle}
          className="flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-xs font-black text-body transition active:scale-[0.98]"
        >
          <SlidersHorizontal size={14} />
          {sort === "latest" ? "최신순" : "이름순"}
        </button>
        <button
          type="button"
          onClick={onFilterToggle}
          className="flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-xs font-black text-body transition active:scale-[0.98]"
        >
          <Filter size={14} />
          {filter === "all" ? "전체" : "완료만"}
        </button>
      </div>
    </div>
  );
}

function MobileDocumentPickerSheet({
  title,
  documents,
  selectedDocumentId,
  search,
  sort,
  filter,
  onSearchChange,
  onSortToggle,
  onFilterToggle,
  onSelect,
  onClose,
}: {
  title: string;
  documents: DocumentViewModel[];
  selectedDocumentId: string;
  search: string;
  sort: "latest" | "name";
  filter: "all" | "complete";
  onSearchChange: (value: string) => void;
  onSortToggle: () => void;
  onFilterToggle: () => void;
  onSelect: (documentId: string) => void;
  onClose: () => void;
}) {
  return (
    <div data-swipe-ignore="true" className="fixed inset-0 z-50 flex items-end bg-black/35 px-2 pb-[calc(0.9rem+env(safe-area-inset-bottom))] backdrop-blur-sm">
      <section className="max-h-[82dvh] w-full overflow-hidden rounded-t-3xl border border-border bg-surface p-3 shadow-[0_-18px_42px_rgba(47,36,24,0.22)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-title">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-black text-body">
            닫기
          </button>
        </div>
        <div className="mt-3">
          <MobileDocumentTools
            search={search}
            sort={sort}
            filter={filter}
            onSearchChange={onSearchChange}
            onSortToggle={onSortToggle}
            onFilterToggle={onFilterToggle}
          />
        </div>
        <div className="mt-3 grid max-h-[54dvh] gap-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {documents.length > 0 ? (
            documents.map((document) => (
              <button
                key={document.id}
                type="button"
                onClick={() => onSelect(document.id)}
                className={[
                  "grid min-h-[3.9rem] gap-1 rounded-2xl p-2.5 text-left shadow-sm transition active:scale-[0.98]",
                  selectedDocumentId === document.id ? "border border-primary bg-primary/10" : "border border-border bg-card",
                ].join(" ")}
              >
                <span className="flex min-w-0 items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <Badge>{document.extension}</Badge>
                    <span className="line-clamp-1 min-w-0 text-sm font-black text-title">{document.filename}</span>
                  </span>
                  <Badge muted>{selectedDocumentId === document.id ? "선택됨" : document.statusLabel}</Badge>
                </span>
                <span className="truncate text-[0.68rem] font-bold text-muted">
                  {document.createdLabel} · {formatDocumentInfo(document)}
                </span>
              </button>
            ))
          ) : (
            <p className="rounded-2xl border border-border bg-card p-4 text-sm font-bold leading-6 text-body">
              조건에 맞는 문서가 없습니다.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function MobileHistorySheet({
  type,
  items,
  onClose,
  onDeleteSelected,
  onDeleteAll,
}: {
  type: Exclude<HistorySheetType, null>;
  items: ResultItem[];
  onClose: () => void;
  onDeleteSelected: () => void;
  onDeleteAll: () => void;
}) {
  const title = type === "summaries" ? "기존 요약" : "기존 키워드";

  return (
    <div data-swipe-ignore="true" className="fixed inset-0 z-50 flex items-end bg-black/35 px-2 pb-[calc(0.9rem+env(safe-area-inset-bottom))] backdrop-blur-sm">
      <section className="max-h-[82dvh] w-full overflow-hidden rounded-t-3xl border border-border bg-surface p-3 shadow-[0_-18px_42px_rgba(47,36,24,0.22)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-title">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-black text-body">
            닫기
          </button>
        </div>
        <div className="mt-3 grid max-h-[48dvh] gap-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {items.length > 0 ? (
            items.slice(0, 10).map((item, index) => (
              <article key={`${item.created_at ?? type}-${index}`} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
                <h3 className="line-clamp-1 text-sm font-black text-title">{item.filename || "문서 기록"}</h3>
                <p className="mt-1 text-[0.68rem] font-bold text-muted">{formatDate(item.created_at)}</p>
                <p className="mt-2 line-clamp-3 text-xs font-bold leading-5 text-body">
                  {type === "summaries" ? item.summary || "요약 내용 없음" : item.keywords?.join(", ") || "키워드 없음"}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  <button type="button" className="min-h-8 rounded-xl border border-border bg-panel text-[0.65rem] font-black text-body">
                    다시보기
                  </button>
                  <button type="button" onClick={onDeleteSelected} className="min-h-8 rounded-xl border border-border bg-panel text-[0.65rem] font-black text-body">
                    선택 삭제
                  </button>
                  <button type="button" onClick={onDeleteAll} className="min-h-8 rounded-xl border border-border bg-panel text-[0.65rem] font-black text-body">
                    전체 삭제
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-2xl border border-border bg-card p-4 text-sm font-bold leading-6 text-body">
              아직 저장된 기록이 없습니다.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function DocumentRow({
  document,
  onClick,
  compact = false,
  isSelected = false,
}: {
  document: DocumentViewModel;
  onClick: () => void;
  compact?: boolean;
  isSelected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative grid gap-1.5 overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition hover:border-primary/40 active:scale-[0.98] active:shadow-soft",
        isSelected ? "border-primary bg-primary/10 shadow-soft" : "border-border",
        compact ? "min-h-[4.1rem] p-2.5" : "min-h-[4.75rem] p-3",
      ].join(" ")}
    >
      {isSelected && <span className="absolute inset-y-0 left-0 w-1 bg-primary" />}
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge>{document.extension}</Badge>
          <h3 className="line-clamp-1 min-w-0 text-sm font-black text-title">{document.filename}</h3>
        </div>
        <Badge muted>{isSelected ? "선택됨" : document.statusLabel}</Badge>
      </div>
      <p className="truncate text-[0.68rem] font-bold text-muted">
        {document.createdLabel} · {formatDocumentInfo(document)}
      </p>
    </button>
  );
}

function TimelineRow({ title, meta, detail }: { title: string; meta: string; detail?: string }) {
  return (
    <article className="relative rounded-2xl border border-border bg-card p-2.5 pl-5 shadow-sm transition hover:border-primary/40 active:scale-[0.99]">
      <span className="absolute left-2 top-4 h-2 w-2 rounded-full bg-primary" />
      <h3 className="line-clamp-1 text-sm font-black text-title">{title}</h3>
      <p className="mt-1 truncate text-xs font-bold text-muted">{meta}</p>
      {detail && <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-body">{detail}</p>}
    </article>
  );
}

function MobileInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-2 text-xs">
      <span className="font-black text-muted">{label}</span>
      <span className="min-w-0 break-words font-black text-title">{value}</span>
    </div>
  );
}

function Badge({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
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






