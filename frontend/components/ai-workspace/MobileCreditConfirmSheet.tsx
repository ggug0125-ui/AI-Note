"use client";

import { AlertCircle, CheckCircle2, CreditCard } from "lucide-react";
import { useState } from "react";
import { formatCreditEstimateLabel, formatCreditLabel, formatPageLabel, type SheetPageCount } from "./creditUtils";

type MobileCreditConfirmSheetProps = {
  title: "문서 업로드" | "파일 변환";
  fileName: string;
  pageCount: number | null;
  creditCost: number | null;
  currentCredits: number;
  conversionFormat?: string;
  successNote: string;
  confirmText: string;
  isProcessing?: boolean;
  basisLabel?: string;
  sheetCount?: number | null;
  sheetPageCounts?: SheetPageCount[];
  note?: string;
  onCancel: () => void;
  onConfirm: () => void;
  onCharge: () => void;
};

export function MobileCreditConfirmSheet({
  title,
  fileName,
  pageCount,
  creditCost,
  currentCredits,
  conversionFormat,
  successNote,
  confirmText,
  isProcessing = false,
  basisLabel,
  sheetCount,
  sheetPageCounts = [],
  note,
  onCancel,
  onConfirm,
  onCharge,
}: MobileCreditConfirmSheetProps) {
  const [isSheetDetailOpen, setIsSheetDetailOpen] = useState(false);
  const isCreditKnown = typeof creditCost === "number";
  const isInsufficient = isCreditKnown && currentCredits < creditCost;
  const pageLabel = basisLabel || "총 페이지";

  return (
    <div
      data-swipe-ignore="true"
      className="fixed inset-0 z-50 flex items-end bg-black/35 px-2 pb-[calc(0.9rem+env(safe-area-inset-bottom))] backdrop-blur-sm md:items-center md:justify-center"
    >
      <section className="w-full rounded-t-3xl border border-border bg-surface p-4 shadow-[0_-18px_42px_rgba(47,36,24,0.22)] md:max-w-md md:rounded-3xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border md:hidden" />
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
            <CreditCard size={19} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-primary">Credit Confirmation</p>
            <h2 className="mt-1 text-lg font-black text-title">{title}</h2>
            <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-body">{fileName}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 rounded-2xl border border-border bg-panel p-3 text-xs font-bold text-body">
          {conversionFormat && <InfoRow label="변환 형식" value={conversionFormat} />}
          {typeof sheetCount === "number" && <InfoRow label="총 시트" value={`${sheetCount.toLocaleString("ko-KR")}개`} />}
          <InfoRow label={pageLabel} value={formatPageLabel(pageCount)} />
          <InfoRow label="예상 차감" value={formatCreditEstimateLabel(creditCost)} strong />
          <InfoRow label="현재 보유" value={formatCreditLabel(currentCredits)} />

          {!conversionFormat && (
            <div className="grid gap-1 rounded-xl border border-border bg-card px-3 py-2">
              <span className="text-muted">업로드 포함 제공</span>
              {["기본 문서 분석", "핵심 요약", "키워드 추출", "AI 대화 준비"].map((item) => (
                <span key={item} className="flex items-center gap-2 font-black text-title">
                  <CheckCircle2 className="text-primary" size={13} />
                  {item}
                </span>
              ))}
              <span className="mt-1 font-black text-primary">추가 차감 없음</span>
            </div>
          )}

          {sheetPageCounts.length > 0 && (
            <div className="grid gap-1 rounded-xl border border-border bg-card px-3 py-2">
              <button
                type="button"
                onClick={() => setIsSheetDetailOpen((current) => !current)}
                className="flex items-center justify-between gap-2 text-left font-black text-title"
              >
                <span>시트별 예상 페이지</span>
                <span className="text-primary">{isSheetDetailOpen ? "접기" : "보기"}</span>
              </button>
              {isSheetDetailOpen && (
                <div className="mt-1 grid gap-1">
                  {sheetPageCounts.map((sheet) => (
                    <span key={sheet.sheet_name} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate">{sheet.sheet_name}</span>
                      <span className="shrink-0 text-muted">
                        {sheet.row_count.toLocaleString("ko-KR")}행 · {sheet.page_count.toLocaleString("ko-KR")} 페이지
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-1 grid gap-1 rounded-xl border border-border bg-card px-3 py-2">
            <span className="font-black text-title">차감 규칙</span>
            <span>1~2페이지: 1 Credit</span>
            <span>3페이지 이상: 0.5 Credit x 페이지 수</span>
          </div>

          {note && <p className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 font-black leading-5 text-primary">{note}</p>}
        </div>

        <p className="mt-3 flex items-start gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-xs font-bold leading-5 text-body">
          <CheckCircle2 className="mt-0.5 shrink-0 text-primary" size={14} />
          {successNote}
        </p>

        {isInsufficient && (
          <div className="mt-3 rounded-2xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-black leading-5 text-primary">
            <p className="flex items-center gap-2">
              <AlertCircle size={14} />
              크레딧이 부족합니다.
            </p>
            <p className="mt-1">필요 크레딧: {formatCreditLabel(creditCost ?? 0)}</p>
            <p>보유 크레딧: {formatCreditLabel(currentCredits)}</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="min-h-11 rounded-2xl border border-border bg-card text-sm font-black text-body transition hover:border-primary/40 active:scale-[0.98] disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={isInsufficient ? onCharge : onConfirm}
            disabled={isProcessing}
            className="min-h-11 rounded-2xl bg-primary px-3 text-sm font-black text-white shadow-soft transition active:scale-[0.98] disabled:opacity-60"
          >
            {isInsufficient ? "크레딧 충전하기" : isProcessing ? "처리 중..." : confirmText}
          </button>
        </div>
      </section>
    </div>
  );
}

function InfoRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2">
      <span className="text-muted">{label}</span>
      <span className={["text-right", strong ? "text-sm font-black text-primary" : "text-title"].join(" ")}>{value}</span>
    </div>
  );
}
