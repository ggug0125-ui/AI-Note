"use client";

import { CheckCircle2, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

type MobileCompleteDialogProps = {
  icon?: "check" | "sparkle";
  title: string;
  description: ReactNode;
  confirmText: string;
  onConfirm: () => void;
};

export function MobileCompleteDialog({
  icon = "check",
  title,
  description,
  confirmText,
  onConfirm,
}: MobileCompleteDialogProps) {
  const Icon = icon === "sparkle" ? Sparkles : CheckCircle2;

  return (
    <div data-swipe-ignore="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm">
      <section className="w-full max-w-xs rounded-3xl border border-border bg-surface p-5 text-center shadow-[0_18px_48px_rgba(47,36,24,0.22)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
          <Icon size={24} />
        </div>
        <h2 className="mt-4 text-xl font-black text-title">{title}</h2>
        <div className="mt-3 text-sm font-bold leading-6 text-body">{description}</div>
        <button
          type="button"
          onClick={onConfirm}
          className="mt-5 min-h-11 w-full rounded-2xl bg-primary px-4 text-sm font-black text-white shadow-soft transition active:scale-[0.98]"
        >
          {confirmText}
        </button>
      </section>
    </div>
  );
}
