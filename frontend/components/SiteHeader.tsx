"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { label: "기능", href: "#features" },
  { label: "사용법", href: "#how" },
  { label: "AI 타로", href: "/tarot" },
  { label: "후기", href: "#reviews" },
  { label: "요금", href: "#pricing" }
];

const TOKEN_KEY = "access_token";
const USER_KEY = "user";

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userLabel, setUserLabel] = useState("");

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

  function handleLogout() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    setIsAuthenticated(false);
    setUserLabel("");
    router.push("/login");
  }

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
            className="rounded-full bg-coral px-5 py-3 text-sm font-extrabold text-white shadow-soft transition hover:bg-red-500"
          >
            무료로 시작하기
          </Link>
        </div>
      </div>
    </header>
  );
}
