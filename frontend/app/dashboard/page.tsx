"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  BarChart3,
  FileSearch,
  FileText,
  History,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import { ChatDocument } from "../../components/ChatDocument";
import { CreditBadge } from "../../components/CreditBadge";
import { DashboardOverview } from "../../components/dashboard/DashboardOverview";
import { DocumentCenter } from "../../components/dashboard/documents/DocumentCenter";
import { MobileWorkspace } from "../../components/dashboard/mobile/MobileWorkspace";
import type { WorkspaceTab } from "../../components/dashboard/types";
import { FileConvert } from "../../components/FileConvert";
import { HistoryDashboard } from "../../components/HistoryDashboard";
import { KeywordExtract } from "../../components/KeywordExtract";
import { Navbar, type DashboardTab } from "../../components/Navbar";
import { SiteHeader } from "../../components/SiteHeader";
import { Summary } from "../../components/Summary";
import { ThemeToggle } from "../../components/ThemeToggle";
import { API_BASE_URL } from "@/lib/api";

const TOKEN_KEY = "access_token";
const USER_KEY = "user";

type AuthUser = {
  user_id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  plan: "Admin" | "Free";
  credits?: number;
};

type WorkspacePanel = WorkspaceTab | "mypage";

const workspaceTabs: Array<{ id: WorkspaceTab; label: string; icon: typeof FileText }> = [
  { id: "overview", label: "대시보드", icon: Sparkles },
  { id: "documents", label: "문서 업로드", icon: FileSearch },
  { id: "analysis", label: "문서 분석", icon: BarChart3 },
  { id: "chat", label: "AI 채팅", icon: MessageSquareText },
  { id: "convert", label: "파일 변환", icon: ArrowRightLeft },
  { id: "history", label: "작업기록", icon: History },
];

const mobileWorkspaceTabs: Array<{ id: WorkspaceTab; shortLabel: string; icon: typeof FileText }> = [
  { id: "overview", shortLabel: "대시보드", icon: Sparkles },
  { id: "documents", shortLabel: "문서", icon: FileSearch },
  { id: "analysis", shortLabel: "분석", icon: BarChart3 },
  { id: "chat", shortLabel: "채팅", icon: MessageSquareText },
  { id: "convert", shortLabel: "변환", icon: ArrowRightLeft },
  { id: "history", shortLabel: "기록", icon: History },
];
function clearAuthStorage() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

const workspaceNavigationTabs: Array<{ id: WorkspaceTab; label: string; icon: typeof FileText }> = [
  { id: "overview", label: "대시보드", icon: Sparkles },
  { id: "documents", label: "문서 업로드", icon: FileSearch },
  { id: "analysis", label: "문서 분석", icon: BarChart3 },
  { id: "chat", label: "AI 채팅", icon: MessageSquareText },
  { id: "convert", label: "파일 변환", icon: ArrowRightLeft },
  { id: "history", label: "작업 기록", icon: History },
];

const mobileNavigationTabs: Array<{ id: WorkspaceTab; shortLabel: string; icon: typeof FileText }> = [
  { id: "overview", shortLabel: "대시보드", icon: Sparkles },
  { id: "documents", shortLabel: "문서", icon: FileSearch },
  { id: "analysis", shortLabel: "분석", icon: BarChart3 },
  { id: "chat", shortLabel: "채팅", icon: MessageSquareText },
  { id: "convert", shortLabel: "변환", icon: ArrowRightLeft },
  { id: "history", shortLabel: "기록", icon: History },
];

function workspaceToDashboardTab(tab: WorkspacePanel): DashboardTab {
  const mapping: Record<WorkspacePanel, DashboardTab> = {
    overview: "assistant",
    documents: "pdf-analysis",
    analysis: "summary",
    chat: "assistant",
    convert: "convert",
    history: "history",
    mypage: "mypage",
  };

  return mapping[tab];
}

function dashboardToWorkspacePanel(tab: DashboardTab): WorkspacePanel {
  const mapping: Record<DashboardTab, WorkspacePanel> = {
    assistant: "chat",
    "pdf-analysis": "documents",
    summary: "analysis",
    keywords: "analysis",
    history: "history",
    convert: "convert",
    mypage: "mypage",
  };

  return mapping[tab];
}

