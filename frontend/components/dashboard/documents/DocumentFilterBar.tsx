import type { DocumentFilter, DocumentSort } from "./types";

type DocumentFilterBarProps = {
  filter: DocumentFilter;
  sort: DocumentSort;
  totalCount: number;
  onFilterChange: (filter: DocumentFilter) => void;
  onSortChange: (sort: DocumentSort) => void;
};

const filters: Array<{ id: DocumentFilter; label: string }> = [
  { id: "recent", label: "최근 문서" },
  { id: "all", label: "전체 문서" },
  { id: "complete", label: "분석 완료" },
  { id: "processing", label: "분석중" },
  { id: "failed", label: "실패" },
];

export function DocumentFilterBar({
  filter,
  sort,
  totalCount,
  onFilterChange,
  onSortChange,
}: DocumentFilterBarProps) {
  return (
    <section className="ai-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="ai-modal-eyebrow text-[#8A7354]">Documents</p>
          <h2 className="mt-1 text-xl font-black text-[#2F2418]">문서 목록</h2>
          <p className="mt-1 text-sm font-bold text-[#6F5A40]">{totalCount.toLocaleString("en-US")}개 문서</p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onFilterChange(item.id)}
                className={[
                  "ai-btn h-9 min-h-9 px-3 py-0 text-xs",
                  filter === item.id
                    ? "ai-btn-active"
                    : "ai-btn-secondary",
                ].join(" ")}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[var(--ai-color-text-secondary)] lg:justify-end">
            정렬
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value as DocumentSort)}
              className="ai-select h-9 min-h-9 rounded-full px-3 py-0 text-sm font-bold normal-case tracking-normal"
            >
              <option value="latest">최신순</option>
              <option value="name">이름순</option>
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}
