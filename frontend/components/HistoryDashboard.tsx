"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Clipboard, RefreshCw, Trash2 } from "lucide-react";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";

type UploadedFile = {
  file_id: string;
  filename: string;
  created_at?: string;
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


export function HistoryDashboard() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [results, setResults] = useState<FileResults | null>(null);
  const [status, setStatus] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);

  const selectedFile = useMemo(
    () => files.find((file) => file.file_id === selectedFileId),
    [files, selectedFileId],
  );

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
    loadFiles();
  }, []);

  useEffect(() => {
    if (selectedFileId) {
      loadResults(selectedFileId);
    } else {
      setResults(null);
    }
  }, [selectedFileId]);

  return (
    <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wide text-coral">History Center</span>
          <h2 className="text-2xl font-black text-ink">전체 업로드 문서</h2>
          <p className="text-sm leading-6 text-neutral-500">문서를 선택하면 저장된 요약, 키워드, 질문 이력을 한 번에 확인할 수 있습니다.</p>
        </div>

        <label className="mt-6 grid gap-2 text-sm font-bold text-neutral-700">
          문서 선택
          <select
            value={selectedFileId}
            onChange={(event) => setSelectedFileId(event.target.value)}
            className="min-h-12 rounded-xl border border-black/10 bg-white px-4 outline-none focus:border-coral"
          >
            <option value="">문서를 선택해주세요</option>
            {files.map((file) => (
              <option key={file.file_id} value={file.file_id}>
                {file.filename}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={refreshAll}
            disabled={isLoading}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-neutral-100 px-4 text-sm font-black text-ink transition hover:bg-neutral-200 disabled:opacity-50"
          >
            <RefreshCw className="mr-2" size={16} />
            새로고침
          </button>
          <button
            type="button"
            onClick={deleteHistory}
            disabled={!selectedFileId || isDeleting}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-coral px-4 text-sm font-black text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            <Trash2 className="mr-2" size={16} />
            {isDeleting ? "삭제 중" : "히스토리 삭제"}
          </button>
          <button
            type="button"
            onClick={deleteSelectedFile}
            disabled={!selectedFileId || isDeletingFile}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-700 px-4 text-sm font-black text-white transition hover:bg-red-800 disabled:opacity-50"
          >
            <Trash2 className="mr-2" size={16} />
            {isDeletingFile ? "문서 삭제 중" : "문서 삭제"}
          </button>
        </div>

        {status && <p className="mt-4 text-sm font-semibold text-neutral-600">{status}</p>}
        {copyStatus && <p className="mt-2 text-sm font-semibold text-emerald-700">{copyStatus}</p>}

        <div className="mt-6 grid gap-3">
          {files.length === 0 ? (
            <p className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">업로드된 문서가 없습니다.</p>
          ) : (
            files.map((file) => (
              <article
                key={file.file_id}
                className={[
                  "rounded-2xl border p-4 transition",
                  selectedFileId === file.file_id ? "border-coral bg-coral/5" : "border-black/5 bg-white",
                ].join(" ")}
              >
                <strong className="block text-sm text-ink [overflow-wrap:anywhere]">{file.filename}</strong>
                <span className="mt-1 block text-xs text-neutral-500">{file.file_id}</span>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-neutral-500">
                  <span>{file.chunk_count ?? "-"} chunks</span>
                  <span>{file.text_length ?? "-"} chars</span>
                  <span>{file.created_at ? new Date(file.created_at).toLocaleString() : "-"}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      <div className="grid gap-6">
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-coral">Selected Document</span>
            <h3 className="text-xl font-black text-ink">{selectedFile?.filename ?? results?.filename ?? "문서를 선택해주세요"}</h3>
            <p className="text-sm text-neutral-500">{selectedFileId || "선택된 file_id가 없습니다."}</p>
          </div>
        </section>

        <HistorySection title="요약 이력" emptyText="저장된 요약 이력이 없습니다.">
          {results?.summaries.map((item, index) => (
            <article key={`${item.created_at ?? "summary"}-${index}`} className="rounded-2xl border border-black/5 bg-white p-4">
              <CardHeader
                title={item.summary_type}
                createdAt={item.created_at}
                onCopy={() => copyText(item.summary)}
              />
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-neutral-700">{item.summary}</p>
            </article>
          ))}
        </HistorySection>

        <HistorySection title="키워드 이력" emptyText="저장된 키워드 이력이 없습니다.">
          {results?.keywords.map((item, index) => (
            <article key={`${item.created_at ?? "keyword"}-${index}`} className="rounded-2xl border border-black/5 bg-white p-4">
              <CardHeader
                title={`${item.scope} · ${item.count}개`}
                createdAt={item.created_at}
                onCopy={() => copyText([...item.keywords, ...item.topics].join(", "))}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {item.keywords.map((keyword) => (
                  <span key={`${item.created_at}-keyword-${keyword}`} className="rounded-full bg-neutral-50 px-3 py-1 text-xs font-bold text-neutral-700">
                    {keyword}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.topics.map((topic) => (
                  <span key={`${item.created_at}-topic-${topic}`} className="rounded-full bg-coral/10 px-3 py-1 text-xs font-bold text-coral">
                    {topic}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </HistorySection>

        <HistorySection title="질문/답변 이력" emptyText="저장된 질문 이력이 없습니다.">
          {results?.chats.map((item, index) => (
            <article key={`${item.created_at ?? "chat"}-${index}`} className="rounded-2xl border border-black/5 bg-white p-4">
              <CardHeader
                title={item.question}
                createdAt={item.created_at}
                onCopy={() => copyText(`Q. ${item.question}\n\nA. ${item.answer}`)}
              />
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-neutral-700">{item.answer}</p>
              <span className="mt-3 block text-xs font-bold text-neutral-500">{item.sources?.length ?? 0} sources</span>
            </article>
          ))}
        </HistorySection>
      </div>
    </section>
  );
}

function HistorySection({
  title,
  emptyText,
  children,
}: {
  title: string;
  emptyText: string;
  children: ReactNode;
}) {
  const childArray = useMemo(() => (
    Array.isArray(children) ? children.filter(Boolean) : children ? [children] : []
  ), [children]);

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
      <h3 className="text-lg font-black text-ink">{title}</h3>
      <div className="mt-4 grid gap-3">
        {childArray.length === 0 ? (
          <p className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">{emptyText}</p>
        ) : (
          childArray
        )}
      </div>
    </section>
  );
}

function CardHeader({
  title,
  createdAt,
  onCopy,
}: {
  title: string;
  createdAt?: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <strong className="block text-sm text-ink [overflow-wrap:anywhere]">{title}</strong>
        <span className="mt-1 block text-xs font-bold text-neutral-500">{createdAt ? new Date(createdAt).toLocaleString() : "-"}</span>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 px-3 text-xs font-black text-ink transition hover:bg-neutral-200"
      >
        <Clipboard className="mr-2" size={14} />
        복사
      </button>
    </div>
  );
}
