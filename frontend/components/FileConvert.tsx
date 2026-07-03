"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import {
  ArrowRightLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  Info,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { WorkspaceEmptyState } from "./ai-workspace/WorkspaceEmptyState";
import { WorkspaceLoadingState } from "./ai-workspace/WorkspaceLoadingState";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";

type FileType = "pdf" | "txt" | "xlsx" | "hwpx";

type ConvertResponse = {
  status: "success" | "unsupported";
  message?: string;
  conversion_id?: string;
  original_filename: string;
  converted_filename?: string;
  output_filename?: string;
  display_filename?: string;
  original_type?: FileType;
  target_type?: FileType;
  target_format: FileType;
  page_count?: number;
  credit_cost?: number;
  download_url?: string;
};

type ConversionHistoryItem = {
  conversion_id: string;
  original_filename: string;
  display_filename?: string;
  original_type: FileType;
  target_type: FileType;
  output_filename: string;
  page_count?: number;
  credit_cost?: number;
  status: string;
  created_at?: string;
};

const supportedTargets: Record<FileType, FileType[]> = {
  pdf: ["txt", "xlsx", "hwpx"],
  txt: ["pdf", "xlsx", "hwpx"],
  xlsx: ["pdf", "txt", "hwpx"],
  hwpx: ["pdf", "txt", "xlsx"],
};

const typeLabels: Record<FileType, string> = {
  pdf: "PDF",
  txt: "TXT",
  xlsx: "XLSX",
  hwpx: "HWPX",
};

const typeDescriptions: Record<FileType, string> = {
  pdf: "PDF 텍스트를 추출해 다른 문서 형식으로 저장합니다.",
  txt: "텍스트 파일을 PDF, Excel, HWPX 문서로 정리합니다.",
  xlsx: "모든 시트 내용을 텍스트 기반 문서로 변환합니다.",
  hwpx: "HWPX 내부 XML 텍스트를 추출해 다른 형식으로 저장합니다.",
};

