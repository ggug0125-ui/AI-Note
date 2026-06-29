"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Clipboard,
  FileText,
  MessageSquareText,
  RefreshCw,
  Sparkles,
  Tags,
  Trash2,
} from "lucide-react";
import { WorkspaceEmptyState } from "./ai-workspace/WorkspaceEmptyState";
import { WorkspaceLoadingState } from "./ai-workspace/WorkspaceLoadingState";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";

type UploadedFile = {
  file_id: string;
  filename: string;
  created_at?: string;
  uploaded_at?: string;
  chunk_count?: number;
  text_length?: number;
};

type Source = {
  text: string;
  metadata: Record<string, unknown>;
  score?: number;
};

type SummaryHistoryItem = {
  summary_type: string;
  summary: string;
  created_at?: string;
};

type KeywordHistoryItem = {
  count: number;
  scope: string;
  keywords: string[];
  topics: string[];
  created_at?: string;
};

type ChatHistoryItem = {
  question: string;
  answer: string;
  sources: Source[];
  created_at?: string;
};

type FileResults = {
  file_id: string;
  filename: string;
  summaries: SummaryHistoryItem[];
  keywords: KeywordHistoryItem[];
  chats: ChatHistoryItem[];
};

type TimelineType = "document" | "summary" | "keyword" | "chat" | "convert";
type FilterType = "all" | TimelineType;

type TimelineItem = {
  id: string;
  type: TimelineType;
  title: string;
  filename: string;
  createdAt?: string;
  preview: string;
  meta: string[];
  copyText?: string;
  fileId?: string;
};

const filters: Array<{ id: FilterType; label: string }> = [
  { id: "all", label: "전체" },
  { id: "document", label: "문서" },
  { id: "summary", label: "요약" },
  { id: "keyword", label: "키워드" },
  { id: "chat", label: "질문" },
  { id: "convert", label: "변환" },
];

const typeMeta: Record<TimelineType, { label: string; badge: string; icon: typeof FileText }> = {
  document: { label: "문서 업로드", badge: "ai-badge-info", icon: FileText },
  summary: { label: "요약 생성", badge: "ai-badge-primary", icon: Sparkles },
  keyword: { label: "키워드 추출", badge: "ai-badge-warning", icon: Tags },
  chat: { label: "AI 질문", badge: "ai-badge-success", icon: MessageSquareText },
  convert: { label: "변환 작업", badge: "ai-badge", icon: ArrowRightLeft },
};

function getFileTimestamp(file: UploadedFile) {
  return file.created_at || file.uploaded_at || "";
}

