"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, FileSearch, Gauge, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";

type AnalysisItem = {
  file_id: string;
  filename: string;
  text_length: number;
  chunk_count: number;
  uploaded_at?: string;
  status: string;
};


const checks = ["문서 텍스트 추출", "문서 길이와 청크 수 계산", "청크 기반 검색 인덱스", "분석 결과 재조회"];

export function PdfAnalysis() {
  const [items, setItems] = useState<AnalysisItem[]>([]);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState("");

  const totalChunks = useMemo(() => items.reduce((sum, item) => sum + (item.chunk_count ?? 0), 0), [items]);
  const totalTextLength = useMemo(() => items.reduce((sum, item) => sum + (item.text_length ?? 0), 0), [items]);

  async function loadAnalysis() {
    setIsLoading(true);
    setStatus("문서 분석 정보를 불러오는 중입니다...");

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/analysis`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail ?? "분석 정보를 불러오지 못했습니다.");
      }

      const data = await response.json();
      setItems(data.analysis ?? []);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "분석 정보를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAnalysis();
  }, []);

  async function handleDeleteFile(item: AnalysisItem) {
    const confirmed = window.confirm(
      `${item.filename} 문서를 삭제할까요?\n\n업로드 원본, 검색 인덱스, 요약/키워드/질문 히스토리가 함께 삭제됩니다.`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingFileId(item.file_id);
    setStatus("문서를 삭제하는 중입니다...");

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/files/${item.file_id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail ?? "문서 삭제에 실패했습니다.");
      }

      await loadAnalysis();
      setStatus("문서를 삭제했습니다.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "문서 삭제에 실패했습니다.");
    } finally {
      setDeletingFileId("");
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coral/10 text-coral">
              <FileSearch size={24} />
            </div>
            <h2 className="mt-5 text-2xl font-black text-ink">문서 업로드 및 분석</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">현재 분석 가능한 PDF/TXT 문서의 텍스트 길이, 청크 수, 처리 상태를 확인합니다.</p>
          </div>
          <button
            type="button"
            onClick={loadAnalysis}
            disabled={isLoading}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-ink px-4 text-sm font-black text-white disabled:opacity-50"
          >
            <RefreshCw className="mr-2" size={16} />
            새로고침
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-black/5 bg-neutral-50 p-4">
            <p className="text-xs font-bold text-neutral-500">분석 문서</p>
            <strong className="mt-2 block text-2xl font-black text-ink">{items.length}</strong>
            <span className="mt-1 block text-xs text-neutral-500">GET /analysis</span>
          </article>
          <article className="rounded-2xl border border-black/5 bg-neutral-50 p-4">
            <p className="text-xs font-bold text-neutral-500">전체 청크</p>
            <strong className="mt-2 block text-2xl font-black text-ink">{totalChunks}</strong>
            <span className="mt-1 block text-xs text-neutral-500">RAG 검색 단위</span>
          </article>
          <article className="rounded-2xl border border-black/5 bg-neutral-50 p-4">
            <p className="text-xs font-bold text-neutral-500">전체 텍스트</p>
            <strong className="mt-2 block text-2xl font-black text-ink">{totalTextLength.toLocaleString()}</strong>
            <span className="mt-1 block text-xs text-neutral-500">문자 기준</span>
          </article>
        </div>

        {status && <p className="mt-4 text-sm font-semibold text-neutral-600">{status}</p>}

        <div className="mt-6 grid gap-3">
          {items.length === 0 ? (
            <p className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">분석할 문서가 없습니다. AI 문서 채팅 메뉴에서 PDF 또는 TXT를 먼저 업로드해주세요.</p>
          ) : (
            items.map((item) => (
              <article key={item.file_id} className="rounded-2xl border border-black/5 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <strong className="block text-sm text-ink [overflow-wrap:anywhere]">{item.filename}</strong>
                    <span className="mt-1 block text-xs text-neutral-500">{item.file_id}</span>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{item.status}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(item)}
                      disabled={deletingFileId === item.file_id}
                      className="inline-flex min-h-8 items-center justify-center rounded-xl bg-red-50 px-3 text-xs font-black text-coral transition hover:bg-red-100 disabled:opacity-50"
                    >
                      <Trash2 className="mr-2" size={13} />
                      {deletingFileId === item.file_id ? "삭제 중" : "삭제"}
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-xs font-bold text-neutral-500 sm:grid-cols-3">
                  <span>{item.text_length.toLocaleString()} chars</span>
                  <span>{item.chunk_count} chunks</span>
                  <span>{item.uploaded_at ? new Date(item.uploaded_at).toLocaleString() : "-"}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Gauge className="text-coral" size={22} />
          <h3 className="text-xl font-black text-ink">분석 파이프라인</h3>
        </div>
        <div className="mt-5 grid gap-3">
          {checks.map((check) => (
            <div key={check} className="flex items-center gap-3 rounded-2xl bg-neutral-50 p-4 text-sm font-bold text-neutral-700">
              <ShieldCheck className="shrink-0 text-emerald-600" size={18} />
              {check}
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-2xl bg-ink p-5 text-white">
          <BarChart3 size={22} />
          <p className="mt-3 text-sm leading-7 text-white/80">분석 데이터는 업로드 시 저장된 메타데이터를 기준으로 반환됩니다.</p>
        </div>
      </div>
    </section>
  );
}
