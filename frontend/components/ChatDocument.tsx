"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  FileText,
  History,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
} from "lucide-react";
import { WorkspaceEmptyState } from "./ai-workspace/WorkspaceEmptyState";
import { WorkspaceLoadingState } from "./ai-workspace/WorkspaceLoadingState";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";

type UploadedFile = {
  file_id: string;
  filename: string;
  upload_path?: string;
  created_at?: string;
  uploaded_at?: string;
  status?: string;
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

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  created_at?: string;
};

type ChatDocumentProps = {
  isAdmin?: boolean;
  selectedFileId: string;
  onOpenDocuments: () => void;
};

const quickPrompts = [
  "이 문서 핵심만 요약해줘",
  "중요한 키워드를 뽑아줘",
  "보고서용으로 정리해줘",
  "위험 요소나 주의점을 알려줘",
];

function getFileTimestamp(file: UploadedFile) {
  return file.created_at || file.uploaded_at || "";
}

function sortFilesByLatest(files: UploadedFile[]) {
  return [...files].sort((a, b) => {
    const aTimestamp = getFileTimestamp(a);
    const bTimestamp = getFileTimestamp(b);

    if (!aTimestamp && !bTimestamp) {
      return 0;
    }
    if (!aTimestamp) {
      return 1;
    }
    if (!bTimestamp) {
      return -1;
    }

    return bTimestamp.localeCompare(aTimestamp);
  });
}

function formatDate(timestamp?: string) {
  if (!timestamp) {
    return "날짜 없음";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  const day = date
    .toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\.\s?/g, ".")
    .replace(/\.$/, "");
  const time = date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return `${day} ${time}`;
}

