"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { FileUp, History, RefreshCw, Send, Trash2 } from "lucide-react";

type UploadedFile = {
  file_id: string;
  filename: string;
  upload_path: string;
  created_at?: string;
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

const API_BASE_URL = "http://127.0.0.1:8000";

export function ChatDocument() {
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

  const canUpload = useMemo(() => selectedFile !== null && !isUploading, [selectedFile, isUploading]);
  const canAsk = useMemo(() => question.trim().length > 0 && !isAsking, [question, isAsking]);

  async function loadFiles() {
    const response = await fetch(`${API_BASE_URL}/files`);
    if (!response.ok) {
      throw new Error("파일 목록을 불러오지 못했습니다.");
    }
    const data = await response.json();
    const nextFiles = data.files ?? [];
    setFiles(nextFiles);
    setSelectedChatFileId((current) => (
      nextFiles.some((file: UploadedFile) => file.file_id === current)
        ? current
        : nextFiles[0]?.file_id || ""
    ));
  }

  useEffect(() => {
    loadFiles().catch(() => setUploadStatus("백엔드 서버에 연결할 수 없습니다."));
  }, []);

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
  }

  async function handleUpload() {
    if (!selectedFile) {
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    setIsUploading(true);
    setUploadStatus("업로드 중입니다...");

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail ?? "업로드에 실패했습니다.");
      }

      const result = await response.json();
      setSelectedFile(null);
      setUploadStatus(`${result.filename} 업로드 완료 · ${result.chunk_count} chunks`);
      await loadFiles();
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : "업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }
  }

  async function loadChatHistory() {
    if (!selectedChatFileId) {
      setHistoryStatus("문서를 먼저 선택해주세요.");
      return;
    }

    setIsHistoryLoading(true);
    setHistoryStatus("질문 이력을 불러오는 중입니다...");

    try {
      const response = await fetch(`${API_BASE_URL}/results/${selectedChatFileId}`);
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
    const confirmed = window.confirm(
      `${file.filename} 문서를 삭제할까요?\n\n업로드 원본, 검색 인덱스, 요약/키워드/질문 히스토리가 함께 삭제됩니다.`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingFileId(file.file_id);
    setUploadStatus("문서를 삭제하는 중입니다...");

    try {
      const response = await fetch(`${API_BASE_URL}/files/${file.file_id}`, {
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
      const response = await fetch(`${API_BASE_URL}/query`, {
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
      setQueryStatus(error instanceof Error ? error.message : "질문 처리에 실패했습니다.");
    } finally {
      setIsAsking(false);
    }
  }

  return (
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
            {isUploading ? "업로드 중" : "업로드"}
          </button>
        </div>
        {uploadStatus && <p className="mt-3 text-sm font-semibold text-neutral-600">{uploadStatus}</p>}

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
                  <span>{file.created_at ? new Date(file.created_at).toLocaleString() : "-"}</span>
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
                  {file.filename}
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
  );
}
