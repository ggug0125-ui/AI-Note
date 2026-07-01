import type { ReactNode } from "react";

type WorkspaceSectionProps = {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function WorkspaceSection({ icon, title, description, children, className = "" }: WorkspaceSectionProps) {
  return (
    <div className={["ai-card p-6", className].filter(Boolean).join(" ")}>
      {icon && (
        <div className="ai-modal-icon h-12 w-12 rounded-xl">
          {icon}
        </div>
      )}
      {title && <h2 className="mt-5 text-2xl font-black text-title">{title}</h2>}
      {description && (
        <p className="ai-caption mt-3 leading-7">{description}</p>
      )}
      {children}
    </div>
  );
}
