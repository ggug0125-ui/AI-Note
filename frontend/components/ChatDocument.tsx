"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { FileUp, History, RefreshCw, Send, Trash2 } from "lucide-react";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";

type UploadedFile = {
  file_id: string;
  filename: string;
  upload_path: string;
  created_at?: string;
  uploaded_at?: string;
  text_length?: number;
  chunk_count?: number;
};

type Source = {
  text: string;
  metadata: Record<string, unknown>;
  score?: number;
};

type QueryResponse = {
  answer: string;
  sources: Source[];
};

type ChatHistoryItem = {
  question: string;
  answer: string;
  sources: Source[];
  created_at?: string;
};

type UploadCreditPreview = {
  file: File;
  pageCount: number | null;
  credits: number | null;
  currentCredits: number | null;
};

type UploadCreditUsage = {
  credit_cost?: number;
  credits_after?: number;
};

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
    return "업로드 후 계산";
  }
  return Number.isInteger(credits) ? String(credits) : credits.toFixed(1);
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

function getFileTimestamp(file: UploadedFile) {
  return file.created_at || file.uploaded_at || "";
}

function sortFilesByLatest(files: UploadedFile[]) {
  return [...files].sort((a, b) => getFileTimestamp(b).localeCompare(getFileTimestamp(a)));
}

function formatFileDate(file: UploadedFile) {
  const timestamp = getFileTimestamp(file);
  if (!timestamp) {
    return "날짜 없음";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  const day = date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).replace(/\.\s?/g, ".").replace(/\.$/, "");
  const time = date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
  return `${day} ${time}`;
}

function getFileOptionLabel(file: UploadedFile) {
  return `${file.filename} · ${formatFileDate(file)}`;
}

function getAssistantErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (message.includes("I could not find relevant context") || message.includes("noteflow collection")) {
    return "문서 검색 인덱스를 찾지 못했습니다. 해당 문서를 다시 업로드해주세요.";
  }
  if (message.includes("Uploaded PDF file is missing")) {
    return "업로드된 PDF 파일을 찾지 못했습니다. 해당 문서를 다시 업로드해주세요.";
  }
  return message || fallback;
}


