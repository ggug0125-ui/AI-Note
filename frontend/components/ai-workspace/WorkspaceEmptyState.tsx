type WorkspaceEmptyStateProps = {
  children: string;
  className?: string;
};

export function WorkspaceEmptyState({ children, className = "" }: WorkspaceEmptyStateProps) {
  return (
    <p className={["ai-panel-compact bg-neutral-50 text-sm text-neutral-500", className].filter(Boolean).join(" ")}>
      {children}
    </p>
  );
}
