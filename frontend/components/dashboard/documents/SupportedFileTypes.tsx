const supportedGroups = [
  {
    title: "현재 분석 가능",
    items: ["PDF", "TXT"],
    tone: "ai-badge-warning",
  },
  {
    title: "일부 변환 처리 지원",
    items: ["XLSX", "HWPX"],
    tone: "ai-badge-success",
  },
  {
    title: "준비 중",
    items: ["DOCX", "PPTX", "CSV", "MD"],
    tone: "ai-badge-info",
  },
];

export function SupportedFileTypes() {
  return (
    <section className="ai-card p-5">
      <p className="ai-modal-eyebrow text-[#8A7354]">Supported File Types</p>
      <h2 className="mt-2 text-xl font-black text-[#2F2418]">지원 파일 형식 안내</h2>
      <p className="ai-caption mt-3 font-bold">
        AI Note 2.0은 다양한 문서 형식을 지원하는 Workspace로 확장 중입니다.
      </p>

      <div className="mt-5 grid gap-3">
        {supportedGroups.map((group) => (
          <div key={group.title} className="ai-panel-compact">
            <p className="text-sm font-black text-[#2F2418]">{group.title}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {group.items.map((item) => (
                <span key={item} className={["ai-badge", group.tone].join(" ")}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
