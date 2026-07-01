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

export function isTextUpload(file: File) {
  return file.name.toLowerCase().endsWith(".txt") || file.type === "text/plain";
}

export async function estimateUploadPageCount(file: File) {
  if (isTextUpload(file)) {
    return 1;
  }

  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    return 1;
  }

  try {
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder("latin1").decode(buffer);
    const matches = text.match(/\/Type\s*\/Page\b/g);
    return matches?.length ? matches.length : 1;
  } catch {
    return 1;
  }
}
