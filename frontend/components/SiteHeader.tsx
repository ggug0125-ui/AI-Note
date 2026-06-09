import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { label: "기능", href: "#features" },
  { label: "사용법", href: "#how" },
  { label: "후기", href: "#reviews" },
  { label: "요금", href: "#pricing" }
];

export function SiteHeader() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#11100D]/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Logo />
        <nav className="hidden items-center gap-10 text-sm font-semibold text-neutral-700 md:flex dark:text-neutral-300">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} className="transition hover:text-coral">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle className="hidden sm:flex" />
          <Link href="/login" className="hidden text-sm font-semibold text-neutral-700 transition hover:text-coral sm:block dark:text-neutral-300">
            로그인
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-coral px-5 py-3 text-sm font-extrabold text-white shadow-soft transition hover:bg-red-500"
          >
            무료로 시작하기
          </Link>
        </div>
      </div>
    </header>
  );
}
