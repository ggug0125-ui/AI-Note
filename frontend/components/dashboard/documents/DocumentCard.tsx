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
    return "border-[#E7D6B8] bg-[#FFF3E5] text-[#8A551F]";
  }
  if (normalized === "TXT") {
    return "border-[#BFD4F2] bg-[#EFF6FF] text-[#1D4F91]";
  }
  if (normalized === "DOCX" || normalized === "DOC") {
    return "border-[#BFD4F2] bg-[#EFF6FF] text-[#1D4F91]";
  }
  if (normalized === "PPTX" || normalized === "PPT") {
    return "border-[#F4C7A0] bg-[#FFF1E7] text-[#A34E1D]";
  }
  if (normalized === "XLSX" || normalized === "XLS" || normalized === "CSV") {
    return "border-[#BFE3C5] bg-[#EFFAF1] text-[#28713A]";
  }
  if (normalized === "HWPX" || normalized === "HWP") {
    return "border-[#DAC9F6] bg-[#F6F0FF] text-[#6740A5]";
  }
  return "border-[#D8DEE8] bg-[#F5F7FA] text-[#4B5C70]";
}

function getStatusBadgeClass(status: DocumentStatus) {
  if (status === "complete") {
    return "border-[#BFE3C5] bg-[#EFFAF1] text-[#28713A]";
  }
  if (status === "processing") {
    return "border-[#E7D6B8] bg-[#FFF6DA] text-[#7A551D]";
  }
  if (status === "failed") {
    return "border-[#E8A77A]/70 bg-[#FFF3EE] text-[#9A3E1F]";
  }
  return "border-[#E2D4BF] bg-white text-[#6F5A40]";
}

export function DocumentCard({ document, isSelected, onSelect }: DocumentCardProps) {
  const metaText = formatDocumentInfo(document);

  return (
    <button
      type="button"
      onClick={() => onSelect(document)}
      className={[
        "group relative flex h-full min-w-0 cursor-pointer flex-col rounded-3xl border p-4 text-left transition-all duration-300 ease-out focus:outline-none focus-visible:ring-4 focus-visible:ring-[#E8C77A]/35",
        isSelected
          ? "-translate-y-0.5 border-[#D89A3D] bg-[#FFF5E8] shadow-[0_20px_42px_rgba(184,103,38,0.18)] ring-2 ring-[#F0C36B]/45"
          : "border-[#E9D8BD] bg-white shadow-[0_10px_24px_rgba(124,82,27,0.06)] hover:-translate-y-1 hover:border-[#D8AE5E] hover:bg-[#FFFDF8] hover:shadow-[0_18px_36px_rgba(124,82,27,0.13)]",
      ].join(" ")}
    >
      {isSelected && (
        <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-[#E0B66D] bg-[#2F2418] px-2.5 py-1 text-[10px] font-black text-white shadow-[0_8px_18px_rgba(47,36,24,0.18)]">
          <CheckCircle2 size={13} />
          선택됨
        </span>
      )}

      <div
        className={[
          "relative mx-auto flex aspect-[3/4] w-full max-w-[168px] flex-col rounded-2xl border p-4 shadow-inner transition-all duration-300",
          isSelected
            ? "border-[#D8AE5E] bg-[#FFF8EE] shadow-[inset_0_0_0_1px_rgba(216,174,94,0.22)]"
            : "border-[#EAD8C1] bg-[#FFFDF8] group-hover:border-[#D8AE5E]/80 group-hover:bg-[#FFF8EE] group-hover:shadow-[inset_0_0_0_1px_rgba(216,174,94,0.14)]",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={["rounded-full border px-2.5 py-1 text-[10px] font-black", getExtensionBadgeClass(document.extension)].join(" ")}>
            {document.extension}
          </span>
          <FileText
            className={[
              "shrink-0 transition-colors duration-300",
              isSelected ? "text-coral" : "text-[#D8AE5E] group-hover:text-coral",
            ].join(" ")}
            size={18}
          />
        </div>

        <div className="mt-6 grid gap-2">
          <span className={["h-2 rounded-full transition-colors duration-300", isSelected ? "bg-[#D8AE5E]" : "bg-[#E9D8BD] group-hover:bg-[#E6C98F]"].join(" ")} />
          <span className="h-2 rounded-full bg-[#F0E3CF] transition-colors duration-300 group-hover:bg-[#EAD8C1]" />
          <span className="h-2 w-4/5 rounded-full bg-[#F0E3CF] transition-colors duration-300 group-hover:bg-[#EAD8C1]" />
          <span className="mt-3 h-2 rounded-full bg-[#F5EBDC]" />
          <span className="h-2 w-2/3 rounded-full bg-[#F5EBDC]" />
        </div>

        <span className={["mt-auto w-fit rounded-full border px-2.5 py-1 text-[10px] font-black", getStatusBadgeClass(document.status)].join(" ")}>
          {document.statusLabel}
        </span>
      </div>

      <div className="mt-4 min-w-0 flex-1">
        <h3 className="line-clamp-2 min-h-[3rem] break-words text-base font-black leading-6 text-[#2F2418] transition-colors duration-300 group-hover:text-[#1F1710]">
          {document.filename}
        </h3>
        <p className="mt-2 truncate text-xs font-bold text-[#8A7354]">{document.createdLabel}</p>
        <p
          className={[
            "mt-3 rounded-2xl border px-3 py-2 text-xs font-black transition-all duration-300",
            isSelected
              ? "border-[#D8AE5E] bg-white text-[#5F3608]"
              : "border-[#EAD8C1] bg-[#FFFDF8] text-[#6F5A40] group-hover:border-[#D9B16A] group-hover:bg-[#FFF8EE] group-hover:text-[#5F3608]",
          ].join(" ")}
        >
          {metaText}
        </p>
      </div>
    </button>
  );
}
