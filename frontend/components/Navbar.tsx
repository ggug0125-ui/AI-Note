"use client";

import { BarChart3, FileText, FileUp, History, LogOut, Menu, MessageSquareText, Sparkles, Tags, UserCircle, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { CreditBadge } from "./CreditBadge";

export type DashboardTab = "assistant" | "pdf-analysis" | "summary" | "keywords" | "history" | "convert" | "mypage";

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
  { id: "convert", label: "엑셀·한글 변환", icon: FileUp },
  { id: "mypage", label: "마이페이지", icon: UserCircle }
];

type NavbarProps = {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  userName?: string;
  credits?: number;
  onLogout?: () => void;
};

function StatusBadge() {
  return (
    <span className="shrink-0 whitespace-nowrap rounded-full border border-gold/45 bg-panel px-2.5 py-1 text-xs font-bold text-body">
      FastAPI 연결됨
    </span>
  );
}

export function Navbar({ activeTab, onTabChange, userName, credits, onLogout }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function handleTabClick(tab: DashboardTab) {
    onTabChange(tab);
    setIsMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 text-title backdrop-blur">
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
                      ? "bg-title text-app shadow-soft"
                      : "border border-border bg-card text-body hover:border-primary/40 hover:bg-panel hover:text-title"
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
            <CreditBadge credits={credits} tone="blue" className="hidden lg:inline-flex" />
            {userName && (
              <span className="hidden max-w-28 truncate whitespace-nowrap text-xs font-bold text-body lg:inline">
                {userName}
              </span>
            )}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="hidden h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-extrabold text-body transition hover:border-primary/40 hover:bg-panel hover:text-primary sm:inline-flex"
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
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-body transition hover:border-primary/40 hover:bg-panel hover:text-title md:hidden"
            >
              {isMenuOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="grid gap-2 border-t border-border py-3 md:hidden">
            {userName && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-card px-3 py-2 text-sm font-bold text-body">
                <span className="truncate">{userName}</span>
                <CreditBadge credits={credits} tone="blue" />
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
                        ? "bg-title text-app shadow-soft"
                        : "border border-border bg-card text-body hover:border-primary/40 hover:bg-panel hover:text-title"
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
