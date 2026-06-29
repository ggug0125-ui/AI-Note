"use client";

import { useEffect, useState } from "react";
import { ClipboardList, History, Sparkles, Trash2 } from "lucide-react";
import { WorkspaceEmptyState } from "./ai-workspace/WorkspaceEmptyState";
import { WorkspaceLoadingState } from "./ai-workspace/WorkspaceLoadingState";
import { WorkspaceOptionButton } from "./ai-workspace/WorkspaceOptionButton";
import { WorkspaceResultPanel } from "./ai-workspace/WorkspaceResultPanel";
import { WorkspaceSection } from "./ai-workspace/WorkspaceSection";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";

type UploadedFile = {
  file_id: string;
  filename: string;
  created_at?: string;
  uploaded_at?: string;
};

type SummaryType = "핵심 요약" | "회의록 요약" | "보고서 요약" | "액션아이템";

type SummaryHistoryItem = {
  summary_type: SummaryType;
  summary: string;
  created_at?: string;
};

const summaryModes: SummaryType[] = ["핵심 요약", "회의록 요약", "보고서 요약", "액션아이템"];

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
  if (message.includes("Uploaded PDF file is missing")) {
    return "업로드된 PDF 파일을 찾지 못했습니다. 해당 문서를 다시 업로드해주세요.";
  }
  if (message.includes("OPENAI_API_KEY")) {
    return "AI 요약을 생성하려면 서버의 OpenAI API 키 설정이 필요합니다.";
  }
  return message || fallback;
}

export function Summary() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [selectedMode, setSelectedMode] = useState<SummaryType>("핵심 요약");
  const [summary, setSummary] = useState("");
  const [history, setHistory] = useState<SummaryHistoryItem[]>([]);
  const [status, setStatus] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState("");

  async function loadFiles() {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/files`);
      if (!response.ok) {
        throw new Error("파일 목록을 불러오지 못했습니다.");
      }
      const data = await response.json();
      const nextFiles = sortFilesByLatest(data.files ?? []);
      setFiles(nextFiles);
      setSelectedFileId((current) => (
        nextFiles.some((file: UploadedFile) => file.file_id === current)
          ? current
          : nextFiles[0]?.file_id || ""
      ));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "파일 목록을 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    if (selectedFileId) {
      loadHistory();
    } else {
      setHistory([]);
    }
  }, [selectedFileId]);

  async function loadHistory() {
    if (!selectedFileId) {
      setHistoryStatus("문서를 먼저 선택해주세요.");
      return;
    }

    setIsHistoryLoading(true);
    setHistoryStatus("요약 이력을 불러오는 중입니다...");

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/results/${selectedFileId}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail ?? "요약 이력을 불러오지 못했습니다.");
      }
      const data = await response.json();
      setHistory(data.summaries ?? []);
      setHistoryStatus("");
    } catch (error) {
      setHistoryStatus(error instanceof Error ? error.message : "요약 이력을 불러오지 못했습니다.");
    } finally {
      setIsHistoryLoading(false);
    }
  }

  async function handleSummary(mode: SummaryType) {
    setSelectedMode(mode);

    if (!selectedFileId) {
      setStatus("문서를 먼저 선택해주세요.");
      return;
    }

    setIsLoading(true);
    setStatus(`${mode} 생성 중입니다...`);
    setSummary("");

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          file_id: selectedFileId,
          summary_type: mode
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail ?? "요약 생성에 실패했습니다.");
      }

      const data = await response.json();
      setSummary(data.summary ?? "");
      setStatus("");
      await loadHistory();
    } catch (error) {
      setStatus(getAssistantErrorMessage(error, "요약 생성에 실패했습니다."));
    } finally {
      setIsLoading(false);
    }
  }

  function handleDeleteSummary(item: SummaryHistoryItem) {
    const recordId = item.created_at || "";
    if (!recordId) {
      setHistoryStatus("삭제할 요약 이력 정보를 찾지 못했습니다.");
      return;
    }

    const didConfirm = window.confirm("이 요약 이력을 삭제할까요? 같은 문서의 관련 AI 기록도 함께 삭제될 수 있습니다.");
    if (!didConfirm) {
      return;
    }

    setDeletingRecordId(recordId);
    setHistoryStatus("요약 이력 삭제 API 연결 예정입니다.");
    window.setTimeout(() => setDeletingRecordId(""), 300);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <WorkspaceSection>
        <div className="ai-modal-icon h-12 w-12 rounded-xl">
          <Sparkles size={24} />
        </div>
        <h2 className="mt-5 text-2xl font-black text-ink">AI 자동 요약</h2>
        <p className="mt-3 text-sm leading-7 text-neutral-600">문서 전체를 읽고 목적에 맞는 요약 결과를 생성합니다.</p>

        <label className="mt-6 grid gap-2 text-sm font-bold text-neutral-700">
          요약할 문서
          <select
            value={selectedFileId}
            onChange={(event) => setSelectedFileId(event.target.value)}
            className="ai-select min-h-12 rounded-xl px-4"
          >
            <option value="">문서를 선택해주세요</option>
            {files.map((file) => (
              <option key={file.file_id} value={file.file_id}>
                {getFileOptionLabel(file)}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {summaryModes.map((mode) => (
            <WorkspaceOptionButton
              key={mode}
              isSelected={selectedMode === mode}
              disabled={isLoading}
              onClick={() => handleSummary(mode)}
            >
              {mode}
            </WorkspaceOptionButton>
          ))}
        </div>
        <button
          type="button"
          onClick={loadHistory}
          disabled={isHistoryLoading}
          className="ai-btn ai-btn-ghost mt-4 min-h-11 rounded-xl px-4 text-sm"
        >
          <History className="mr-2" size={16} />
          {isHistoryLoading ? "불러오는 중" : "히스토리 보기"}
        </button>
        {status && <WorkspaceLoadingState message={status} isLoading={isLoading} />}
        {historyStatus && (
          <WorkspaceLoadingState message={historyStatus} isLoading={isHistoryLoading} className="mt-2" />
        )}
      </WorkspaceSection>

      <div className="ai-card p-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="text-coral" size={22} />
          <h3 className="text-xl font-black text-ink">요약 결과</h3>
        </div>
        <WorkspaceResultPanel>
          <p className="whitespace-pre-wrap text-sm leading-8 text-neutral-700">{summary || "요약 결과가 여기에 표시됩니다."}</p>
        </WorkspaceResultPanel>

        <div className="mt-6">
          <h4 className="text-sm font-black text-ink">요약 이력</h4>
          <div className="mt-3 grid max-h-[min(52vh,36rem)] gap-3 overflow-y-auto overscroll-contain pr-1 [scrollbar-color:var(--ai-color-border)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--ai-color-border)] [&::-webkit-scrollbar-track]:bg-transparent">
            {history.length === 0 ? (
              <WorkspaceEmptyState>저장된 요약 이력이 없습니다.</WorkspaceEmptyState>
            ) : (
              history.map((item, index) => (
                <article key={`${item.created_at ?? "summary"}-${index}`} className="ai-panel-compact bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <strong className="text-sm text-ink">{item.summary_type}</strong>
                      <span className="ai-badge ai-badge-info mt-2">{item.created_at ? new Date(item.created_at).toLocaleString() : "-"}</span>
                    </div>
                    <button
                      type="button"
                      aria-label="요약 이력 삭제"
                      title="요약 이력 삭제"
                      disabled={!item.created_at || deletingRecordId === item.created_at}
                      onClick={() => handleDeleteSummary(item)}
                      className="ai-icon-btn h-8 w-8 text-red-700 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-7 text-neutral-700">{item.summary}</p>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
