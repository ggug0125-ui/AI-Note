export type DocumentCreditBasisType = "pages" | "estimated_text_pages" | "estimated_pages" | "server_estimated_pages";

export type SheetPageCount = {
  sheet_name: string;
  row_count: number;
  page_count: number;
};

export type DocumentCreditEstimate = {
  pageCount: number | null;
  creditCost: number | null;
  basisType: DocumentCreditBasisType;
  basisLabel: string;
  sheetCount?: number | null;
  sheetPageCounts?: SheetPageCount[];
  note?: string;
};

const TEXT_CHARS_PER_ESTIMATED_PAGE = 2000;
const ROWS_PER_ESTIMATED_PAGE = 40;

export function calculateDocumentCredits(pageCount?: number | null) {
  if (typeof pageCount !== "number" || pageCount < 1) {
    return 1;
  }
  if (pageCount <= 2) {
    return 1;
  }
  return pageCount * 0.5;
}

export function formatCreditAmount(credits: number) {
  return Number.isInteger(credits) ? String(credits) : credits.toFixed(1);
}

export function formatCreditLabel(credits: number) {
  return `${formatCreditAmount(credits)} ${credits === 1 ? "Credit" : "Credits"}`;
}

export function formatCreditEstimateLabel(credits?: number | null) {
  if (typeof credits !== "number") {
    return "서버 계산 후 확정";
  }
  return formatCreditLabel(credits);
}

export function formatPageLabel(pageCount?: number | null) {
  if (typeof pageCount !== "number") {
    return "서버 계산 후 확정";
  }
  return `${pageCount.toLocaleString("ko-KR")} 페이지`;
}

export function isTextUpload(file: File) {
  return file.name.toLowerCase().endsWith(".txt") || file.type === "text/plain";
}

export function isCsvUpload(file: File) {
  const filename = file.name.toLowerCase();
  return filename.endsWith(".csv") || file.type === "text/csv" || file.type === "application/csv";
}

export function isXlsxUpload(file: File) {
  const filename = file.name.toLowerCase();
  return filename.endsWith(".xlsx") || file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

export function isPdfUpload(file: File) {
  return file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
}

export function isTableUpload(file: File) {
  return isXlsxUpload(file) || isCsvUpload(file);
}

export function isFixedCreditUpload(_file: File) {
  return false;
}

function estimateTextPageCount(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return 1;
  }
  const nonEmptyLines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
  const pagesByChars = Math.ceil(trimmed.length / TEXT_CHARS_PER_ESTIMATED_PAGE);
  const pagesByLines = nonEmptyLines > 0 ? Math.ceil(nonEmptyLines / ROWS_PER_ESTIMATED_PAGE) : 1;
  return Math.max(1, pagesByChars, pagesByLines);
}

function estimateCsvPageCount(text: string) {
  const nonEmptyRows = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const rowCount = Math.max(0, nonEmptyRows.length - 1);
  const pageCount = Math.max(1, Math.ceil(Math.max(1, rowCount) / ROWS_PER_ESTIMATED_PAGE));

  return {
    rowCount: Math.max(1, rowCount),
    pageCount,
  };
}

async function estimatePdfPageCount(file: File) {
  try {
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder("latin1").decode(buffer);
    const matches = text.match(/\/Type\s*\/Page\b/g);
    return matches?.length ? matches.length : 1;
  } catch {
    return 1;
  }
}

export async function estimateDocumentCredits(file: File): Promise<DocumentCreditEstimate> {
  if (isTextUpload(file)) {
    const text = await file.text().catch(() => "");
    const pageCount = estimateTextPageCount(text);
    return {
      pageCount,
      creditCost: calculateDocumentCredits(pageCount),
      basisType: "estimated_text_pages",
      basisLabel: "총 페이지(텍스트 길이 기반 추정)",
      note: "TXT는 텍스트 길이와 줄 수를 기준으로 예상 페이지를 계산합니다.",
    };
  }

  if (isCsvUpload(file)) {
    const text = await file.text().catch(() => "");
    const estimate = estimateCsvPageCount(text);
    return {
      pageCount: estimate.pageCount,
      creditCost: calculateDocumentCredits(estimate.pageCount),
      basisType: "estimated_pages",
      basisLabel: "예상 페이지",
      sheetCount: 1,
      sheetPageCounts: [
        {
          sheet_name: "CSV",
          row_count: estimate.rowCount,
          page_count: estimate.pageCount,
        },
      ],
      note: "CSV는 40행을 1페이지로 보고 예상 페이지를 계산합니다.",
    };
  }

  if (isXlsxUpload(file)) {
    return {
      pageCount: null,
      creditCost: null,
      basisType: "server_estimated_pages",
      basisLabel: "총 예상 페이지",
      sheetCount: null,
      note: "Excel은 업로드 후 서버에서 모든 시트의 예상 페이지를 합산하여 최종 차감합니다.",
    };
  }

  const pageCount = isPdfUpload(file) ? await estimatePdfPageCount(file) : 1;
  return {
    pageCount,
    creditCost: calculateDocumentCredits(pageCount),
    basisType: "pages",
    basisLabel: "총 페이지",
  };
}

export async function estimateUploadPageCount(file: File) {
  const estimate = await estimateDocumentCredits(file);
  return estimate.pageCount ?? 1;
}
