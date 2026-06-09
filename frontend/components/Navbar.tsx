"use client";

import { BarChart3, FileText, FileUp, History, LogOut, Menu, MessageSquareText, Sparkles, Tags, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export type DashboardTab = "assistant" | "pdf-analysis" | "summary" | "keywords" | "history" | "convert";

type NavItem = {
  id: DashboardTab;
  label: string;
  icon: typeof FileText;
};

const navItems: NavItem[] = [
  { id: "assistant", label: "AI 문서 어시스턴트", icon: MessageSquareText },
  { id: "pdf-analysis", label: "PDF 문서 분석", icon: BarChart3 },
  { id: "summary", label: "AI 자동 요약", icon: Sparkles },
  { id: "keywords", label: "키워드 추출", icon: Tags },
  { id: "history", label: "작업 기록", icon: History },
  { id: "convert", label: "엑셀·한글 변환", icon: FileUp }
];

type NavbarProps = {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  userName?: string;
  onLogout?: () => void;
};

function StatusBadge() {
  return (
    <span className="shrink-0 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
      FastAPI 연결됨
    </span>
  );
}

export function Navbar({ activeTab, onTabChange, userName, onLogout }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function handleTabClick(tab: DashboardTab) {
    onTabChange(tab);
    setIsMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[#F8F4EC]/95 backdrop-blur dark:border-white/10 dark:bg-[#11100D]/95">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-col px-4 md:h-16 md:px-6">
        <div className="flex h-16 min-w-0 items-center gap-1.5 md:gap-3">
          <div className="flex min-w-0 shrink-0 items-center gap-1.5 md:gap-3">
            <Logo />
            <StatusBadge />
          </div>

          <nav className="scrollbar-hide hidden min-w-0 flex-1 flex-nowrap gap-1.5 overflow-x-auto md:flex" aria-label="Dashboard menu">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  className={[
                    "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-sm font-extrabold transition",
                    isActive
                      ? "bg-ink text-white shadow-soft dark:bg-white dark:text-ink"
                      : "border border-black/10 bg-white text-neutral-600 hover:border-coral/40 hover:text-ink dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:text-white"
                  ].join(" ")}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="shrink-0" size={16} strokeWidth={2.2} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {userName && (
              <span className="hidden max-w-28 truncate whitespace-nowrap text-xs font-bold text-neutral-600 dark:text-neutral-300 lg:inline">
                {userName}
              </span>
            )}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="hidden h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-black/10 bg-white px-3 text-xs font-extrabold text-neutral-600 transition hover:border-coral/40 hover:text-coral dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:text-white sm:inline-flex"
              >
                <LogOut size={14} />
                로그아웃
              </button>
            )}
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={isMenuOpen}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition hover:bg-neutral-200 dark:bg-white/10 dark:text-neutral-100 dark:hover:bg-white/20 md:hidden"
            >
              {isMenuOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="grid gap-2 border-t border-black/10 py-3 dark:border-white/10 md:hidden">
            {userName && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-neutral-600 dark:bg-white/5 dark:text-neutral-300">
                <span className="truncate">{userName}</span>
                {onLogout && (
                  <button type="button" onClick={onLogout} className="shrink-0 text-coral">
                    로그아웃
                  </button>
                )}
              </div>
            )}
            <nav className="grid gap-2" aria-label="Mobile dashboard menu">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabClick(item.id)}
                    className={[
                      "inline-flex h-11 w-full items-center gap-2 whitespace-nowrap rounded-xl px-3 text-left text-sm font-extrabold transition",
                      isActive
                        ? "bg-ink text-white shadow-soft dark:bg-white dark:text-ink"
                        : "border border-black/10 bg-white text-neutral-600 hover:border-coral/40 hover:text-ink dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:text-white"
                    ].join(" ")}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="shrink-0" size={16} strokeWidth={2.2} />
                    <span className="truncate whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
