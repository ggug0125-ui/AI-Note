"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import {
  ArrowRightLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
  UploadCloud,
} from "lucide-react";
import { WorkspaceEmptyState } from "./ai-workspace/WorkspaceEmptyState";
import { WorkspaceLoadingState } from "./ai-workspace/WorkspaceLoadingState";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";

type TargetFormat = "csv" | "pdf" | "txt";

type ConvertResponse = {
  status: "success" | "unsupported";
  message?: string;
  original_filename: string;
  converted_filename?: string;
  target_format: TargetFormat;
  download_url?: string;
};

type ConvertOption = {
  title: string;
  description: string;
  extensions: string;
  target: string;
  icon: typeof FileText;
  status: "available" | "planned";
};

const convertOptions: ConvertOption[] = [
  {
    title: "Excel → CSV",
    description: "업무 데이터 분석과 공유를 위해 Excel 첫 번째 시트를 CSV로 변환합니다.",
    extensions: ".xlsx, .xls",
    target: "CSV",
    icon: FileSpreadsheet,
    status: "available",
  },
  {
    title: "Excel → PDF",
    description: "Excel 내용을 간단한 표 형식의 PDF 미리보기 문서로 변환합니다.",
    extensions: ".xlsx, .xls",
    target: "PDF",
    icon: FileSpreadsheet,
    status: "available",
  },
  {
    title: "HWPX → TXT",
    description: "HWPX 내부 XML에서 텍스트를 추출해 TXT 파일로 저장합니다.",
    extensions: ".hwpx",
    target: "TXT",
    icon: FileText,
    status: "available",
  },
  {
    title: "HWP → 변환",
    description: "한글 바이너리 문서 변환은 준비 중입니다. 현재는 안내 메시지만 제공됩니다.",
    extensions: ".hwp",
    target: "준비 중",
    icon: FileText,
    status: "planned",
  },
  {
    title: "PDF → TXT / Markdown",
    description: "PDF 본문을 텍스트와 Markdown으로 정리하는 변환을 준비하고 있습니다.",
    extensions: ".pdf",
    target: "TXT, MD",
    icon: FileText,
    status: "planned",
  },
  {
    title: "DOCX → TXT / PDF",
    description: "Word 문서의 본문 추출과 PDF 변환을 지원할 예정입니다.",
    extensions: ".docx",
    target: "TXT, PDF",
    icon: FileText,
    status: "planned",
  },
  {
    title: "PPTX → TXT / PDF",
    description: "프레젠테이션 슬라이드 텍스트 추출과 공유용 PDF 변환을 준비 중입니다.",
    extensions: ".pptx",
    target: "TXT, PDF",
    icon: FileText,
    status: "planned",
  },
  {
    title: "XLSX → Markdown",
    description: "스프레드시트 데이터를 문서화하기 쉬운 Markdown 표로 변환할 예정입니다.",
    extensions: ".xlsx",
    target: "MD",
    icon: FileSpreadsheet,
    status: "planned",
  },
];

const targetOptions: Array<{ value: TargetFormat; label: string }> = [
  { value: "csv", label: "CSV" },
  { value: "pdf", label: "PDF" },
  { value: "txt", label: "TXT" },
];