export function ChatDocument({ isAdmin = true }: { isAdmin?: boolean }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedChatFileId, setSelectedChatFileId] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [queryStatus, setQueryStatus] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState("");
  const [creditPreview, setCreditPreview] = useState<UploadCreditPreview | null>(null);
  const [uploadCreditUsage, setUploadCreditUsage] = useState<UploadCreditUsage | null>(null);
  const [isStartConfirmOpen, setIsStartConfirmOpen] = useState(false);
  const [isPreparingCreditPreview, setIsPreparingCreditPreview] = useState(false);

  const canUpload = useMemo(
    () => isAdmin && selectedFile !== null && !isUploading && !isPreparingCreditPreview,
    [isAdmin, selectedFile, isUploading, isPreparingCreditPreview]
  );
  const canAsk = useMemo(
    () => isAdmin && selectedChatFileId.length > 0 && question.trim().length > 0 && !isAsking,
    [isAdmin, selectedChatFileId, question, isAsking]
  );

  async function loadFiles() {
    const response = await authenticatedFetch(`${API_BASE_URL}/files`);
    if (!response.ok) {
      throw new Error("파일 목록을 불러오지 못했습니다.");
    }
    const data = await response.json();
    const nextFiles = sortFilesByLatest(data.files ?? []);
    setFiles(nextFiles);
    setSelectedChatFileId((current) => (
      nextFiles.some((file: UploadedFile) => file.file_id === current)
        ? current
        : nextFiles[0]?.file_id || ""
    ));
  }

  useEffect(() => {
    if (!isAdmin) {
      setUploadStatus("관리자 전용 기능입니다.");
      return;
    }

    loadFiles().catch(() => setUploadStatus("백엔드 서버에 연결할 수 없습니다."));
  }, [isAdmin]);

  useEffect(() => {
    if (selectedChatFileId) {
      loadChatHistory();
    } else {
      setChatHistory([]);
    }
  }, [selectedChatFileId]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
    setUploadStatus("");
    setUploadCreditUsage(null);
  }

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

  async function handleUpload() {
    if (!isAdmin) {
      setUploadStatus("관리자 전용 기능입니다.");
      return;
    }

    if (!selectedFile) {
      return;
    }

    setIsPreparingCreditPreview(true);
    setUploadStatus("");
    setUploadCreditUsage(null);

    try {
      const [pageCount, currentCredits] = await Promise.all([
        estimatePdfPageCount(selectedFile),
        loadCurrentCredits()
      ]);
      setCreditPreview({
        file: selectedFile,
        pageCount,
        credits: pageCount === null ? null : calculateDocumentCredits(pageCount),
        currentCredits
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

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail ?? "업로드에 실패했습니다.");
      }

      const result = await response.json();
      const creditUsage = result.credit_usage as UploadCreditUsage | undefined;

      setSelectedFile(null);
      if (creditUsage) {
        setUploadStatus("문서 분석이 완료되었습니다.");
        setUploadCreditUsage(creditUsage);
      } else {
        setUploadCreditUsage(null);
        setUploadStatus(`${result.filename} 업로드 완료 · ${result.chunk_count} chunks`);
      }
      await loadFiles();
    } catch (error) {
      setUploadCreditUsage(null);
      setUploadStatus(error instanceof Error ? error.message : "업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleCancelCreditPreview() {
    setIsStartConfirmOpen(false);
    setCreditPreview(null);
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
  async function loadChatHistory() {
    if (!isAdmin) {
      setHistoryStatus("관리자 전용 기능입니다.");
      return;
    }

    if (!selectedChatFileId) {
      setHistoryStatus("문서를 먼저 선택해주세요.");
      return;
    }

    setIsHistoryLoading(true);
    setHistoryStatus("질문 이력을 불러오는 중입니다...");

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/results/${selectedChatFileId}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail ?? "질문 이력을 불러오지 못했습니다.");
      }
      const data = await response.json();
      setChatHistory(data.chats ?? []);
      setHistoryStatus("");
    } catch (error) {
      setHistoryStatus(error instanceof Error ? error.message : "질문 이력을 불러오지 못했습니다.");
    } finally {
      setIsHistoryLoading(false);
    }
  }

  async function handleDeleteFile(file: UploadedFile) {
    if (!isAdmin) {
      setUploadStatus("관리자 전용 기능입니다.");
      return;
    }

    const confirmed = window.confirm(
      `${file.filename} 문서를 삭제할까요?\n\n업로드 원본, 검색 인덱스, 요약/키워드/질문 히스토리가 함께 삭제됩니다.`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingFileId(file.file_id);
    setUploadStatus("문서를 삭제하는 중입니다...");

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/files/${file.file_id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail ?? "문서 삭제에 실패했습니다.");
      }

      if (selectedChatFileId === file.file_id) {
        setSelectedChatFileId("");
        setAnswer("");
        setSources([]);
        setChatHistory([]);
      }

      await loadFiles();
      setUploadStatus("문서를 삭제했습니다.");
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : "문서 삭제에 실패했습니다.");
    } finally {
      setDeletingFileId("");
    }
  }

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) {
      setQueryStatus("관리자 전용 기능입니다.");
      return;
    }

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      return;
    }
    if (!selectedChatFileId) {
      setQueryStatus("문서를 먼저 선택해주세요.");
      return;
    }

    setIsAsking(true);
    setQueryStatus("AI가 문서를 읽고 있습니다...");
    setAnswer("");
    setSources([]);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question: trimmedQuestion, file_id: selectedChatFileId })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail ?? "질문 처리에 실패했습니다.");
      }

      const result: QueryResponse = await response.json();
      setAnswer(result.answer);
      setSources(result.sources ?? []);
      setQueryStatus("");
      await loadChatHistory();
    } catch (error) {
      setQueryStatus(getAssistantErrorMessage(error, "질문 처리에 실패했습니다."));
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <>
    <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
      <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wide text-coral">AI Document Assistant</span>
          <h2 className="text-2xl font-black text-ink">문서 업로드 및 파일 관리</h2>
          <p className="text-sm leading-6 text-neutral-500">PDF를 업로드하면 어시스턴트가 문서 질의응답에 필요한 검색 인덱스를 생성합니다.</p>
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-4 sm:grid-cols-[1fr_auto]">
          <input id="pdf-upload" type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
          <label
            htmlFor="pdf-upload"
            className="flex min-h-12 cursor-pointer items-center rounded-xl border border-black/10 bg-white px-4 text-sm font-bold text-neutral-600 [overflow-wrap:anywhere]"
          >
            {selectedFile ? selectedFile.name : "PDF 파일 선택"}
          </label>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!canUpload}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-coral px-5 font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileUp className="mr-2" size={18} />
            {isPreparingCreditPreview ? "확인 중" : isUploading ? "업로드 중" : "업로드"}
          </button>
        </div>
        {uploadStatus && (
          uploadCreditUsage ? (
            <div className="mt-4 rounded-2xl border border-[#F0C7A6] bg-[#FFFDF8] p-4 shadow-sm">
              <p className="text-sm font-black text-ink">{uploadStatus}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#F3D7B5] bg-[#FFF3E5] px-4 py-3">
                  <span className="block text-xs font-black uppercase tracking-wide text-[#9A6A43]">차감 크레딧</span>
                  <strong className="mt-1 block text-2xl font-black text-coral">
                    {formatCreditAmount(Number(uploadCreditUsage.credit_cost ?? 0))} Credit{Number(uploadCreditUsage.credit_cost ?? 0) === 1 ? "" : "s"}
                  </strong>
                </div>
                <div className="rounded-2xl border border-[#E8C77A]/70 bg-[#FFF6D9] px-4 py-3">
                  <span className="block text-xs font-black uppercase tracking-wide text-[#8A7354]">현재 보유 크레딧</span>
                  <strong className="mt-1 block text-2xl font-black text-[#6F4D16]">
                    {Number(uploadCreditUsage.credits_after ?? 0).toLocaleString("en-US")} Credits
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 whitespace-pre-line text-sm font-semibold text-neutral-600">{uploadStatus}</p>
          )
        )}

        <div className="mt-8 flex items-center justify-between gap-4">
          <h3 className="text-lg font-black text-ink">업로드 파일</h3>
          <button
            type="button"
            onClick={() => loadFiles()}
            className="inline-flex min-h-10 items-center rounded-xl bg-neutral-100 px-4 text-sm font-bold text-ink transition hover:bg-neutral-200"
          >
            <RefreshCw className="mr-2" size={15} />
            새로고침
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {files.length === 0 ? (
            <p className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">업로드된 파일이 없습니다.</p>
          ) : (
            files.map((file) => (
              <article key={file.file_id} className="rounded-2xl border border-black/5 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <strong className="block text-sm text-ink [overflow-wrap:anywhere]">{file.filename}</strong>
                    <span className="mt-1 block text-xs text-neutral-500">{file.file_id}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteFile(file)}
                    disabled={deletingFileId === file.file_id}
                    className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl bg-red-50 px-3 text-xs font-black text-coral transition hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 className="mr-2" size={14} />
                    {deletingFileId === file.file_id ? "삭제 중" : "삭제"}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-neutral-500">
                  <span>{file.chunk_count ?? "-"} chunks</span>
                  <span>{file.text_length ?? "-"} chars</span>
                  <span>{formatFileDate(file)}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wide text-coral">Document Q&A</span>
          <h2 className="text-2xl font-black text-ink">문서 기반 질의응답</h2>
          <p className="text-sm leading-6 text-neutral-500">선택한 문서의 내용만 바탕으로 질문에 답변합니다.</p>
        </div>

        <form className="mt-5 grid gap-3" onSubmit={handleAsk}>
          <label className="grid gap-2 text-sm font-bold text-neutral-700">
            질문할 문서
            <select
              value={selectedChatFileId}
              onChange={(event) => setSelectedChatFileId(event.target.value)}
              className="min-h-12 rounded-xl border border-black/10 bg-white px-4 outline-none focus:border-coral"
            >
              <option value="">문서를 선택해주세요</option>
              {files.map((file) => (
                <option key={file.file_id} value={file.file_id}>
                  {getFileOptionLabel(file)}
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="업로드한 문서에 대해 질문하세요..."
            rows={5}
            className="min-h-40 resize-y rounded-2xl border border-black/10 bg-white p-4 text-sm leading-7 outline-none transition placeholder:text-neutral-400 focus:border-coral focus:ring-4 focus:ring-coral/10"
          />
          <button
            type="submit"
            disabled={!canAsk}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-coral px-5 font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="mr-2" size={18} />
            {isAsking ? "질문 중" : "질문하기"}
          </button>
          <button
            type="button"
            onClick={loadChatHistory}
            disabled={isHistoryLoading}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-neutral-100 px-5 font-black text-ink transition hover:bg-neutral-200 disabled:opacity-50"
          >
            <History className="mr-2" size={18} />
            {isHistoryLoading ? "불러오는 중" : "히스토리 보기"}
          </button>
        </form>
        {queryStatus && <p className="mt-3 text-sm font-semibold text-neutral-600">{queryStatus}</p>}
        {historyStatus && <p className="mt-2 text-sm font-semibold text-neutral-600">{historyStatus}</p>}

        <div className="mt-8">
          <h3 className="text-lg font-black text-ink">AI 답변</h3>
          <p className="mt-3 min-h-28 whitespace-pre-wrap rounded-2xl bg-[#F5F2EC] p-5 text-sm leading-8 text-neutral-700">
            {answer || "답변이 여기에 표시됩니다."}
          </p>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-black text-ink">출처</h3>
          <div className="mt-3 grid gap-3">
            {sources.length === 0 ? (
              <p className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">검색된 출처가 여기에 표시됩니다.</p>
            ) : (
              sources.map((source, index) => (
                <article key={`${source.metadata.file_id ?? "source"}-${index}`} className="rounded-2xl border border-black/5 bg-white p-4">
                  <div className="mb-3 flex flex-wrap gap-2 text-xs font-bold text-neutral-500">
                    <span>Source {index + 1}</span>
                    <span>{String(source.metadata.filename ?? "Unknown file")}</span>
                    {typeof source.metadata.chunk_index === "number" && <span>Chunk {source.metadata.chunk_index}</span>}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-neutral-700">{source.text}</p>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-black text-ink">질문 이력</h3>
          <div className="mt-3 grid gap-3">
            {chatHistory.length === 0 ? (
              <p className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">저장된 질문 이력이 없습니다.</p>
            ) : (
              chatHistory.map((item, index) => (
                <article key={`${item.created_at ?? "chat"}-${index}`} className="rounded-2xl border border-black/5 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm text-ink [overflow-wrap:anywhere]">{item.question}</strong>
                    <span className="text-xs font-bold text-neutral-500">{item.created_at ? new Date(item.created_at).toLocaleString() : "-"}</span>
                  </div>
                  <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-7 text-neutral-700">{item.answer}</p>
                  <span className="mt-3 block text-xs font-bold text-neutral-500">{item.sources?.length ?? 0} sources</span>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
    {creditPreview && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
        <section className="w-full max-w-lg rounded-3xl border border-[#F0C7A6] bg-[#FFFDF8] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-coral/10 text-coral">
              <FileUp size={22} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-coral">Credit Preview</p>
              <h2 className="mt-1 text-2xl font-black text-ink">문서 분석 크레딧 안내</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">
                요약 · 키워드 · 문서 질문은 문서 분석 비용에 포함됩니다.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm font-bold text-neutral-700">
            <div className="rounded-2xl border border-[#F3D7B5] bg-white/80 px-4 py-3">
              <span className="block text-xs font-black uppercase tracking-wide text-[#8A7354]">선택한 파일</span>
              <span className="mt-1 block [overflow-wrap:anywhere]">{creditPreview.file.name}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#F3D7B5] bg-[#FFF8EE] px-4 py-3">
                <span className="block text-xs font-black uppercase tracking-wide text-[#8A7354]">예상 페이지 수</span>
                <span className="mt-1 block text-lg font-black text-ink">
                  {creditPreview.pageCount === null ? "업로드 후 최종 계산" : `${creditPreview.pageCount} pages`}
                </span>
              </div>
              <div className="rounded-2xl border border-[#E8C77A]/60 bg-[#FFF6D9] px-4 py-3 text-[#7A551D]">
                <span className="block text-xs font-black uppercase tracking-wide">예상 차감 크레딧</span>
                <span className="mt-1 block text-lg font-black">
                  {formatCreditAmount(creditPreview.credits)} Credits
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-[#EAD8C1] bg-white/70 px-4 py-3">
              <span className="block text-xs font-black uppercase tracking-wide text-[#8A7354]">현재 보유 크레딧</span>
              <span className="mt-1 block text-lg font-black text-ink">
                {creditPreview.currentCredits === null
                  ? "확인할 수 없음"
                  : `${creditPreview.currentCredits.toLocaleString("en-US")} Credits`}
              </span>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-black/10 bg-white/70 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-[#8A7354]">포함 기능</p>
            <ul className="mt-3 grid gap-2 text-sm font-bold text-neutral-700 sm:grid-cols-3">
              <li className="rounded-xl bg-[#FFF3E5] px-3 py-2 text-center">요약</li>
              <li className="rounded-xl bg-[#FFF3E5] px-3 py-2 text-center">키워드</li>
              <li className="rounded-xl bg-[#FFF3E5] px-3 py-2 text-center">문서 질문</li>
            </ul>
            {creditPreview.pageCount === null && (
              <p className="mt-3 text-xs font-bold leading-5 text-neutral-500">
                페이지 수는 업로드 후 서버에서 최종 계산됩니다.
              </p>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCancelCreditPreview}
              disabled={isUploading}
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white text-sm font-black text-neutral-700 transition hover:border-coral/40 hover:text-coral disabled:cursor-not-allowed disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleConfirmCreditPreview}
              disabled={isUploading}
              className="inline-flex h-11 items-center justify-center rounded-full bg-coral text-sm font-black text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? "업로드 중" : "분석 시작"}
            </button>
          </div>
        </section>
      </div>
    )}
    {creditPreview && isStartConfirmOpen && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
        <section className="w-full max-w-md rounded-3xl border border-[#EFC29D] bg-[#FFFDF8] p-5 shadow-[0_26px_80px_rgba(88,54,28,0.24)]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF3E5] text-coral">
              <FileUp size={20} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#B26B38]">Final Check</p>
              <h2 className="mt-1 text-xl font-black text-ink">문서 분석 시작</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">문서 분석을 시작합니다.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-2.5 text-sm font-bold text-neutral-700">
            <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#F2D5B8] bg-white/80 px-4 py-3">
              <span className="shrink-0 text-[#8A7354]">선택한 파일</span>
              <span className="text-right text-ink [overflow-wrap:anywhere]">{creditPreview.file.name}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#F2D5B8] bg-white/80 px-4 py-3">
              <span className="text-[#8A7354]">예상 페이지 수</span>
              <span className="text-ink">
                {creditPreview.pageCount === null ? "업로드 후 최종 계산" : `${creditPreview.pageCount} Pages`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#E8C77A]/70 bg-[#FFF6D9] px-4 py-3 text-[#7A551D]">
              <span>차감 예정</span>
              <span className="text-lg font-black">{formatCreditAmount(creditPreview.credits)} Credits</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#F2D5B8] bg-white/80 px-4 py-3">
              <span className="text-[#8A7354]">현재 보유</span>
              <span className="text-ink">
                {creditPreview.currentCredits === null
                  ? "확인할 수 없음"
                  : `${creditPreview.currentCredits.toLocaleString("en-US")} Credits`}
              </span>
            </div>
          </div>

          <div className="my-5 h-px bg-[#ECD7BF]" />

          <div className="rounded-2xl border border-[#F0C7A6] bg-[#FFF3E5] p-4 text-sm font-bold leading-6 text-[#6F5137]">
            <p>문서 분석은 업로드 완료 후 자동으로 시작되며,</p>
            <p className="mt-1 font-black text-[#9A552B]">문서 분석이 성공한 경우에만 크레딧이 차감됩니다.</p>
            <p className="mt-3">업로드 또는 분석 과정에서 오류가 발생하면 크레딧은 차감되지 않습니다.</p>
          </div>

          <p className="mt-4 text-center text-sm font-black text-ink">계속 진행하시겠습니까?</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCancelStartConfirm}
              disabled={isUploading}
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white text-sm font-black text-neutral-700 transition hover:border-coral/40 hover:text-coral disabled:cursor-not-allowed disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void handleStartAnalysisConfirmed()}
              disabled={isUploading}
              className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-[#E8895C] to-[#D9A640] px-4 text-sm font-black text-white shadow-soft transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              확인하고 분석 시작
            </button>
          </div>
        </section>
      </div>
    )}
    </>
  );
}
