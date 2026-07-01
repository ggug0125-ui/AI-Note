import type { ReactNode } from "react";

type WorkspaceOptionButtonProps = {
  children: ReactNode;
  isSelected: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export function WorkspaceOptionButton({ children, isSelected, disabled = false, onClick }: WorkspaceOptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "ai-btn min-h-14 justify-start rounded-xl px-4 text-left text-sm",
        isSelected ? "ai-btn-active" : "ai-btn-secondary bg-surface",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
