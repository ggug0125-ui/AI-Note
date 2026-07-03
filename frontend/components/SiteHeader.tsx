"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";
import { CreditBadge } from "./CreditBadge";

const navItems = [
  { label: "기능", href: "#features" },
  { label: "사용법", href: "/guide" },
  { label: "AI 어시스턴트", href: "/dashboard" },
  { label: "AI 타로", href: "/tarot" },
  { label: "내정보", href: "/mypage" },
  { label: "요금", href: "/pricing" },
  { label: "후기", href: "/reviews" }
];

const TOKEN_KEY = "access_token";
const USER_KEY = "user";

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userLabel, setUserLabel] = useState("");
  const [credits, setCredits] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    async function refreshCredits() {
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/credits/me`);
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        const nextCredits = Number(data.credits || data.user?.credits || 0);
        setCredits(nextCredits);
        if (data.user) {
          window.localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        }
      } catch {
        // Keep the locally cached auth state if credit refresh fails.
      }
    }

    function syncAuthState() {
      const token = window.localStorage.getItem(TOKEN_KEY)?.trim();
      const hasToken = Boolean(token && token !== "undefined" && token !== "null");

      if (!hasToken) {
        setIsAuthenticated(false);
        setUserLabel("");
        setCredits(0);
        return;
      }

      let nextUserLabel = "로그인됨";
      const rawUser = window.localStorage.getItem(USER_KEY);

      if (rawUser) {
        try {
          const user = JSON.parse(rawUser) as { name?: string; email?: string; role?: string; credits?: number };
          const name = user.name?.trim();
          const email = user.email?.trim();
          setCredits(Number(user.credits || 0));

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
      void refreshCredits();
    }

    syncAuthState();
    window.addEventListener("storage", syncAuthState);
    window.addEventListener("focus", syncAuthState);
    window.addEventListener("credits:refresh", refreshCredits);

    return () => {
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener("focus", syncAuthState);
      window.removeEventListener("credits:refresh", refreshCredits);
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
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-surface/85 text-title backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-10 text-sm font-semibold text-body md:flex">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href} className="transition hover:text-primary">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle className="hidden sm:flex" />
            {isAuthenticated ? (
              <div className="hidden items-center gap-3 sm:flex">
                <span className="max-w-32 truncate text-sm font-semibold text-body">
                  {userLabel}
                </span>
                <CreditBadge credits={credits} tone="blue" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-sm font-semibold text-body transition hover:text-primary"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <Link href="/login" className="hidden text-sm font-semibold text-body transition hover:text-primary sm:block">
                로그인
              </Link>
            )}
            <Link
              href="/login"
              className="!hidden rounded-full bg-primary px-5 py-3 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
            >
              무료로 시작하기
            </Link>
            <button
              type="button"
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={isMenuOpen}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-body shadow-sm transition hover:border-primary/40 hover:bg-panel hover:text-title md:hidden"
            >
              {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="border-t border-border py-3 md:hidden">
            <nav className="grid gap-2 text-sm font-extrabold" aria-label="Mobile site menu">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-2xl border border-border bg-card px-4 py-3 text-body transition hover:border-primary/40 hover:bg-panel hover:text-title"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-3 grid gap-2 border-t border-border pt-3">
              {isAuthenticated ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 text-sm font-bold text-body">
                  <span className="min-w-0 truncate">{userLabel}</span>
                  <CreditBadge credits={credits} tone="blue" />
                  <button type="button" onClick={handleLogout} className="shrink-0 font-extrabold text-primary">
                    로그아웃
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-extrabold text-body transition hover:border-primary/40 hover:bg-panel hover:text-title"
                >
                  로그인
                </Link>
              )}
              <Link
                href="/login"
                className="!hidden rounded-2xl bg-primary px-4 py-3 text-center text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
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