function useMobileWorkspace() {
  const [isMobileWorkspace, setIsMobileWorkspace] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateViewportMode = () => setIsMobileWorkspace(mediaQuery.matches);

    updateViewportMode();
    mediaQuery.addEventListener("change", updateViewportMode);

    return () => mediaQuery.removeEventListener("change", updateViewportMode);
  }, []);

  return isMobileWorkspace;
}

export default function DashboardPage() {
  const router = useRouter();
  const [activePanel, setActivePanel] = useState<WorkspacePanel>("overview");
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const isAdmin = user?.role === "admin";
  const navbarActiveTab = workspaceToDashboardTab(activePanel);
  const isMobileWorkspace = useMobileWorkspace();

  useEffect(() => {
    console.log("[dashboard-activePanel]", activePanel);
  }, [activePanel]);

  useEffect(() => {
    async function verifyToken() {
      const token = window.localStorage.getItem(TOKEN_KEY);
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Token verification failed");
        }

        const data = await response.json();
        setUser(data.user);
        window.localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setIsCheckingAuth(false);
      } catch {
        clearAuthStorage();
        router.replace("/login");
      }
    }

    verifyToken();
  }, [router]);

  const refreshCurrentUser = useCallback(async () => {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return;
    }

    const response = await fetch(`${API_BASE_URL}/credits/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    setUser(data.user);
    window.localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }, []);

  useEffect(() => {
    const handleCreditsRefresh = () => {
      void refreshCurrentUser();
    };

    window.addEventListener("credits:refresh", handleCreditsRefresh);
    return () => window.removeEventListener("credits:refresh", handleCreditsRefresh);
  }, [refreshCurrentUser]);

  async function handleLogout() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => undefined);
    }

    clearAuthStorage();
    router.replace("/login");
  }

  function handleNavbarTabChange(tab: DashboardTab) {
    setActivePanel(dashboardToWorkspacePanel(tab));
  }

  function handleWorkspaceTabChange(tab: WorkspaceTab) {
    console.log("[dashboard-onNavigate]", tab);
    setActivePanel(tab);
  }

  const handleDocumentSelect = useCallback((documentId: string) => {
    setSelectedDocumentId(documentId);
  }, []);

  if (isCheckingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-app px-4 text-title">
        <p className="rounded-2xl bg-card px-5 py-4 text-sm font-bold shadow-sm">
          로그인 상태를 확인하고 있습니다...
        </p>
      </main>
    );
  }

  if (isMobileWorkspace) {
    const mobileActivePanel = activePanel === "mypage" ? "overview" : activePanel;
    return (
      <main className="h-[100dvh] overflow-hidden overflow-x-hidden bg-app text-title md:hidden">
        <header className="sticky top-0 z-30 border-b border-border bg-surface/95 px-2.5 py-0.5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 leading-none">
              <p className="truncate text-xs font-black uppercase tracking-wide text-title">AI Note 2.0</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <CreditBadge credits={user?.credits} tone="blue" className="max-w-[7.25rem] px-2.5 py-1 text-[0.68rem]" />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <section className="h-[calc(100dvh-2.55rem)] overflow-hidden px-2.5 pb-[calc(4.55rem+env(safe-area-inset-bottom))] pt-2">
          <div className="h-full overflow-hidden rounded-2xl border border-border bg-surface/60 p-2.5 shadow-soft">
            <div className="mx-auto grid h-full min-h-0 max-w-xl content-start transition-all duration-200 ease-out">
              <MobileWorkspace
                activePanel={mobileActivePanel}
                selectedDocumentId={selectedDocumentId}
                credits={user?.credits}
                onNavigate={handleWorkspaceTabChange}
                onDocumentSelect={handleDocumentSelect}
                onCreditsRefresh={refreshCurrentUser}
              />
            </div>
          </div>
        </section>

        <nav
          aria-label="Mobile workspace tabs"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-2 pb-[calc(0.35rem+env(safe-area-inset-bottom))] pt-1 shadow-[0_-12px_28px_rgba(47,36,24,0.12)] backdrop-blur-xl"
        >
          <div className="mx-auto grid max-w-xl grid-cols-6 gap-1">
            {mobileNavigationTabs.map((item) => {
              const Icon = item.icon;
              const isActive = mobileActivePanel === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleWorkspaceTabChange(item.id)}
                  className={[
                    "flex min-h-[2.75rem] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[0.6rem] font-black leading-tight transition-all duration-200 active:scale-95",
                    isActive
                      ? "scale-[1.03] border border-primary bg-primary text-white shadow-soft"
                      : "border border-border bg-card text-body hover:border-primary/40 hover:bg-panel hover:text-title active:border-primary/50",
                  ].join(" ")}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon size={15} strokeWidth={2.4} />
                  <span className="max-w-full truncate">{item.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-app text-title">
      <SiteHeader />
      <Navbar
        activeTab={navbarActiveTab}
        onTabChange={handleNavbarTabChange}
        userName={user?.name}
        credits={user?.credits}
        onLogout={handleLogout}
      />

      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 md:px-8 md:py-8">
        <section className="rounded-3xl border border-border bg-[linear-gradient(135deg,rgb(var(--ai-card))_0%,rgb(var(--ai-panel))_56%,rgb(var(--ai-surface))_100%)] p-5 shadow-soft md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-wide text-muted">AI Note 2.0</p>
              <h1 className="mt-2 text-4xl font-black text-title sm:text-5xl">AI Workspace</h1>
              <p className="mt-4 text-base font-bold leading-7 text-body">
                문서를 업로드하고, 분석하고, 변환하고, AI와 대화하세요.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
              <CreditBadge credits={user?.credits} tone="blue" />
              <div className="flex items-center gap-3 rounded-2xl border border-gold/70 bg-card/70 px-4 py-3 text-sm font-bold text-body">
                <span className="max-w-40 truncate">{user?.name}</span>
                <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-black text-gold">
                  {user?.plan}
                </span>
              </div>
            </div>
          </div>
        </section>

        <nav
          aria-label="AI Workspace menu"
          className="grid gap-2 rounded-3xl border border-border bg-card p-2 shadow-sm sm:grid-cols-2 lg:grid-cols-6"
        >
          {workspaceNavigationTabs.map((item) => {
            const Icon = item.icon;
            const isActive = activePanel === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleWorkspaceTabChange(item.id)}
                className={[
                  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black transition",
                  isActive
                    ? "border border-primary bg-primary text-white shadow-soft hover:bg-primary/90"
                    : "border border-border bg-card text-body hover:-translate-y-0.5 hover:border-primary/40 hover:bg-panel hover:text-title",
                ].join(" ")}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {activePanel === "overview" && <DashboardOverview onNavigate={handleWorkspaceTabChange} />}
        {activePanel === "documents" && (
          <DocumentCenter
            onNavigate={handleWorkspaceTabChange}
            selectedDocumentId={selectedDocumentId}
            onDocumentSelect={handleDocumentSelect}
            isAdmin={isAdmin}
          />
        )}
        {activePanel === "analysis" && (
          <div className="grid gap-6">
            <Summary />
            <KeywordExtract />
          </div>
        )}
        {activePanel === "chat" && (
          <ChatDocument
            isAdmin={isAdmin}
            selectedFileId={selectedDocumentId}
            onOpenDocuments={() => handleWorkspaceTabChange("documents")}
          />
        )}
        {activePanel === "convert" && <FileConvert />}
        {activePanel === "history" && <HistoryDashboard />}
        {activePanel === "mypage" && user && <MyPage user={user} />}
      </div>
    </main>
  );
}

function MyPage({ user }: { user: AuthUser }) {
  const isAdmin = user.role === "admin";

  return (
    <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <span className="text-xs font-extrabold uppercase tracking-wide text-primary">Profile</span>
        <h2 className="mt-3 text-2xl font-black text-title">{user.name}</h2>
        <p className="mt-2 text-sm font-semibold text-muted">{user.email}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <InfoCard label="등급" value={user.plan} />
          <InfoCard label="권한 상태" value={isAdmin ? "관리자" : "일반 회원"} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <span className="text-xs font-extrabold uppercase tracking-wide text-primary">Access</span>
        <h3 className="mt-3 text-xl font-black text-title">AI 문서 어시스턴트</h3>
        <p className="mt-4 rounded-2xl bg-panel p-5 text-sm font-bold leading-7 text-body">
          {isAdmin
            ? "관리자는 모든 AI 문서 어시스턴트 기능을 사용할 수 있습니다."
            : "현재 일반 회원은 AI 문서 어시스턴트 이용이 제한되어 있습니다."}
        </p>
      </div>
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-border bg-panel p-4">
      <p className="text-xs font-bold text-muted">{label}</p>
      <strong className="mt-2 block text-lg font-black text-title">{value}</strong>
    </article>
  );
}
