import Link from "next/link";
import type { ReactNode } from "react";

type PrimaryLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "light";
};

export function PrimaryLink({ href, children, variant = "primary" }: PrimaryLinkProps) {
  if (href === "/login" && variant === "primary") {
    return null;
  }

  const styles = {
    primary: "bg-primary text-white shadow-soft hover:bg-primary/90",
    secondary: "border border-border bg-surface/70 text-body hover:bg-panel hover:text-title",
    light: "border border-border bg-surface/20 text-title hover:bg-surface/30"
  };

  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 w-full items-center justify-center rounded-full px-7 text-sm font-extrabold transition sm:w-auto ${styles[variant]}`}
    >
      {children}
    </Link>
  );
}
