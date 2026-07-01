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
      className="rounded-2xl border border-border bg-panel p-4 text-left transition hover:-translate-y-0.5 hover:border-gold hover:bg-surface hover:shadow-soft"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/15 text-primary">
        {icon}
      </span>
      <strong className="mt-4 block text-base font-black text-title">{title}</strong>
      <span className="mt-2 block text-sm font-bold leading-6 text-body">{description}</span>
    </button>
  );
}
