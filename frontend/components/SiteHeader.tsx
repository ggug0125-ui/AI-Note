"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { label: "기능", href: "#features" },
  { label: "사용법", href: "#how" },
  { label: "AI 어시스턴트", href: "/dashboard" },
  { label: "AI 타로", href: "/tarot" },
  { label: "요금", href: "#pricing" },
  { label: "후기", href: "#reviews" }
];

const TOKEN_KEY = "access_token";
const USER_KEY = "user";

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userLabel, setUserLabel] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    function syncAuthState() {
      const token = window.localStorage.getItem(TOKEN_KEY)?.trim();
      const hasToken = Boolean(token && token !== "undefined" && token !== "null");

      if (!hasToken) {
        setIsAuthenticated(false);
        setUserLabel("");
        return;
      }

      let nextUserLabel = "로그인됨";
      const rawUser = window.localStorage.getItem(USER_KEY);

      if (rawUser) {
        try {
          const user = JSON.parse(rawUser) as { name?: string; email?: string; role?: string };
          const name = user.name?.trim();
          const email = user.email?.trim();

          if (name) {
            nextUserLabel = `${name}님`;
          } else if (email) {
            nextUserLabel = email.includes("@") ? email.split("@")[0] : email;
          }
        } catch {
          nextUserLabel = "로그인됨";
        }
      }

      setIsAuthenticated(true);
      setUserLabel(nextUserLabel);
    }

    syncAuthState();
    window.addEventListener("storage", syncAuthState);
    window.addEventListener("focus", syncAuthState);

    return () => {
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener("focus", syncAuthState);
    };
  }, [pathname]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  function handleLogout() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    setIsAuthenticated(false);
    setUserLabel("");
    router.push("/login");
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#11100D]/80">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-10 text-sm font-semibold text-neutral-700 md:flex dark:text-neutral-300">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href} className="transition hover:text-coral">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle className="hidden sm:flex" />
            {isAuthenticated ? (
              <div className="hidden items-center gap-3 sm:flex">
                <span className="max-w-32 truncate text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  {userLabel}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-sm font-semibold text-neutral-700 transition hover:text-coral dark:text-neutral-300"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <Link href="/login" className="hidden text-sm font-semibold text-neutral-700 transition hover:text-coral sm:block dark:text-neutral-300">
                로그인
              </Link>
            )}
            <Link
              href="/login"
              className="!hidden rounded-full bg-coral px-5 py-3 text-sm font-extrabold text-white shadow-soft transition hover:bg-red-500"
            >
              무료로 시작하기
            </Link>
            <button
              type="button"
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={isMenuOpen}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-700 shadow-sm transition hover:border-coral/40 hover:text-coral dark:border-white/10 dark:bg-white/5 dark:text-neutral-100 dark:hover:text-white md:hidden"
            >
              {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="border-t border-black/5 py-3 dark:border-white/10 md:hidden">
            <nav className="grid gap-2 text-sm font-extrabold" aria-label="Mobile site menu">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-neutral-700 transition hover:border-coral/40 hover:text-coral dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-3 grid gap-2 border-t border-black/5 pt-3 dark:border-white/10">
              {isAuthenticated ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-neutral-50 px-4 py-3 text-sm font-bold text-neutral-700 dark:bg-white/5 dark:text-neutral-200">
                  <span className="min-w-0 truncate">{userLabel}</span>
                  <button type="button" onClick={handleLogout} className="shrink-0 font-extrabold text-coral">
                    로그아웃
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-extrabold text-neutral-700 transition hover:border-coral/40 hover:text-coral dark:border-white/10 dark:bg-white/5 dark:text-neutral-200"
                >
                  로그인
                </Link>
              )}
              <Link
                href="/login"
                className="!hidden rounded-2xl bg-coral px-4 py-3 text-center text-sm font-extrabold text-white shadow-soft transition hover:bg-red-500"
              >
                무료로 시작하기
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
