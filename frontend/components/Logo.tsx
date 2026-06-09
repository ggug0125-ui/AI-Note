import { Sparkles } from "lucide-react";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 whitespace-nowrap" aria-label="NoteFlow AI home">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-coral text-white shadow-soft">
        <Sparkles size={21} strokeWidth={2.4} />
      </span>
      <span className="whitespace-nowrap text-lg font-extrabold text-ink dark:text-white">NoteFlow AI</span>
    </Link>
  );
}
