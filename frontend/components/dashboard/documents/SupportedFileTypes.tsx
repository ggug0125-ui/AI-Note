const supportedGroups = [
  {
    title: "현재 분석 가능",
    items: ["PDF", "TXT"],
    tone: "border-[#E7D6B8] bg-[#FFF3E5] text-[#8A551F]",
  },
  {
    title: "일부 변환 처리 지원",
    items: ["XLSX", "HWPX"],
    tone: "border-[#BFE3C5] bg-[#EFFAF1] text-[#28713A]",
  },
  {
    title: "준비 중",
    items: ["DOCX", "PPTX", "CSV", "MD"],
    tone: "border-[#D8DEE8] bg-[#F5F7FA] text-[#4B5C70]",
  },
];

export function SupportedFileTypes() {
  return (
    <section className="rounded-3xl border border-[#E9D8BD] bg-white p-5 shadow-[0_14px_34px_rgba(124,82,27,0.07)]">
      <p className="text-xs font-black uppercase tracking-wide text-[#8A7354]">Supported File Types</p>
      <h2 className="mt-2 text-xl font-black text-[#2F2418]">지원 파일 형식 안내</h2>
      <p className="mt-3 text-sm font-bold leading-6 text-[#6F5A40]">
        AI Note 2.0은 다양한 문서 형식을 지원하는 Workspace로 확장 중입니다.
      </p>

      <div className="mt-5 grid gap-3">
        {supportedGroups.map((group) => (
          <div key={group.title} className="rounded-2xl border border-[#EAD8C1] bg-[#FFFDF8] p-4">
            <p className="text-sm font-black text-[#2F2418]">{group.title}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {group.items.map((item) => (
                <span key={item} className={["rounded-full border px-3 py-1 text-xs font-black", group.tone].join(" ")}>
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