function formatFileDate(file: UploadedFile) {
  return formatDate(getFileTimestamp(file));
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

function getSourceMeta(source: Source, index: number) {
  const metadata = source.metadata ?? {};
  const filename = String(metadata.filename ?? metadata.file_name ?? metadata.file ?? "선택한 문서");
  const page = metadata.page ?? metadata.page_number ?? metadata.page_index;
  const chunk = metadata.chunk_index;
  const pageLabel = typeof page === "number" ? `${page}페이지` : typeof page === "string" ? `${page}페이지` : "";
  const chunkLabel = typeof chunk === "number" ? `참고 구간 ${chunk + 1}` : "";

  return {
    title: `Source ${index + 1}`,
    filename,
    detail: [pageLabel, chunkLabel].filter(Boolean).join(" / "),
  };
}

function getFileStatusLabel(status?: string) {
  if (!status) {
    return "";
  }

  const normalized = status.toLowerCase();
  if (normalized === "completed" || normalized === "done" || normalized === "ready") {
    return "분석 완료";
  }
  if (normalized === "processing" || normalized === "pending") {
    return "분석 중";
  }
  if (normalized === "failed" || normalized === "error") {
    return "오류";
  }
  return status;
}

export function ChatDocument({ isAdmin = true, selectedFileId, onOpenDocuments }: ChatDocumentProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [activeFileId, setActiveFileId] = useState(selectedFileId);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [queryStatus, setQueryStatus] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const selectedFile = useMemo(
    () => files.find((file) => file.file_id === activeFileId) || null,
    [files, activeFileId],
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

  async function loadChatHistory(fileId = activeFileId) {
    if (!isAdmin) {
      setHistoryStatus("관리자 전용 기능입니다.");
      return;
    }

    if (!fileId) {
      setHistoryStatus("먼저 문서 관리에서 분석할 문서를 선택해주세요.");
      return;
    }

    setIsHistoryLoading(true);
    setHistoryStatus("질문 이력을 불러오는 중입니다...");

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/results/${fileId}`);
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
    setActiveFileId(selectedFileId);
  }, [selectedFileId]);

  useEffect(() => {
    if (!isAdmin) {
      setQueryStatus("관리자 전용 기능입니다.");
      return;
    }

    loadFiles().catch(() => setQueryStatus("백엔드 서버에 연결할 수 없습니다."));
  }, [isAdmin]);

  useEffect(() => {
    if (activeFileId) {
      setAnswer("");
      setSources([]);
      setMessages([]);
      void loadChatHistory(activeFileId);
    } else {
      setAnswer("");
      setSources([]);
      setMessages([]);
      setChatHistory([]);
      setHistoryStatus("");
      setQueryStatus("");
    }
  }, [activeFileId]);

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
    setQueryStatus("AI가 문서를 읽고 답변을 작성 중입니다...");
    setAnswer("");
    setSources([]);
    setMessages((current) => [...current, { role: "user", content: trimmedQuestion }]);

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
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: result.answer,
          sources: result.sources ?? [],
        },
      ]);
      setQuestion("");
      setQueryStatus("");
      await loadChatHistory(selectedFile.file_id);
    } catch (error) {
      setQueryStatus(getAssistantErrorMessage(error, "질문 처리에 실패했습니다."));
    } finally {
      setIsAsking(false);
    }
  }

  function handleHistoryClick(item: ChatHistoryItem) {
    setMessages([
      { role: "user", content: item.question, created_at: item.created_at },
      { role: "assistant", content: item.answer, sources: item.sources ?? [], created_at: item.created_at },
    ]);
    setAnswer(item.answer);
    setSources(item.sources ?? []);
  }

  function handleFileSelect(fileId: string) {
    setActiveFileId(fileId);
    setQuestion("");
    setQueryStatus("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
      <aside className="ai-card p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wide text-primary">Documents</span>
            <h2 className="mt-2 text-xl font-black text-[var(--ai-color-text-primary)]">문서 목록</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-[var(--ai-color-text-secondary)]">
              최근 업로드된 문서부터 표시됩니다.
            </p>
          </div>
          <button type="button" onClick={onOpenDocuments} className="ai-icon-btn" aria-label="문서 관리로 이동">
            <FileText size={18} />
          </button>
        </div>

        <div className="mt-4 grid max-h-[30rem] gap-2 overflow-y-auto pr-1 [scrollbar-color:var(--ai-color-border)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--ai-color-border)] [&::-webkit-scrollbar-track]:bg-transparent">
          {files.length === 0 ? (
            <WorkspaceEmptyState icon={<FileText size={16} />}>업로드된 문서가 없습니다.</WorkspaceEmptyState>
          ) : (
            files.map((file) => {
              const isSelected = activeFileId === file.file_id;
              const statusLabel = getFileStatusLabel(file.status);

              return (
                <button
                  key={file.file_id}
                  type="button"
                  onClick={() => handleFileSelect(file.file_id)}
                  className={[
                    "ai-card ai-card-hover cursor-pointer p-3 text-left",
                    isSelected ? "ai-card-selected" : "",
                  ].filter(Boolean).join(" ")}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 break-words text-sm font-black text-[var(--ai-color-text-primary)]">
                        {file.filename}
                      </h3>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold leading-5 text-[var(--ai-color-text-secondary)]">
                        <CalendarDays size={13} />
                        {formatFileDate(file)}
                      </p>
                    </div>
                    {isSelected && <CheckCircle2 className="shrink-0 text-primary" size={19} aria-hidden="true" />}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {statusLabel && <span className="ai-badge ai-badge-info px-2 py-1">{statusLabel}</span>}
                    {isSelected && <span className="ai-badge ai-badge-primary px-2 py-1">선택됨</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="ai-card flex min-h-[42rem] flex-col p-5 md:p-6">
        <div className="ai-panel-compact flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {selectedFile ? (
            <div className="min-w-0">
              <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-primary">
                <FileText size={15} />
                현재 문서
              </span>
              <h2 className="mt-2 break-words text-xl font-black text-[var(--ai-color-text-primary)]">
                {selectedFile.filename}
              </h2>
              <p className="mt-2 text-sm font-bold text-[var(--ai-color-text-secondary)]">
                {formatFileDate(selectedFile)}
                {getFileStatusLabel(selectedFile.status) ? ` / ${getFileStatusLabel(selectedFile.status)}` : ""}
              </p>
            </div>
          ) : (
            <div>
              <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-primary">
                <FileText size={15} />
                현재 문서
              </span>
              <h2 className="mt-2 text-xl font-black text-[var(--ai-color-text-primary)]">선택된 문서가 없습니다</h2>
              <p className="mt-2 text-sm font-bold text-[var(--ai-color-text-secondary)]">
                먼저 문서 관리에서 분석할 문서를 선택해주세요.
              </p>
            </div>
          )}
          <button type="button" onClick={onOpenDocuments} className="ai-btn ai-btn-secondary shrink-0">
            문서 관리로 이동
          </button>
        </div>

        <div className="mt-5 flex-1 overflow-hidden rounded-[1.25rem] border border-[var(--ai-color-border)] bg-[var(--ai-color-background)]">
          <div className="flex h-full max-h-[36rem] min-h-[22rem] flex-col gap-4 overflow-y-auto p-4 md:p-5 [scrollbar-color:var(--ai-color-border)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--ai-color-border)] [&::-webkit-scrollbar-track]:bg-transparent">
            {!selectedFile ? (
              <div className="flex min-h-[18rem] items-center justify-center">
                <div className="max-w-md text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-primary">
                    <MessageSquareText size={26} />
                  </div>
                  <h3 className="mt-5 text-xl font-black text-[var(--ai-color-text-primary)]">문서를 선택해주세요</h3>
                  <p className="mt-3 text-sm font-bold leading-6 text-[var(--ai-color-text-secondary)]">
                    먼저 문서 관리에서 분석할 문서를 선택해주세요.
                  </p>
                  <button type="button" onClick={onOpenDocuments} className="ai-btn ai-btn-active mt-5">
                    문서 관리로 이동
                  </button>
                </div>
              </div>
            ) : messages.length === 0 && !isAsking ? (
              <div className="flex min-h-[18rem] items-center justify-center">
                <div className="max-w-xl text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-primary">
                    <Sparkles size={26} />
                  </div>
                  <h3 className="mt-5 text-xl font-black text-[var(--ai-color-text-primary)]">문서에 대해 질문해보세요</h3>
                  <p className="mt-3 text-sm font-bold leading-6 text-[var(--ai-color-text-secondary)]">
                    선택한 문서 내용을 기반으로 답변합니다.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <ChatBubble key={`${message.role}-${index}-${message.created_at ?? ""}`} message={message} />
              ))
            )}

            {isAsking && (
              <div className="flex justify-start">
                <div className="max-w-[88%] rounded-3xl rounded-bl-md border border-border bg-card px-4 py-3 shadow-sm md:max-w-[76%]">
                  <div className="flex items-center gap-3 text-sm font-black text-[var(--ai-color-text-primary)]">
                    <Loader2 className="animate-spin text-primary" size={17} />
                    AI가 문서를 읽고 답변을 작성 중입니다...
                  </div>
                  <div className="mt-3 flex gap-1.5" aria-hidden="true">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:120ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:240ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-stretch gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setQuestion(prompt)}
                disabled={!selectedFile || isAsking}
                className="ai-btn ai-btn-ghost min-h-10 max-w-full flex-auto px-4 py-2 text-xs sm:flex-none"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form className="mt-4 grid gap-3" onSubmit={handleAsk}>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="선택한 문서에 대해 질문하세요."
              rows={4}
              disabled={!selectedFile || isAsking}
              className="ai-textarea min-h-28"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="submit" disabled={!canAsk} className="ai-btn ai-btn-primary min-h-12 px-5">
                <Send size={18} />
                {isAsking ? "질문 중" : "질문하기"}
              </button>
              <button
                type="button"
                onClick={() => void loadChatHistory()}
                disabled={!selectedFile || isHistoryLoading}
                className="ai-btn ai-btn-secondary min-h-12 px-5"
              >
                <History size={18} />
                {isHistoryLoading ? "불러오는 중" : "최근 대화 새로고침"}
              </button>
            </div>
          </form>

          {queryStatus && <WorkspaceLoadingState message={queryStatus} isLoading={isAsking} />}
          {historyStatus && (
            <WorkspaceLoadingState message={historyStatus} isLoading={isHistoryLoading} className="mt-2" />
          )}
        </div>

        <div className="mt-6 grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-[var(--ai-color-text-primary)]">최근 대화 기록</h3>
            <span className="ai-badge">{chatHistory.length}개</span>
          </div>
          {chatHistory.length === 0 ? (
            <WorkspaceEmptyState icon={<History size={16} />}>저장된 질문 이력이 없습니다.</WorkspaceEmptyState>
          ) : (
            <div className="grid max-h-64 gap-3 overflow-y-auto pr-1 [scrollbar-color:var(--ai-color-border)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--ai-color-border)] [&::-webkit-scrollbar-track]:bg-transparent">
              {chatHistory.map((item, index) => (
                <button
                  key={`${item.created_at ?? "chat"}-${index}`}
                  type="button"
                  onClick={() => handleHistoryClick(item)}
                  className="ai-panel-compact text-left transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="line-clamp-2 break-words text-sm text-[var(--ai-color-text-primary)]">
                      {item.question}
                    </strong>
                    <span className="ai-badge ai-badge-info">{formatDate(item.created_at)}</span>
                  </div>
                  <p className="mt-3 line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-[var(--ai-color-text-secondary)]">
                    {item.answer}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={["flex", isUser ? "justify-end" : "justify-start"].join(" ")}>
      <div
        className={[
          "max-w-[88%] whitespace-pre-wrap break-words px-4 py-3 text-sm leading-7 shadow-sm md:max-w-[76%]",
          isUser
            ? "rounded-3xl rounded-br-md bg-[var(--ai-color-active)] text-white"
            : "rounded-3xl rounded-bl-md border border-border bg-card text-title",
        ].join(" ")}
      >
        <p>{message.content}</p>
        {!isUser && message.sources && message.sources.length > 0 && <SourceList sources={message.sources} />}
      </div>
    </div>
  );
}

function SourceList({ sources }: { sources: Source[] }) {
  return (
    <div className="mt-3 grid gap-1.5 border-t border-[var(--ai-color-border)] pt-2.5">
      <h4 className="text-xs font-black uppercase tracking-wide text-primary">참고 출처</h4>
      {sources.map((source, index) => {
        const meta = getSourceMeta(source, index);

        return (
          <article key={`${meta.filename}-${index}`} className="rounded-2xl border border-border bg-panel p-2.5">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-black text-[var(--ai-color-text-primary)]">
              <span className="ai-badge ai-badge-info px-2 py-1">{meta.title}</span>
              <span className="break-words">{meta.filename}</span>
              {meta.detail && <span className="text-[var(--ai-color-text-secondary)]">{meta.detail}</span>}
            </div>
            <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap text-xs leading-5 text-[var(--ai-color-text-secondary)]">
              {source.text}
            </p>
          </article>
        );
      })}
    </div>
  );
}
