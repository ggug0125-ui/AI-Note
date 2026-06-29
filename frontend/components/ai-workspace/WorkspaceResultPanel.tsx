import type { ReactNode } from "react";

type WorkspaceResultPanelProps = {
  children: ReactNode;
  className?: string;
};

export function WorkspaceResultPanel({ children, className = "" }: WorkspaceResultPanelProps) {
  return (
    <div className={["ai-panel-result mt-5 min-h-72 p-5", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
