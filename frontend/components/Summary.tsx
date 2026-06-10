"use client";

import { useEffect, useState } from "react";
import { ClipboardList, History, Sparkles } from "lucide-react";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";

type UploadedFile = {
  file_id: string;
  filename: string;
};

type SummaryType = "핵심 요약" | "회의록 요약" | "보고서 요약" | "액션아이템";

type SummaryHistoryItem = {
  summary_type: SummaryType;
  summary: string;
  created_at?: string;
};

const summaryModes: SummaryType[] = ["핵심 요약", "회의록 요약", "보고서 요약", "액션아이템"];

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

  async function loadFiles() {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/files`);
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
      setStatus(error instanceof Error ? error.message : "요약 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coral/10 text-coral">
          <Sparkles size={24} />
        </div>
        <h2 className="mt-5 text-2xl font-black text-ink">AI 자동 요약</h2>
        <p className="mt-3 text-sm leading-7 text-neutral-600">문서 전체를 읽고 목적에 맞는 요약 결과를 생성합니다.</p>

        <label className="mt-6 grid gap-2 text-sm font-bold text-neutral-700">
          요약할 문서
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

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {summaryModes.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleSummary(mode)}
              disabled={isLoading}
              className={[
                "min-h-14 rounded-xl border px-4 text-left text-sm font-extrabold transition disabled:opacity-50",
                selectedMode === mode ? "border-coral bg-coral/10 text-ink" : "border-black/10 bg-neutral-50 text-neutral-700 hover:border-coral/50 hover:bg-white"
              ].join(" ")}
            >
              {mode}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={loadHistory}
          disabled={isHistoryLoading}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-neutral-100 px-4 text-sm font-black text-ink transition hover:bg-neutral-200 disabled:opacity-50"
        >
          <History className="mr-2" size={16} />
          {isHistoryLoading ? "불러오는 중" : "히스토리 보기"}
        </button>
        {status && <p className="mt-4 text-sm font-semibold text-neutral-600">{status}</p>}
        {historyStatus && <p className="mt-2 text-sm font-semibold text-neutral-600">{historyStatus}</p>}
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <ClipboardList className="text-coral" size={22} />
          <h3 className="text-xl font-black text-ink">요약 결과</h3>
        </div>
        <div className="mt-5 min-h-72 rounded-2xl bg-[#F5F2EC] p-5">
          <p className="whitespace-pre-wrap text-sm leading-8 text-neutral-700">{summary || "요약 결과가 여기에 표시됩니다."}</p>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-black text-ink">요약 이력</h4>
          <div className="mt-3 grid gap-3">
            {history.length === 0 ? (
              <p className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">저장된 요약 이력이 없습니다.</p>
            ) : (
              history.map((item, index) => (
                <article key={`${item.created_at ?? "summary"}-${index}`} className="rounded-2xl border border-black/5 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm text-ink">{item.summary_type}</strong>
                    <span className="text-xs font-bold text-neutral-500">{item.created_at ? new Date(item.created_at).toLocaleString() : "-"}</span>
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
