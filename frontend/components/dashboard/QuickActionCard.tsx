import type { ReactNode } from "react";

type QuickActionCardProps = {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
};

export function QuickActionCard({ title, description, icon, onClick }: QuickActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-[#EAD8C1] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#D8AE5E] hover:shadow-[0_12px_26px_rgba(124,82,27,0.12)]"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF3E5] text-coral">
        {icon}
      </span>
      <strong className="mt-4 block text-base font-black text-[#2F2418]">{title}</strong>
      <span className="mt-2 block text-sm font-bold leading-6 text-[#6F5A40]">{description}</span>
    </button>
  );
}
