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
};
