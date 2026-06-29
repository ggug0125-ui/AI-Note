export type DocumentStatus = "complete" | "processing" | "failed" | "unknown";
export type DocumentFilter = "recent" | "all" | "complete" | "processing" | "failed";
export type DocumentSort = "latest" | "name";

export type DocumentItem = {
  file_id: string;
  filename?: string;
  created_at?: string;
  uploaded_at?: string;
  status?: string;
  chunk_count?: number;
  text_length?: number;
  page_count?: number | null;
  file_size?: number | null;
  size_bytes?: number | null;
  file_type?: string;
};

export type DocumentViewModel = {
  id: string;
  filename: string;
  extension: string;
  createdAt: string;
  createdLabel: string;
  rawStatus: string;
  status: DocumentStatus;
  statusLabel: string;
  chunkCount: number | null;
  textLength: number | null;
  pageCount: number | null;
  fileSizeBytes: number | null;
};

function formatByteSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("en-US")} KB`;
}

export function formatDocumentInfo(document: Pick<DocumentViewModel, "pageCount" | "fileSizeBytes" | "textLength">) {
  if (typeof document.pageCount === "number" && document.pageCount > 0) {
    return `${document.pageCount.toLocaleString("ko-KR")} 페이지`;
  }
  if (typeof document.fileSizeBytes === "number" && document.fileSizeBytes > 0) {
    return `파일 크기 ${formatByteSize(document.fileSizeBytes)}`;
  }
  if (typeof document.textLength === "number" && document.textLength > 0) {
    return `본문 ${document.textLength.toLocaleString("ko-KR")}자`;
  }
  return "분석 정보 확인 중";
}
