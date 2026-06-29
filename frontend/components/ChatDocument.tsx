"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FileText, History, Send } from "lucide-react";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";

type UploadedFile = {
  file_id: string;
  filename: string;
  upload_path?: string;
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

type ChatDocumentProps = {
  isAdmin?: boolean;
  selectedFileId: string;
  onOpenDocuments: () => void;
};

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
    day: "2-digit",
  }).replace(/\.\s?/g, ".").replace(/\.$/, "");
  const time = date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${day} ${time}`;
}

function getAssistantErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (message.includes("I could not find relevant context") || message.includes("noteflow collection")) {
    return "문서 검색 인덱스를 찾지 못했습니다. 문서 관리에서 해당 문서를 다시 확인해주세요.";
  }
  if (message.includes("Uploaded PDF file is missing")) {
    return "업로드된 문서 파일을 찾지 못했습니다. 문서 관리에서 해당 문서를 다시 확인해주세요.";
  }
  return message || fallback;
}

export function ChatDocument({ isAdmin = true, selectedFileId, onOpenDocuments }: ChatDocumentProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [queryStatus, setQueryStatus] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const selectedFile = useMemo(
    () => files.find((file) => file.file_id === selectedFileId) || null,
    [files, selectedFileId],
  );
  const canAsk = useMemo(
    () => isAdmin && selectedFile !== null && question.trim().length > 0 && !isAsking,
    [isAdmin, selectedFile, question, isAsking],
  );

  async function loadFiles() {
    const response = await authenticatedFetch(`${API_BASE_URL}/files`);
    if (!response.ok) {
      throw new Error("문서 목록을 불러오지 못했습니다.");
    }

    const data = await response.json();
    setFiles(sortFilesByLatest(data.files ?? []));
  }

  async function loadChatHistory() {
    if (!isAdmin) {
      setHistoryStatus("관리자 전용 기능입니다.");
      return;
    }

    if (!selectedFileId) {
      setHistoryStatus("먼저 문서 관리에서 분석할 문서를 선택해주세요.");
      return;
    }

    setIsHistoryLoading(true);
    setHistoryStatus("질문 이력을 불러오는 중입니다...");

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/results/${selectedFileId}`);
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

  useEffect(() => {
    if (!isAdmin) {
      setQueryStatus("관리자 전용 기능입니다.");
      return;
    }

    loadFiles().catch(() => setQueryStatus("백엔드 서버에 연결할 수 없습니다."));
  }, [isAdmin]);

  useEffect(() => {
    if (selectedFileId) {
      void loadChatHistory();
    } else {
      setAnswer("");
      setSources([]);
      setChatHistory([]);
      setHistoryStatus("");
      setQueryStatus("");
    }
  }, [selectedFileId]);

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
    if (!selectedFile) {
      setQueryStatus("먼저 문서 관리에서 분석할 문서를 선택해주세요.");
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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: trimmedQuestion, file_id: selectedFile.file_id }),
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

  if (!selectedFile) {
    return (
      <section className="rounded-3xl border border-[#E9D8BD] bg-white p-6 text-center shadow-[0_14px_34px_rgba(124,82,27,0.07)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF3E5] text-coral">
          <FileText size={26} />
        </div>
        <h2 className="mt-5 text-2xl font-black text-[#2F2418]">문서 기반 질문/답변</h2>
        <p className="mt-3 text-sm font-bold leading-6 text-[#6F5A40]">
          먼저 문서 관리에서 분석할 문서를 선택해주세요.
        </p>
        <button
          type="button"
          onClick={onOpenDocuments}
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#2F2418] px-5 text-sm font-black text-white transition hover:bg-black"
        >
          문서 관리로 이동
        </button>
      </section>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wide text-coral">Selected Document</span>
          <h2 className="text-2xl font-black text-ink [overflow-wrap:anywhere]">{selectedFile.filename}</h2>
          <p className="text-sm leading-6 text-neutral-500">
            이 문서를 기준으로 AI 채팅을 진행합니다. 다른 문서를 사용하려면 문서 관리에서 선택을 변경해주세요.
          </p>
        </div>

        <div className="mt-5 grid gap-3 text-sm font-bold text-neutral-700">
          <InfoRow label="파일 ID" value={selectedFile.file_id} />
          <InfoRow label="업로드 날짜" value={formatFileDate(selectedFile)} />
          <InfoRow label="문서 정보" value={`${selectedFile.chunk_count ?? "-"} chunks · ${selectedFile.text_length ?? "-"} chars`} />
        </div>

        <button
          type="button"
          onClick={onOpenDocuments}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D9B16A] bg-[#FFFDF8] px-4 text-sm font-black text-[#7A4A12] transition hover:bg-[#F8E8C7]"
        >
          문서 관리로 이동
        </button>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wide text-coral">Document Q&A</span>
          <h2 className="text-2xl font-black text-ink">문서 기반 질문/답변</h2>
          <p className="text-sm leading-6 text-neutral-500">선택한 문서의 내용만 바탕으로 질문에 답변합니다.</p>
        </div>

        <form className="mt-5 grid gap-3" onSubmit={handleAsk}>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="선택한 문서에 대해 질문하세요."
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-2xl border border-[#EAD8C1] bg-[#FFFDF8] px-4 py-3">
      <span className="text-xs font-black uppercase tracking-wide text-[#8A7354]">{label}</span>
      <span className="break-words text-[#2F2418]">{value}</span>
    </div>
  );
}
