"use client";

import { useEffect, useState } from "react";
import { Hash, History, Tags } from "lucide-react";
import { WorkspaceEmptyState } from "./ai-workspace/WorkspaceEmptyState";
import { WorkspaceLoadingState } from "./ai-workspace/WorkspaceLoadingState";
import { WorkspaceSection } from "./ai-workspace/WorkspaceSection";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";

type UploadedFile = {
  file_id: string;
  filename: string;
  created_at?: string;
  uploaded_at?: string;
};

type KeywordHistoryItem = {
  count: number;
  scope: string;
  keywords: string[];
  topics: string[];
  created_at?: string;
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
    return "AI 키워드 추출을 실행하려면 서버의 OpenAI API 키 설정이 필요합니다.";
  }
  return message || fallback;
}

function sanitizeKeywordList(items: string[] = []) {
  const seen = new Set<string>();
  const sanitized: string[] = [];

  items.forEach((item) => {
    String(item ?? "")
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .replace(/["']?(keywords|topics)["']?\s*:/gi, "")
      .replace(/[{}\[\]]/g, ",")
      .split(/[\n,]/)
      .map((part) => (
        part
          .trim()
          .replace(/^[\s"',:]+|[\s"',:]+$/g, "")
          .trim()
      ))
      .filter((part) => part && !/^[\s"',:{}\[\]]+$/.test(part))
      .forEach((part) => {
        const key = part.toLocaleLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          sanitized.push(part);
        }
      });
  });

  return sanitized;
}

export function KeywordExtract() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [count, setCount] = useState(12);
  const [scope, setScope] = useState("전체 문서");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [history, setHistory] = useState<KeywordHistoryItem[]>([]);
  const [status, setStatus] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

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
    setHistoryStatus("키워드 이력을 불러오는 중입니다...");

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/results/${selectedFileId}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail ?? "키워드 이력을 불러오지 못했습니다.");
      }
      const data = await response.json();
      setHistory(data.keywords ?? []);
      setHistoryStatus("");
    } catch (error) {
      setHistoryStatus(error instanceof Error ? error.message : "키워드 이력을 불러오지 못했습니다.");
    } finally {
      setIsHistoryLoading(false);
    }
  }

  async function handleExtract() {
    if (!selectedFileId) {
      setStatus("문서를 먼저 선택해주세요.");
      return;
    }

    setIsLoading(true);
    setStatus("키워드를 추출하는 중입니다...");
    setKeywords([]);
    setTopics([]);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/keywords`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          file_id: selectedFileId,
          count,
          scope
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail ?? "키워드 추출에 실패했습니다.");
      }

      const data = await response.json();
      setKeywords(data.keywords ?? []);
      setTopics(data.topics ?? []);
      setStatus("");
      await loadHistory();
    } catch (error) {
      setStatus(getAssistantErrorMessage(error, "키워드 추출에 실패했습니다."));
    } finally {
      setIsLoading(false);
    }
  }

  const displayKeywords = sanitizeKeywordList(keywords);
  const displayTopics = sanitizeKeywordList(topics);

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <WorkspaceSection>
        <div className="ai-modal-icon h-12 w-12 rounded-xl">
          <Tags size={24} />
        </div>
        <h2 className="mt-5 text-2xl font-black text-title">키워드 추출</h2>
        <p className="mt-3 text-sm leading-7 text-body">문서에서 핵심 키워드와 상위 토픽을 추출해 검색과 분류에 활용합니다.</p>

        <div className="mt-6">
          <h3 className="text-sm font-black text-title">키워드</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {displayKeywords.length === 0 ? (
              <WorkspaceEmptyState icon={<Tags size={16} />} className="w-full">
                추출 결과가 여기에 표시됩니다.
              </WorkspaceEmptyState>
            ) : (
              displayKeywords.map((keyword) => (
                <span key={keyword} className="ai-badge ai-badge-info max-w-full px-4 py-2 text-sm transition hover:-translate-y-0.5 [overflow-wrap:anywhere]">
                  {keyword}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-black text-title">토픽</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {displayTopics.length === 0 ? (
              <WorkspaceEmptyState icon={<Hash size={16} />} className="w-full">
                토픽 대기 중
              </WorkspaceEmptyState>
            ) : (
              displayTopics.map((topic) => (
                <span key={topic} className="ai-badge ai-badge-primary max-w-full px-4 py-2 text-sm transition hover:-translate-y-0.5 [overflow-wrap:anywhere]">
                  {topic}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-black text-title">추출 이력</h3>
          <div className="mt-3 grid gap-3">
            {history.length === 0 ? (
              <WorkspaceEmptyState icon={<History size={16} />}>
                저장된 키워드 이력이 없습니다.
              </WorkspaceEmptyState>
            ) : (
              history.map((item, index) => (
                <article key={`${item.created_at ?? "keyword"}-${index}`} className="ai-panel-compact bg-panel p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm text-title">{item.scope}</strong>
                    <span className="ai-badge ai-badge-info">{item.created_at ? new Date(item.created_at).toLocaleString() : "-"}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sanitizeKeywordList(item.keywords).map((keyword) => (
                      <span key={`${item.created_at}-${keyword}`} className="ai-badge max-w-full px-3 py-1 [overflow-wrap:anywhere]">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </WorkspaceSection>

      <div className="ai-card p-6">
        <div className="flex items-center gap-3">
          <Hash className="text-primary" size={22} />
          <h3 className="text-xl font-black text-title">추출 설정</h3>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-body">
            분석할 문서
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
          <label className="grid gap-2 text-sm font-bold text-body">
            키워드 개수: {count}
            <input type="range" min="5" max="30" value={count} onChange={(event) => setCount(Number(event.target.value))} className="accent-coral" aria-label="키워드 개수" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-body">
            분석 범위
            <select value={scope} onChange={(event) => setScope(event.target.value)} className="ai-select min-h-12 rounded-xl px-4">
              <option>전체 문서</option>
              <option>선택한 페이지</option>
              <option>최근 업로드 문서</option>
            </select>
          </label>
          <button type="button" onClick={handleExtract} disabled={isLoading} aria-label="키워드 추출" className="ai-btn ai-btn-primary min-h-12 rounded-xl px-5 text-sm">
            {isLoading ? "추출 중" : "키워드 추출"}
          </button>
          <button
            type="button"
            onClick={loadHistory}
            disabled={isHistoryLoading}
            aria-label="키워드 히스토리 보기"
            className="ai-btn ai-btn-ghost min-h-12 rounded-xl px-5 text-sm"
          >
            <History className="mr-2" size={16} />
            {isHistoryLoading ? "불러오는 중" : "히스토리 보기"}
          </button>
          {status && <WorkspaceLoadingState message={status} isLoading={isLoading} className="mt-0" />}
          {historyStatus && (
            <WorkspaceLoadingState message={historyStatus} isLoading={isHistoryLoading} className="mt-0" />
          )}
        </div>
      </div>
    </section>
  );
}
