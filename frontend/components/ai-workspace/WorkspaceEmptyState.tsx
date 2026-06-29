import type { ReactNode } from "react";

type WorkspaceEmptyStateProps = {
  children: string;
  icon?: ReactNode;
  className?: string;
};

export function WorkspaceEmptyState({ children, icon, className = "" }: WorkspaceEmptyStateProps) {
  return (
    <div className={["ai-panel-compact flex items-center gap-2 bg-neutral-50 text-sm font-bold text-neutral-500", className].filter(Boolean).join(" ")}>
      {icon && <span className="shrink-0 text-coral">{icon}</span>}
      <p>{children}</p>
    </div>
  );
}