function formatCreditAmount(value?: number | null) {
  if (typeof value !== "number") {
    return "-";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatPageCount(value?: number | null) {
  if (typeof value !== "number") {
    return "-";
  }
  return `${value.toLocaleString("ko-KR")} Page`;
}

function formatDate(value?: string) {
  if (!value) {
    return "날짜 없음";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function inferFileType(file: File | null): FileType | null {
  const extension = file?.name.split(".").pop()?.toLowerCase();
  if (extension === "pdf" || extension === "txt" || extension === "xlsx" || extension === "hwpx") {
    return extension;
  }
  return null;
}

function downloadFilenameFromHeaders(headers: Headers, fallback: string) {
  const disposition = headers.get("content-disposition") || "";
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || fallback;
}

function ResultInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[rgba(34,197,94,0.18)] bg-white/55 px-3 py-2">
      <p className="text-[0.68rem] font-black uppercase tracking-wide text-[var(--ai-color-text-secondary)]">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-[var(--ai-color-text-primary)]">{value}</p>
    </div>
  );
}

export function FileConvert() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState<FileType>("txt");
  const [result, setResult] = useState<ConvertResponse | null>(null);
  const [history, setHistory] = useState<ConversionHistoryItem[]>([]);
  const [status, setStatus] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
  const [downloadStatus, setDownloadStatus] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [isDownloading, setIsDownloading] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const sourceType = inferFileType(selectedFile);
  const targets = sourceType ? supportedTargets[sourceType] : [];
  const canConvert = selectedFile !== null && sourceType !== null && !isConverting;

  useEffect(() => {
    if (sourceType && !targets.includes(targetFormat)) {
      setTargetFormat(targets[0] || "txt");
    }
  }, [sourceType, targetFormat, targets]);

  useEffect(() => {
    void loadHistory();
  }, []);

  function setNextFile(file: File | null) {
    setSelectedFile(file);
    setResult(null);
    setStatus("");
    setDownloadStatus("");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setNextFile(event.target.files?.[0] ?? null);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (!isConverting) {
      setIsDragging(true);
    }
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (!isConverting) {
      setNextFile(event.dataTransfer.files?.[0] ?? null);
    }
  }

  async function loadHistory() {
    setHistoryStatus("변환 기록을 불러오는 중...");
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/convert/history`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(String(error.detail || "변환 기록을 불러오지 못했습니다."));
      }
      const data = (await response.json()) as { history?: ConversionHistoryItem[] };
      setHistory(data.history || []);
      setHistoryStatus("");
    } catch (error) {
      setHistoryStatus(error instanceof Error ? error.message : "변환 기록을 불러오지 못했습니다.");
    }
  }

  async function handleConvert() {
    if (!selectedFile || !sourceType) {
      setStatus("PDF, TXT, XLSX, HWPX 파일을 선택해주세요.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("target_format", targetFormat);

    setIsConverting(true);
    setResult(null);
    setDownloadStatus("");
    setStatus("파일을 변환하는 중입니다...");

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/convert`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(data.detail || "파일 변환에 실패했습니다."));
      }

      setResult(data as ConvertResponse);
      setStatus(data.status === "unsupported" ? String(data.message || "지원하지 않는 변환입니다.") : "변환이 완료되었습니다.");
      if (data.status === "success") {
        window.dispatchEvent(new Event("credits:refresh"));
        await loadHistory();
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "파일 변환에 실패했습니다.");
    } finally {
      setIsConverting(false);
    }
  }

  async function downloadConversion(conversionId: string, fallbackName: string) {
    setIsDownloading(conversionId);
    setDownloadStatus("");
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/convert/download/${conversionId}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(String(error.detail || "다운로드에 실패했습니다."));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = downloadFilenameFromHeaders(response.headers, fallbackName);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setDownloadStatus("다운로드 완료");
    } catch (error) {
      setDownloadStatus(error instanceof Error ? error.message : "다운로드에 실패했습니다.");
    } finally {
      setIsDownloading("");
    }
  }

  const selectedDescription = sourceType ? typeDescriptions[sourceType] : "지원 형식: PDF, TXT, XLSX, HWPX";

  return (
    <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="ai-card p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-primary">
              <ArrowRightLeft size={24} />
            </div>
            <span className="mt-5 block text-xs font-extrabold uppercase tracking-wide text-primary">Convert Studio</span>
            <h2 className="mt-2 text-2xl font-black text-[var(--ai-color-text-primary)]">파일 변환</h2>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)]">
              PDF, TXT, XLSX, HWPX 문서를 필요한 형식으로 변환합니다.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <input
            ref={fileInputRef}
            id="convert-file"
            type="file"
            accept=".pdf,.txt,.xlsx,.hwpx"
            className="hidden"
            disabled={isConverting}
            onChange={handleFileChange}
          />

          <label
            htmlFor="convert-file"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            aria-disabled={isConverting}
            className={[
              "ai-upload-zone min-h-56",
              isDragging ? "border-primary bg-surface shadow-md" : "",
              isConverting ? "is-disabled" : "",
            ].filter(Boolean).join(" ")}
          >
            <UploadCloud className="text-primary" size={34} />
            {selectedFile ? (
              <>
                <strong className="mt-4 max-w-full break-words text-lg font-black text-[var(--ai-color-text-primary)]">
                  {selectedFile.name}
                </strong>
                <span className="ai-badge mt-3">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                <span className="mt-3 text-xs font-black text-[var(--ai-color-text-secondary)]">{selectedDescription}</span>
              </>
            ) : (
              <>
                <strong className="mt-4 text-lg font-black text-[var(--ai-color-text-primary)]">
                  {isDragging ? "여기에 놓으면 파일을 선택합니다" : "파일을 끌어오거나 클릭해서 선택하세요"}
                </strong>
                <span className="mt-2 text-sm font-bold text-[var(--ai-color-text-secondary)]">
                  PDF / TXT / XLSX / HWPX만 지원합니다.
                </span>
              </>
            )}
          </label>

          {!selectedFile && (
            <WorkspaceEmptyState icon={<UploadCloud size={16} />}>
              변환할 파일을 선택하면 가능한 변환 형식이 표시됩니다.
            </WorkspaceEmptyState>
          )}

          <label className="grid gap-2 text-sm font-black text-[var(--ai-color-text-primary)]">
            변환 형식
            <select
              value={targetFormat}
              onChange={(event) => setTargetFormat(event.target.value as FileType)}
              disabled={!sourceType || isConverting}
              className="ai-select"
            >
              {targets.length > 0 ? (
                targets.map((target) => (
                  <option key={target} value={target}>
                    {sourceType ? `${typeLabels[sourceType]} → ${typeLabels[target]}` : typeLabels[target]}
                  </option>
                ))
              ) : (
                <option value="txt">파일을 먼저 선택해주세요</option>
              )}
            </select>
          </label>

          <button type="button" onClick={handleConvert} disabled={!canConvert} className="ai-btn ai-btn-primary min-h-12">
            <ArrowRightLeft size={18} />
            {isConverting ? "변환 중" : "변환 실행"}
          </button>

          <div className="ai-alert">
            <Info className="mr-2 inline-block align-text-bottom" size={16} />
            변환 완료 후 다운로드는 크레딧 차감 없이 다시 받을 수 있습니다.
          </div>

          {status && <WorkspaceLoadingState message={status} isLoading={isConverting} />}
          {downloadStatus && <p className="ai-alert ai-alert-success">{downloadStatus}</p>}

          {result?.status === "success" && result.conversion_id && (
            <div className="ai-panel-compact border-[rgba(34,197,94,0.24)] bg-[rgba(34,197,94,0.08)]">
              <div className="flex flex-col gap-4">
                <span className="ai-badge ai-badge-success w-fit">
                  <CheckCircle2 size={13} />
                  변환 완료
                </span>
                <div className="grid gap-2 sm:grid-cols-2">
                  <ResultInfo label="원본" value={result.original_filename} />
                  <ResultInfo label="변환" value={result.display_filename || result.output_filename || "converted"} />
                  <ResultInfo
                    label="형식"
                    value={`${typeLabels[result.original_type || sourceType || "pdf"]} → ${typeLabels[result.target_type || result.target_format]}`}
                  />
                  <ResultInfo label="페이지" value={formatPageCount(result.page_count)} />
                  <ResultInfo label="차감 크레딧" value={`${formatCreditAmount(result.credit_cost)} Credit`} />
                </div>
                <button
                  type="button"
                  onClick={() => downloadConversion(result.conversion_id || "", result.display_filename || result.output_filename || "converted")}
                  disabled={isDownloading === result.conversion_id}
                  className="ai-btn ai-btn-primary min-h-11 w-full px-4 sm:w-fit"
                >
                  <Download size={16} />
                  {isDownloading === result.conversion_id ? "다운로드 중" : "다운로드"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className="grid gap-4">
        <div className="ai-card p-5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-primary">Supported Formats</span>
          <h3 className="mt-2 text-xl font-black text-[var(--ai-color-text-primary)]">지원 변환</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-[var(--ai-color-text-secondary)]">
            이번 버전은 PDF, TXT, XLSX, HWPX 사이의 변환만 지원합니다.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {(Object.keys(supportedTargets) as FileType[]).map((source) => {
            const Icon = source === "xlsx" ? FileSpreadsheet : FileText;
            return (
              <article key={source} className="ai-card ai-card-hover p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface text-primary">
                    <Icon size={22} />
                  </div>
                  <span className="ai-badge ai-badge-success">지원</span>
                </div>
                <h4 className="mt-4 text-base font-black text-[var(--ai-color-text-primary)]">{typeLabels[source]} 변환</h4>
                <p className="mt-2 text-sm font-bold leading-6 text-[var(--ai-color-text-secondary)]">{typeDescriptions[source]}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="ai-badge">{typeLabels[source]}</span>
                  {supportedTargets[source].map((target) => (
                    <span key={target} className="ai-badge ai-badge-info">
                      {typeLabels[target]}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        <div className="ai-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wide text-primary">History</span>
              <h3 className="mt-2 text-xl font-black text-[var(--ai-color-text-primary)]">변환 기록</h3>
            </div>
            <button type="button" onClick={loadHistory} className="ai-btn ai-btn-secondary min-h-10 px-4 py-2 text-xs">
              <RefreshCw size={14} />
              새로고침
            </button>
          </div>
          {historyStatus && <WorkspaceLoadingState message={historyStatus} isLoading={historyStatus.includes("불러오는 중")} className="mt-3" />}
          <div className="mt-4 grid gap-3">
            {history.length === 0 ? (
              <WorkspaceEmptyState icon={<History size={16} />}>아직 변환 기록이 없습니다.</WorkspaceEmptyState>
            ) : (
              history.map((item) => (
                <article key={item.conversion_id} className="ai-panel-compact">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-black text-[var(--ai-color-text-primary)]">{item.original_filename}</p>
                      <p className="mt-1 text-xs font-bold text-[var(--ai-color-text-secondary)]">
                        {typeLabels[item.original_type]} → {typeLabels[item.target_type]} · {formatCreditAmount(item.credit_cost)} Credit · {formatPageCount(item.page_count)} · {formatDate(item.created_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadConversion(item.conversion_id, item.display_filename || item.output_filename)}
                      disabled={isDownloading === item.conversion_id}
                      className="ai-btn ai-btn-primary min-h-10 w-full px-4 py-2 text-xs sm:w-auto"
                    >
                      <Download size={14} />
                      {isDownloading === item.conversion_id ? "다운로드 중" : "다운로드"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </aside>
    </section>
  );
}
