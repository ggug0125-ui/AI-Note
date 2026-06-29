import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: number;
  icon: ReactNode;
};

export function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <article className="rounded-3xl border border-[#E9D8BD] bg-white p-5 shadow-[0_14px_34px_rgba(124,82,27,0.07)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#8A7354]">{label}</p>
          <strong className="mt-2 block text-4xl font-black text-[#2F2418]">{value}</strong>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF3E5] text-coral">
          {icon}
        </span>
      </div>
    </article>
  );
}
