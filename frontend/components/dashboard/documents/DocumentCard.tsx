import { CheckCircle2, FileText } from "lucide-react";
import { formatDocumentInfo, type DocumentStatus, type DocumentViewModel } from "./types";

type DocumentCardProps = {
  document: DocumentViewModel;
  isSelected: boolean;
  onSelect: (document: DocumentViewModel) => void;
};

function getExtensionBadgeClass(extension: string) {
  const normalized = extension.toUpperCase();
  if (normalized === "PDF") {
    return "border-gold/45 bg-gold/12 text-gold";
  }
  if (normalized === "TXT") {
    return "border-border bg-panel text-body";
  }
  if (normalized === "DOCX" || normalized === "DOC") {
    return "border-border bg-panel text-body";
  }
  if (normalized === "PPTX" || normalized === "PPT") {
    return "border-primary/30 bg-primary/10 text-primary";
  }
  if (normalized === "XLSX" || normalized === "XLS" || normalized === "CSV") {
    return "border-emerald-400/30 bg-emerald-500/10 text-body";
  }
  if (normalized === "HWPX" || normalized === "HWP") {
    return "border-border bg-panel text-body";
  }
  return "border-border bg-panel text-muted";
}

function getStatusBadgeClass(status: DocumentStatus) {
  if (status === "complete") {
    return "border-emerald-400/30 bg-emerald-500/10 text-body";
  }
  if (status === "processing") {
    return "border-gold/45 bg-gold/12 text-gold";
  }
  if (status === "failed") {
    return "border-primary/35 bg-primary/10 text-primary";
  }
  return "border-border bg-panel text-body";
}

export function DocumentCard({ document, isSelected, onSelect }: DocumentCardProps) {
  const metaText = formatDocumentInfo(document);

  return (
    <button
      type="button"
      onClick={() => onSelect(document)}
      className={[
        "group relative flex h-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-3xl border p-4 text-left transition-all duration-300 ease-out focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
        isSelected
          ? "-translate-y-0.5 border-primary bg-primary/10 shadow-soft ring-2 ring-primary/25"
          : "border-border bg-card shadow-soft hover:-translate-y-1 hover:border-primary/60 hover:bg-panel",
      ].join(" ")}
    >
      {isSelected && <span className="absolute inset-y-0 left-0 w-1.5 bg-primary" />}
      {isSelected && (
        <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary px-2.5 py-1 text-[10px] font-black text-white shadow-soft">
          <CheckCircle2 size={13} />
          선택됨
        </span>
      )}

      <div
        className={[
          "relative mx-auto flex aspect-[3/4] w-full max-w-[168px] flex-col rounded-2xl border p-4 shadow-inner transition-all duration-300",
          isSelected
            ? "border-primary bg-card"
            : "border-border bg-surface group-hover:border-primary/60 group-hover:bg-panel",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={["rounded-full border px-2.5 py-1 text-[10px] font-black", getExtensionBadgeClass(document.extension)].join(" ")}>
            {document.extension}
          </span>
          <FileText
            className={[
              "shrink-0 transition-colors duration-300",
              isSelected ? "text-primary" : "text-gold group-hover:text-primary",
            ].join(" ")}
            size={18}
          />
        </div>

        <div className="mt-6 grid gap-2">
          <span className={["h-2 rounded-full transition-colors duration-300", isSelected ? "bg-primary" : "bg-gold/30 group-hover:bg-primary/35"].join(" ")} />
          <span className="h-2 rounded-full bg-border transition-colors duration-300 group-hover:bg-primary/25" />
          <span className="h-2 w-4/5 rounded-full bg-border transition-colors duration-300 group-hover:bg-primary/25" />
          <span className="mt-3 h-2 rounded-full bg-panel" />
          <span className="h-2 w-2/3 rounded-full bg-panel" />
        </div>

        <span className={["mt-auto w-fit rounded-full border px-2.5 py-1 text-[10px] font-black", getStatusBadgeClass(document.status)].join(" ")}>
          {document.statusLabel}
        </span>
      </div>

      <div className="mt-4 min-w-0 flex-1">
        <h3 className="line-clamp-2 min-h-[3rem] break-words text-base font-black leading-6 text-title transition-colors duration-300 group-hover:text-primary">
          {document.filename}
        </h3>
        <p className="mt-2 truncate text-xs font-bold text-muted">{document.createdLabel}</p>
        <p
          className={[
            "mt-3 rounded-2xl border px-3 py-2 text-xs font-black transition-all duration-300",
            isSelected
              ? "border-primary/35 bg-primary/10 text-title"
              : "border-border bg-surface text-body group-hover:border-primary/50 group-hover:bg-panel group-hover:text-title",
          ].join(" ")}
        >
          {metaText}
        </p>
      </div>
    </button>
  );
}
