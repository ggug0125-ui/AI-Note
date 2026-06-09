"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { ArrowRightLeft, Download, FileSpreadsheet, FileText, UploadCloud } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

type TargetFormat = "csv" | "pdf" | "txt";

type ConvertResponse = {
  status: "success" | "unsupported";
  message?: string;
  original_filename: string;
  converted_filename?: string;
  target_format: TargetFormat;
  download_url?: string;
};


const convertOptions = [
  {
    title: "Excel → CSV",
    description: "업무 데이터 분석과 재가공을 위해 첫 번째 시트를 CSV로 변환합니다.",
    extensions: ".xlsx, .xls",
    target: "csv",
    icon: FileSpreadsheet,
  },
  {
    title: "Excel → PDF",
    description: "Excel 내용을 간단한 표 형태의 PDF 미리보기 문서로 변환합니다.",
    extensions: ".xlsx, .xls",
    target: "pdf",
    icon: FileSpreadsheet,
  },
  {
    title: "HWPX → TXT",
    description: "HWPX 내부 XML에서 텍스트를 추출해 TXT 파일로 저장합니다.",
    extensions: ".hwpx",
    target: "txt",
    icon: FileText,
  },
];

export function FileConvert() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState<TargetFormat>("csv");
  const [result, setResult] = useState<ConvertResponse | null>(null);
  const [status, setStatus] = useState("");
  const [isConverting, setIsConverting] = useState(false);

  const canConvert = useMemo(() => selectedFile !== null && !isConverting, [selectedFile, isConverting]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
    setResult(null);
    setStatus("");
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
      const response = await fetch(`${API_BASE_URL}/convert`, {
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
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coral/10 text-coral">
              <ArrowRightLeft size={24} />
            </div>
            <h2 className="mt-5 text-2xl font-black text-ink">엑셀·한글 변환</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
              Excel 파일은 CSV/PDF로, HWPX 파일은 TXT로 변환합니다. HWP 파일은 현재 지원 예정입니다.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <div className="grid gap-3 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-4 sm:grid-cols-[1fr_auto]">
            <input
              id="convert-file"
              type="file"
              accept=".xlsx,.xls,.hwpx,.hwp"
              className="hidden"
              onChange={handleFileChange}
            />
            <label
              htmlFor="convert-file"
              className="flex min-h-12 cursor-pointer items-center rounded-xl border border-black/10 bg-white px-4 text-sm font-bold text-neutral-600 [overflow-wrap:anywhere]"
            >
              {selectedFile ? selectedFile.name : "Excel, HWPX, HWP 파일 선택"}
            </label>
            <span className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-neutral-500">
              <UploadCloud className="mr-2" size={17} />
              업로드
            </span>
          </div>

          <label className="grid gap-2 text-sm font-bold text-neutral-700">
            변환 형식
            <select
              value={targetFormat}
              onChange={(event) => setTargetFormat(event.target.value as TargetFormat)}
              className="min-h-12 rounded-xl border border-black/10 bg-white px-4 outline-none focus:border-coral"
            >
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
              <option value="txt">TXT</option>
            </select>
          </label>

          <button
            type="button"
            onClick={handleConvert}
            disabled={!canConvert}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-coral px-5 text-sm font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowRightLeft className="mr-2" size={18} />
            {isConverting ? "변환 중" : "변환 실행"}
          </button>

          {status && <p className="text-sm font-semibold text-neutral-600">{status}</p>}

          {result?.status === "success" && result.download_url && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-bold text-emerald-800">
                {result.original_filename} → {result.converted_filename}
              </p>
              <a
                href={result.download_url}
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700"
              >
                <Download className="mr-2" size={16} />
                다운로드
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {convertOptions.map((option) => {
          const Icon = option.icon;

          return (
            <article key={option.title} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Icon className="text-coral" size={24} />
                  <h3 className="mt-4 text-lg font-black text-ink">{option.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">{option.description}</p>
                </div>
                <span className="w-fit rounded-full bg-neutral-100 px-3 py-1 text-xs font-black text-neutral-600">
                  {option.extensions} → {option.target.toUpperCase()}
                </span>
              </div>
            </article>
          );
        })}

        <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <FileText className="text-neutral-400" size={24} />
          <h3 className="mt-4 text-lg font-black text-ink">HWP → 변환</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            HWP 바이너리 포맷은 현재 지원 예정입니다. 서버는 안내 메시지를 반환하고 파일 자체는 변환하지 않습니다.
          </p>
        </article>
      </div>
    </section>
  );
}
