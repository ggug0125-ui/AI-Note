"use client";

import { useEffect, useState } from "react";
import { Hash, History, Tags } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

type UploadedFile = {
  file_id: string;
  filename: string;
};

type KeywordHistoryItem = {
  count: number;
  scope: string;
  keywords: string[];
  topics: string[];
  created_at?: string;
};


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
      const response = await fetch(`${API_BASE_URL}/files`);
      if (!response.ok) {
        throw new Error("파일 목록을 불러오지 못했습니다.");
      }
      const data = await response.json();
      const nextFiles = data.files ?? [];
      setFiles(nextFiles);
      setSelectedFileId((current) => current || nextFiles[0]?.file_id || "");
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
      const response = await fetch(`${API_BASE_URL}/results/${selectedFileId}`);
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
      const response = await fetch(`${API_BASE_URL}/keywords`, {
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
      setStatus(error instanceof Error ? error.message : "키워드 추출에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coral/10 text-coral">
          <Tags size={24} />
        </div>
        <h2 className="mt-5 text-2xl font-black text-ink">키워드 추출</h2>
        <p className="mt-3 text-sm leading-7 text-neutral-600">문서에서 핵심 키워드와 상위 토픽을 추출해 검색과 분류에 활용합니다.</p>

        <div className="mt-6">
          <h3 className="text-sm font-black text-ink">키워드</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {keywords.length === 0 ? (
              <span className="rounded-full border border-black/10 bg-neutral-50 px-4 py-2 text-sm font-bold text-neutral-500">추출 결과가 여기에 표시됩니다.</span>
            ) : (
              keywords.map((keyword) => (
                <span key={keyword} className="rounded-full border border-black/10 bg-neutral-50 px-4 py-2 text-sm font-bold text-neutral-700">
                  {keyword}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-black text-ink">토픽</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {topics.length === 0 ? (
              <span className="rounded-full bg-coral/10 px-4 py-2 text-sm font-bold text-coral">토픽 대기 중</span>
            ) : (
              topics.map((topic) => (
                <span key={topic} className="rounded-full bg-coral/10 px-4 py-2 text-sm font-bold text-coral">
                  {topic}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-black text-ink">추출 이력</h3>
          <div className="mt-3 grid gap-3">
            {history.length === 0 ? (
              <p className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">저장된 키워드 이력이 없습니다.</p>
            ) : (
              history.map((item, index) => (
                <article key={`${item.created_at ?? "keyword"}-${index}`} className="rounded-2xl border border-black/5 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm text-ink">{item.scope}</strong>
                    <span className="text-xs font-bold text-neutral-500">{item.created_at ? new Date(item.created_at).toLocaleString() : "-"}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.keywords.map((keyword) => (
                      <span key={`${item.created_at}-${keyword}`} className="rounded-full bg-neutral-50 px-3 py-1 text-xs font-bold text-neutral-700">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Hash className="text-coral" size={22} />
          <h3 className="text-xl font-black text-ink">추출 설정</h3>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-neutral-700">
            분석할 문서
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
          <label className="grid gap-2 text-sm font-bold text-neutral-700">
            키워드 개수: {count}
            <input type="range" min="5" max="30" value={count} onChange={(event) => setCount(Number(event.target.value))} className="accent-coral" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-neutral-700">
            분석 범위
            <select value={scope} onChange={(event) => setScope(event.target.value)} className="min-h-12 rounded-xl border border-black/10 bg-white px-4 outline-none focus:border-coral">
              <option>전체 문서</option>
              <option>선택한 페이지</option>
              <option>최근 업로드 문서</option>
            </select>
          </label>
          <button type="button" onClick={handleExtract} disabled={isLoading} className="min-h-12 rounded-xl bg-ink px-5 text-sm font-black text-white disabled:opacity-50">
            {isLoading ? "추출 중" : "키워드 추출"}
          </button>
          <button
            type="button"
            onClick={loadHistory}
            disabled={isHistoryLoading}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-neutral-100 px-5 text-sm font-black text-ink transition hover:bg-neutral-200 disabled:opacity-50"
          >
            <History className="mr-2" size={16} />
            {isHistoryLoading ? "불러오는 중" : "히스토리 보기"}
          </button>
          {status && <p className="text-sm font-semibold text-neutral-600">{status}</p>}
          {historyStatus && <p className="text-sm font-semibold text-neutral-600">{historyStatus}</p>}
        </div>
      </div>
    </section>
  );
}
