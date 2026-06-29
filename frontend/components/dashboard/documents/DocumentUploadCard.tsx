import { ChangeEvent, DragEvent, useState } from "react";
import { CreditCard, FileUp, UploadCloud } from "lucide-react";

type DocumentUploadCardProps = {
  selectedFile: File | null;
  disabled: boolean;
  isPreparing: boolean;
  isUploading: boolean;
  onFileSelect: (file: File | null) => void;
  onFileDrop: (file: File) => void;
  onUploadClick: () => void;
};

export function DocumentUploadCard({
  selectedFile,
  disabled,
  isPreparing,
  isUploading,
  onFileSelect,
  onFileDrop,
  onUploadClick,
}: DocumentUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    onFileSelect(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function handleDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (disabled) {
      return;
    }

    const file = event.dataTransfer.files?.[0];
    if (file) {
      onFileDrop(file);
    }
  }

  const uploadButtonText = isPreparing ? "확인 중" : isUploading ? "업로드 중" : "분석 시작";

  return (
    <section className="ai-panel-upload p-5">
      <div className="flex items-start gap-4">
        <div className="ai-modal-icon h-12 w-12">
          <UploadCloud size={23} />
        </div>
        <div>
          <p className="ai-modal-eyebrow text-[#8A7354]">Document Center</p>
          <h2 className="mt-2 text-2xl font-black text-[#2F2418]">문서 업로드</h2>
          <p className="ai-caption mt-3 font-bold">
            분석할 문서를 업로드하면 요약, 키워드, AI 채팅에 사용할 검색 인덱스가 생성됩니다.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <input
          id="document-upload-input"
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          className="hidden"
          disabled={disabled}
          onChange={handleFileChange}
        />
        <label
          htmlFor="document-upload-input"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={[
            "ai-upload-zone",
            disabled ? "is-disabled" : "",
            isDragging
              ? "border-coral bg-[#FFF0E8] shadow-[0_16px_34px_rgba(232,137,92,0.14)]"
              : "",
          ].join(" ")}
        >
          <div className="ai-icon-btn h-14 w-14 rounded-2xl text-coral">
            <FileUp size={26} />
          </div>
          <p className="mt-5 text-lg font-black text-[var(--ai-color-text-primary)]">
            {isDragging ? "여기에 놓으면 업로드됩니다." : "파일을 끌어다 놓으세요."}
          </p>
          <p className="mt-2 text-sm font-bold text-[#7A4A12]">또는 파일을 선택하세요.</p>
          {selectedFile && (
            <p className="ai-badge mt-4 max-w-full [overflow-wrap:anywhere]">
              {selectedFile.name}
            </p>
          )}
        </label>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="ai-panel-compact bg-white/75">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[var(--ai-color-text-secondary)]">
            <CreditCard size={16} className="text-coral" />
            지원 파일
          </div>
          <p className="ai-caption mt-2 font-bold">
            현재 PDF / TXT 업로드를 지원합니다. DOCX / XLSX / PPTX / HWPX는 이후 지원 예정입니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onUploadClick}
          disabled={disabled || !selectedFile}
          className="ai-btn ai-btn-primary min-h-12 px-5"
        >
          <FileUp className="mr-2" size={18} />
          {uploadButtonText}
        </button>
      </div>
    </section>
  );
}
