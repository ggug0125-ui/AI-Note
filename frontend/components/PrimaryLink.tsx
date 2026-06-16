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
    primary: "bg-coral text-white shadow-soft hover:bg-red-500",
    secondary: "border border-black/10 bg-white/35 text-neutral-800 hover:bg-white/70 dark:border-white/15 dark:bg-white/10 dark:text-neutral-100 dark:hover:bg-white/15",
    light: "border border-white/50 bg-white/20 text-white hover:bg-white/30"
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