function formatDate(timestamp?: string) {
  if (!timestamp) {
    return "날짜 없음";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTimestampValue(timestamp?: string) {
  if (!timestamp) {
    return 0;
  }

  const value = new Date(timestamp).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function getDateGroup(timestamp?: string) {
  const value = getTimestampValue(timestamp);
  if (!value) {
    return "날짜 없음";
  }

  const now = new Date();
  const target = new Date(value);
  const isToday =
    now.getFullYear() === target.getFullYear() &&
    now.getMonth() === target.getMonth() &&
    now.getDate() === target.getDate();

  if (isToday) {
    return "오늘";
  }

  const daysAgo = (now.getTime() - value) / (1000 * 60 * 60 * 24);
  if (daysAgo <= 7) {
    return "이번 주";
  }

  return "이전 기록";
}

function sanitizeKeywordList(values: string[]) {
  const seen = new Set<string>();

  return values
    .flatMap((value) =>
      String(value)
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .replace(/["']?(keywords|topics)["']?\s*:/gi, "")
        .replace(/[{}[\]]/g, "")
        .split(/\r?\n|,/),
    )
    .map((value) =>
      value
        .trim()
        .replace(/^[\s"',:]+|[\s"',:]+$/g, "")
        .trim(),
    )
    .filter((value) => value.length > 0 && !/^[,:]+$/.test(value))
    .filter((value) => {
      const key = value.toLocaleLowerCase();
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function buildTimeline(files: UploadedFile[], results: FileResults | null): TimelineItem[] {
  const documentItems: TimelineItem[] = files.map((file) => ({
    id: `document-${file.file_id}`,
    type: "document",
    title: "문서 업로드",
    filename: file.filename,
    createdAt: getFileTimestamp(file),
    preview: file.filename,
    meta: [
      `파일 ID ${file.file_id}`,
      file.chunk_count !== undefined ? `분석 구간 ${file.chunk_count}개` : "",
      file.text_length !== undefined ? `본문 ${file.text_length.toLocaleString()}자` : "",
    ].filter(Boolean),
    fileId: file.file_id,
  }));

  if (!results) {
    return documentItems.sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt));
  }

  const summaryItems: TimelineItem[] = results.summaries.map((item, index) => ({
    id: `summary-${item.created_at ?? index}`,
    type: "summary",
    title: item.summary_type || "요약",
    filename: results.filename,
    createdAt: item.created_at,
    preview: item.summary,
    meta: ["요약 결과", item.summary_type].filter(Boolean),
    copyText: item.summary,
    fileId: results.file_id,
  }));

  const keywordItems: TimelineItem[] = results.keywords.map((item, index) => {
    const keywords = sanitizeKeywordList([...(item.keywords ?? []), ...(item.topics ?? [])]);

    return {
      id: `keyword-${item.created_at ?? index}`,
      type: "keyword",
      title: item.scope || "키워드",
      filename: results.filename,
      createdAt: item.created_at,
      preview: keywords.join(", ") || "키워드 결과",
      meta: [`키워드 ${keywords.length}개`, item.scope].filter(Boolean),
      copyText: keywords.join(", "),
      fileId: results.file_id,
    };
  });

  const chatItems: TimelineItem[] = results.chats.map((item, index) => ({
    id: `chat-${item.created_at ?? index}`,
    type: "chat",
    title: item.question,
    filename: results.filename,
    createdAt: item.created_at,
    preview: item.answer,
    meta: [`출처 ${item.sources?.length ?? 0}개`],
    copyText: `Q. ${item.question}\n\nA. ${item.answer}`,
    fileId: results.file_id,
  }));

  return [...documentItems, ...summaryItems, ...keywordItems, ...chatItems].sort(
    (a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt),
  );
}

export function HistoryDashboard() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [results, setResults] = useState<FileResults | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [status, setStatus] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);

  const selectedFile = useMemo(
    () => files.find((file) => file.file_id === selectedFileId),
    [files, selectedFileId],
  );

  const timelineItems = useMemo(() => buildTimeline(files, results), [files, results]);
  const filteredTimelineItems = useMemo(
    () => timelineItems.filter((item) => activeFilter === "all" || item.type === activeFilter),
    [timelineItems, activeFilter],
  );
  const groupedTimelineItems = useMemo(() => {
    return filteredTimelineItems.reduce<Record<string, TimelineItem[]>>((groups, item) => {
      const group = getDateGroup(item.createdAt);
      return { ...groups, [group]: [...(groups[group] ?? []), item] };
    }, {});
  }, [filteredTimelineItems]);
  const timelineGroups = ["오늘", "이번 주", "이전 기록", "날짜 없음"].filter(
    (group) => (groupedTimelineItems[group] ?? []).length > 0,
  );

  const summaryCount = results?.summaries.length ?? 0;
  const keywordCount = results?.keywords.length ?? 0;
  const chatCount = results?.chats.length ?? 0;
  const totalCount = files.length + summaryCount + keywordCount + chatCount;

  async function loadFiles() {
    setStatus("문서 목록을 불러오는 중입니다...");

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/files`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail ?? "문서 목록을 불러오지 못했습니다.");
      }

      const data = await response.json();
      const nextFiles = data.files ?? [];
      setFiles(nextFiles);
      setSelectedFileId((current) => current || nextFiles[0]?.file_id || "");
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "문서 목록을 불러오지 못했습니다.");
    }
  }

  async function loadResults(fileId = selectedFileId) {
    if (!fileId) {
      setResults(null);
      setStatus("문서를 먼저 선택해주세요.");
      return;
    }

    setIsLoading(true);
    setStatus("작업 기록을 불러오는 중입니다...");

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/results/${fileId}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail ?? "작업 기록을 불러오지 못했습니다.");
      }

      const data = await response.json();
      setResults(data);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "작업 기록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshAll() {
    await loadFiles();
    if (selectedFileId) {
      await loadResults(selectedFileId);
    }
  }

  async function deleteHistory() {
    if (!selectedFileId) {
      setStatus("문서를 먼저 선택해주세요.");
      return;
    }

    setIsDeleting(true);
    setStatus("선택한 문서의 작업 기록을 삭제하는 중입니다...");

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/results/${selectedFileId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail ?? "작업 기록 삭제에 실패했습니다.");
      }

      await loadResults(selectedFileId);
      setStatus("작업 기록을 삭제했습니다.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "작업 기록 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function deleteSelectedFile() {
    if (!selectedFileId) {
      setStatus("문서를 먼저 선택해주세요.");
      return;
    }

    const filename = selectedFile?.filename ?? results?.filename ?? selectedFileId;
    const confirmed = window.confirm(
      `${filename} 문서를 삭제할까요?\n\n업로드 원본, 검색 인덱스, 요약/키워드/질문 히스토리가 모두 삭제됩니다. 결과 히스토리만 삭제하려면 '히스토리 삭제'를 사용하세요.`,
    );
    if (!confirmed) {
      return;
    }

    setIsDeletingFile(true);
    setStatus("문서를 삭제하는 중입니다...");

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/files/${selectedFileId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail ?? "문서 삭제에 실패했습니다.");
      }

      const deletedFileId = selectedFileId;
      const nextFiles = files.filter((file) => file.file_id !== deletedFileId);
      setFiles(nextFiles);
      setSelectedFileId(nextFiles[0]?.file_id ?? "");
      setResults(null);
      setStatus("문서를 삭제했습니다.");
      await loadFiles();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "문서 삭제에 실패했습니다.");
    } finally {
      setIsDeletingFile(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("복사했습니다.");
    } catch {
      setCopyStatus("복사에 실패했습니다.");
    }
  }

  useEffect(() => {
    void loadFiles();
  }, []);

  useEffect(() => {
    if (selectedFileId) {
      void loadResults(selectedFileId);
    } else {
      setResults(null);
    }
  }, [selectedFileId]);

  return (
    <section className="grid gap-6">
      <div className="ai-card p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wide text-coral">History Center</span>
            <h2 className="mt-2 text-2xl font-black text-[var(--ai-color-text-primary)]">통합 작업 타임라인</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-[var(--ai-color-text-secondary)]">
              문서 업로드부터 요약, 키워드, 질문 기록까지 한 화면에서 확인하세요.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={refreshAll} disabled={isLoading} className="ai-btn ai-btn-secondary">
              <RefreshCw size={16} />
              새로고침
            </button>
            <button
              type="button"
              onClick={deleteHistory}
              disabled={!selectedFileId || isDeleting}
              className="ai-btn ai-btn-primary"
            >
              <Trash2 size={16} />
              {isDeleting ? "삭제 중" : "히스토리 삭제"}
            </button>
            <button
              type="button"
              onClick={deleteSelectedFile}
              disabled={!selectedFileId || isDeletingFile}
              className="ai-btn ai-btn-danger"
            >
              <Trash2 size={16} />
              {isDeletingFile ? "문서 삭제 중" : "문서 삭제"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="전체 기록" value={totalCount} />
          <StatCard label="문서 기록" value={files.length} />
          <StatCard label="요약 기록" value={summaryCount} />
          <StatCard label="키워드 기록" value={keywordCount} />
          <StatCard label="질문 기록" value={chatCount} />
        </div>

        <label className="mt-6 grid gap-2 text-sm font-black text-[var(--ai-color-text-primary)]">
          문서 선택
          <select value={selectedFileId} onChange={(event) => setSelectedFileId(event.target.value)} className="ai-select">
            <option value="">문서를 선택해주세요</option>
            {files.map((file) => (
              <option key={file.file_id} value={file.file_id}>
                {file.filename}
              </option>
            ))}
          </select>
        </label>

        {status && <WorkspaceLoadingState message={status} isLoading={isLoading || isDeleting || isDeletingFile} />}
        {copyStatus && <p className="ai-alert ai-alert-success mt-2">{copyStatus}</p>}
      </div>

      <div className="ai-card p-4 md:p-5">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={[
                "ai-btn min-h-10 px-4 py-2 text-xs",
                activeFilter === filter.id ? "ai-btn-active" : "ai-btn-secondary",
              ].join(" ")}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <WorkspaceLoadingState message="작업 기록을 불러오는 중입니다..." isLoading />
        ) : filteredTimelineItems.length === 0 ? (
          <WorkspaceEmptyState icon={<FileText size={16} />}>표시할 작업 기록이 없습니다.</WorkspaceEmptyState>
        ) : (
          timelineGroups.map((group) => (
            <section key={group} className="grid gap-3">
              <h3 className="px-1 text-sm font-black text-[var(--ai-color-text-secondary)]">{group}</h3>
              <div className="grid gap-3">
                {groupedTimelineItems[group].map((item) => (
                  <TimelineCard
                    key={item.id}
                    item={item}
                    isSelectedDocument={item.type === "document" && item.fileId === selectedFileId}
                    onSelectFile={(fileId) => setSelectedFileId(fileId)}
                    onCopy={copyText}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="ai-panel-compact">
      <p className="text-xs font-black text-[var(--ai-color-text-secondary)]">{label}</p>
      <strong className="mt-2 block text-2xl font-black text-[var(--ai-color-text-primary)]">{value}</strong>
    </article>
  );
}

function TimelineCard({
  item,
  isSelectedDocument,
  onSelectFile,
  onCopy,
}: {
  item: TimelineItem;
  isSelectedDocument: boolean;
  onSelectFile: (fileId: string) => void;
  onCopy: (text: string) => void;
}) {
  const meta = typeMeta[item.type];
  const Icon = meta.icon;

  return (
    <article className={["ai-card p-4 md:p-5", isSelectedDocument ? "ai-card-selected" : ""].filter(Boolean).join(" ")}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={["ai-badge", meta.badge].join(" ")}>
              <Icon size={13} />
              {meta.label}
            </span>
            {isSelectedDocument && <span className="ai-badge ai-badge-primary">선택됨</span>}
            <span className="ai-badge">{formatDate(item.createdAt)}</span>
          </div>
          <h3 className="mt-3 line-clamp-2 break-words text-lg font-black text-[var(--ai-color-text-primary)]">
            {item.title}
          </h3>
          <p className="mt-1 line-clamp-1 break-words text-sm font-bold text-[var(--ai-color-text-secondary)]">
            {item.filename}
          </p>
          <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-7 text-[var(--ai-color-text-secondary)]">
            {item.preview}
          </p>
          {item.meta.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.meta.map((value) => (
                <span key={value} className="ai-badge">
                  {value}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
          {item.fileId && (
            <button type="button" onClick={() => onSelectFile(item.fileId ?? "")} className="ai-btn ai-btn-secondary min-h-10 px-4 py-2 text-xs">
              다시 보기
            </button>
          )}
          {item.copyText && (
            <button type="button" onClick={() => onCopy(item.copyText ?? "")} className="ai-btn ai-btn-ghost min-h-10 px-4 py-2 text-xs">
              <Clipboard size={14} />
              복사
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
