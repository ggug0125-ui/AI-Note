"use client";

import { useEffect, useMemo, useState } from "react";
import { PdfAnalysis } from "../../PdfAnalysis";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";
import type { WorkspaceTab } from "../types";
import { DocumentCard } from "./DocumentCard";
import { DocumentFilterBar } from "./DocumentFilterBar";
import { DocumentUploadCard } from "./DocumentUploadCard";
import { SelectedDocumentPanel } from "./SelectedDocumentPanel";
import { SupportedFileTypes } from "./SupportedFileTypes";
import type { DocumentFilter, DocumentItem, DocumentSort, DocumentStatus, DocumentViewModel } from "./types";

type DocumentCenterProps = {
  onNavigate: (tab: WorkspaceTab) => void;
};

function inferExtension(file: DocumentItem) {
  const explicit = file.file_type?.trim();
  if (explicit) {
    return explicit.replace(/^\./, "").toUpperCase();
  }

  const filename = file.filename || "";
  const extension = filename.includes(".") ? filename.split(".").pop() : "";
  return (extension || "FILE").toUpperCase();
}

function normalizeStatus(status: string | undefined): { status: DocumentStatus; label: string } {
  const normalized = (status || "").toLowerCase();
  if (["ready", "success", "complete", "completed", "analyzed"].includes(normalized)) {
    return { status: "complete", label: "분석 완료" };
  }
  if (["pending", "processing", "uploading", "running"].includes(normalized)) {
    return { status: "processing", label: "분석중" };
  }
  if (["failed", "error"].includes(normalized)) {
    return { status: "failed", label: "실패" };
  }
  return { status: "unknown", label: "상태 확인 필요" };
}

function formatDate(value: string) {
  if (!value) {
    return "날짜 정보 없음";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toViewModel(file: DocumentItem): DocumentViewModel {
  const timestamp = file.created_at || file.uploaded_at || "";
  const status = normalizeStatus(file.status);

  return {
    id: file.file_id,
    filename: file.filename || "이름 없는 문서",
    extension: inferExtension(file),
    createdAt: timestamp,
    createdLabel: formatDate(timestamp),
    rawStatus: file.status || "",
    status: status.status,
    statusLabel: status.label,
    chunkCount: typeof file.chunk_count === "number" ? file.chunk_count : null,
    textLength: typeof file.text_length === "number" ? file.text_length : null,
  };
}

function filterDocuments(documents: DocumentViewModel[], filter: DocumentFilter) {
  if (filter === "all") {
    return documents;
  }
  if (filter === "recent") {
    return documents.slice(0, 5);
  }
  return documents.filter((document) => document.status === filter);
}

function sortDocuments(documents: DocumentViewModel[], sort: DocumentSort) {
  const sorted = [...documents];
  if (sort === "name") {
    return sorted.sort((a, b) => a.filename.localeCompare(b.filename));
  }
  return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function DocumentCenter({ onNavigate }: DocumentCenterProps) {
  const [documents, setDocuments] = useState<DocumentViewModel[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [filter, setFilter] = useState<DocumentFilter>("recent");
  const [sort, setSort] = useState<DocumentSort>("latest");
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDocuments() {
      setIsLoading(true);
      setStatusMessage("");

      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/files`);
        if (!response.ok) {
          throw new Error("문서 목록을 불러오지 못했습니다.");
        }

        const data = (await response.json()) as { files?: DocumentItem[] };
        const nextDocuments = sortDocuments((data.files || []).map(toViewModel), "latest");

        if (isMounted) {
          setDocuments(nextDocuments);
          setSelectedDocumentId((current) => (
            nextDocuments.some((document) => document.id === current)
              ? current
              : ""
          ));
          setStatusMessage(nextDocuments.length === 0 ? "아직 업로드된 문서가 없습니다." : "");
        }
      } catch (error) {
        if (isMounted) {
          setDocuments([]);
          setSelectedDocumentId("");
          setStatusMessage(error instanceof Error ? error.message : "문서 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDocuments();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleDocuments = useMemo(() => (
    filterDocuments(sortDocuments(documents, sort), filter)
  ), [documents, filter, sort]);

  const selectedDocument = useMemo(() => (
    documents.find((document) => document.id === selectedDocumentId) || null
  ), [documents, selectedDocumentId]);

  return (
    <section className="grid gap-6">
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 gap-5">
          <DocumentUploadCard />
          <DocumentFilterBar
            filter={filter}
            sort={sort}
            totalCount={documents.length}
            onFilterChange={setFilter}
            onSortChange={setSort}
          />

          <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {isLoading ? (
              <p className="rounded-3xl border border-[#E9D8BD] bg-white p-5 text-sm font-bold text-[#6F5A40] sm:col-span-2 xl:col-span-3">
                문서 목록을 불러오는 중입니다.
              </p>
            ) : visibleDocuments.length === 0 ? (
              <p className="rounded-3xl border border-[#E9D8BD] bg-white p-5 text-sm font-bold text-[#6F5A40] sm:col-span-2 xl:col-span-3">
                {statusMessage || "아직 업로드된 문서가 없습니다."}
              </p>
            ) : (
              visibleDocuments.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  isSelected={selectedDocumentId === document.id}
                  onSelect={(nextDocument) => setSelectedDocumentId(nextDocument.id)}
                />
              ))
            )}
          </div>

          <SupportedFileTypes />
        </div>

        <SelectedDocumentPanel document={selectedDocument} onNavigate={onNavigate} />
      </div>

      <section className="rounded-3xl border border-[#E9D8BD] bg-white p-4 shadow-[0_14px_34px_rgba(124,82,27,0.07)] md:p-5">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-wide text-[#8A7354]">Legacy Analysis Tool</p>
          <h2 className="mt-2 text-2xl font-black text-[#2F2418]">문서 업로드 및 분석</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-[#6F5A40]">
            기존 분석 도구는 그대로 유지됩니다. 아래 영역에서 실제 문서 업로드와 분석을 진행하세요.
          </p>
        </div>
        <PdfAnalysis />
      </section>
    </section>
  );
}