export function FileConvert() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState<TargetFormat>("csv");
  const [result, setResult] = useState<ConvertResponse | null>(null);
  const [status, setStatus] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const canConvert = useMemo(() => selectedFile !== null && !isConverting, [selectedFile, isConverting]);

  function setNextFile(file: File | null) {
    setSelectedFile(file);
    setResult(null);
    setStatus("");
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
    if (isConverting) {
      return;
    }

    setNextFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleConvert() {
    if (!selectedFile) {
      setStatus("변환할 파일을 먼저 선택해주세요.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("target_format", targetFormat);

    setIsConverting(true);
    setResult(null);
    setStatus("파일을 변환하는 중입니다...");

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/convert`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail ?? "파일 변환에 실패했습니다.");
      }

      setResult(data);
      setStatus(data.status === "unsupported" ? data.message ?? "지원 예정인 변환입니다." : "변환이 완료되었습니다.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "파일 변환에 실패했습니다.");
    } finally {
      setIsConverting(false);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="ai-card p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--ai-color-surface)] text-coral">
              <ArrowRightLeft size={24} />
            </div>
            <span className="mt-5 block text-xs font-extrabold uppercase tracking-wide text-coral">Convert Studio</span>
            <h2 className="mt-2 text-2xl font-black text-[var(--ai-color-text-primary)]">Convert Studio</h2>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)]">
              문서를 원하는 형식으로 변환하세요.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <input
            ref={fileInputRef}
            id="convert-file"
            type="file"
            accept=".xlsx,.xls,.hwpx,.hwp"
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
              isDragging ? "border-coral bg-[var(--ai-color-surface)] shadow-md" : "",
              isConverting ? "is-disabled" : "",
            ].filter(Boolean).join(" ")}
          >
            <UploadCloud className="text-coral" size={34} />
            {selectedFile ? (
              <>
                <strong className="mt-4 max-w-full break-words text-lg font-black text-[var(--ai-color-text-primary)]">
                  {selectedFile.name}
                </strong>
                <span className="ai-badge mt-3">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
              </>
            ) : (
              <>
                <strong className="mt-4 text-lg font-black text-[var(--ai-color-text-primary)]">
                  {isDragging ? "여기에 놓으면 파일이 선택됩니다." : "파일을 끌어다 놓으세요."}
                </strong>
                <span className="mt-2 text-sm font-bold text-[var(--ai-color-text-secondary)]">
                  또는 클릭해서 파일을 선택하세요.
                </span>
              </>
            )}
            <span className="mt-4 text-xs font-black text-[var(--ai-color-text-secondary)]">
              지원 파일: XLSX / XLS / HWPX
            </span>
          </label>

          {!selectedFile && (
            <WorkspaceEmptyState icon={<UploadCloud size={16} />}>
              변환할 파일을 선택하면 변환 실행 버튼이 활성화됩니다.
            </WorkspaceEmptyState>
          )}

          <label className="grid gap-2 text-sm font-black text-[var(--ai-color-text-primary)]">
            변환 형식
            <select
              value={targetFormat}
              onChange={(event) => setTargetFormat(event.target.value as TargetFormat)}
              disabled={isConverting}
              className="ai-select"
            >
              {targetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button type="button" onClick={handleConvert} disabled={!canConvert} className="ai-btn ai-btn-primary min-h-12">
            <ArrowRightLeft size={18} />
            {isConverting ? "변환 중" : "변환 실행"}
          </button>

          {status && <WorkspaceLoadingState message={status} isLoading={isConverting} />}

          {result?.status === "success" && result.download_url && (
            <div className="ai-panel-compact border-[rgba(34,197,94,0.24)] bg-[rgba(34,197,94,0.08)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="ai-badge ai-badge-success">
                    <CheckCircle2 size={13} />
                    변환 완료
                  </span>
                  <p className="mt-3 break-words text-sm font-black text-[var(--ai-color-text-primary)]">
                    {result.original_filename} → {result.converted_filename}
                  </p>
                  <p className="mt-2 text-xs font-bold text-[var(--ai-color-text-secondary)]">
                    다운로드 링크는 현재 세션에서만 표시됩니다.
                  </p>
                </div>
                <a href={result.download_url} className="ai-btn ai-btn-primary min-h-11 shrink-0 px-4">
                  <Download size={16} />
                  다운로드
                </a>
              </div>
            </div>
          )}

          <div className="ai-alert">
            <Info className="mr-2 inline-block align-text-bottom" size={16} />
            변환 기록 저장은 추후 지원 예정입니다.
          </div>
        </div>
      </div>

      <aside className="grid gap-4">
        <div className="ai-card p-5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-coral">Supported Formats</span>
          <h3 className="mt-2 text-xl font-black text-[var(--ai-color-text-primary)]">지원 형식</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-[var(--ai-color-text-secondary)]">
            현재 사용 가능한 변환과 준비 중인 변환을 구분해서 확인할 수 있습니다.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {convertOptions.map((option) => {
            const Icon = option.icon;
            const isAvailable = option.status === "available";

            return (
              <article key={option.title} className="ai-card ai-card-hover p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--ai-color-surface)] text-coral">
                    <Icon size={22} />
                  </div>
                  <span className={["ai-badge", isAvailable ? "ai-badge-success" : "ai-badge-warning"].join(" ")}>
                    {isAvailable ? "지원 가능" : "준비 중"}
                  </span>
                </div>
                <h4 className="mt-4 text-base font-black text-[var(--ai-color-text-primary)]">{option.title}</h4>
                <p className="mt-2 text-sm font-bold leading-6 text-[var(--ai-color-text-secondary)]">
                  {option.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="ai-badge">{option.extensions}</span>
                  <span className="ai-badge ai-badge-info">{option.target}</span>
                </div>
              </article>
            );
          })}
        </div>
      </aside>
    </section>
  );
}
