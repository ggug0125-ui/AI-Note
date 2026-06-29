type WorkspaceLoadingStateProps = {
  message: string;
  isLoading?: boolean;
  className?: string;
};

export function WorkspaceLoadingState({ message, isLoading = false, className = "" }: WorkspaceLoadingStateProps) {
  return (
    <p
      aria-live="polite"
      aria-busy={isLoading}
      className={["ai-alert mt-4", className].filter(Boolean).join(" ")}
    >
      {message}
    </p>
  );
}
