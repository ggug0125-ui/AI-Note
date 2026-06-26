"use client";

import { useEffect, useState } from "react";
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
import { Overview } from "../../components/dashboard/Overview";
import { FileConvert } from "../../components/FileConvert";
import { HistoryDashboard } from "../../components/HistoryDashboard";
import { KeywordExtract } from "../../components/KeywordExtract";
import { Navbar, type DashboardTab } from "../../components/Navbar";
import { PdfAnalysis } from "../../components/PdfAnalysis";
import { SiteHeader } from "../../components/SiteHeader";
import { Summary } from "../../components/Summary";
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

export type WorkspaceTab = "overview" | "documents" | "analysis" | "chat" | "convert" | "history";
type WorkspacePanel = WorkspaceTab | "mypage";

const workspaceTabs: Array<{ id: WorkspaceTab; label: string; icon: typeof FileText }> = [
  { id: "overview", label: "Overview", icon: Sparkles },
  { id: "documents", label: "Documents", icon: FileSearch },
  { id: "analysis", label: "Analysis", icon: BarChart3 },
  { id: "chat", label: "AI Chat", icon: MessageSquareText },
  { id: "convert", label: "Convert", icon: ArrowRightLeft },
  { id: "history", label: "History", icon: History },
];

function clearAuthStorage() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

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

export default function DashboardPage() {
  const router = useRouter();
  const [activePanel, setActivePanel] = useState<WorkspacePanel>("overview");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const isAdmin = user?.role === "admin";
  const navbarActiveTab = workspaceToDashboardTab(activePanel);

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
    setActivePanel(tab);
  }

  if (isCheckingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F2EC] px-4 text-ink">
        <p className="rounded-2xl bg-white px-5 py-4 text-sm font-bold shadow-sm">
          로그인 상태를 확인하고 있습니다...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F5F2EC] text-ink">
      <SiteHeader />
      <Navbar
        activeTab={navbarActiveTab}
        onTabChange={handleNavbarTabChange}
        userName={user?.name}
        credits={user?.credits}
        onLogout={handleLogout}
      />

      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 md:px-8 md:py-8">
        <section className="rounded-3xl border border-[#E9D8BD] bg-[linear-gradient(135deg,#FFFDF8_0%,#FFF8EE_56%,#F7EFE2_100%)] p-5 shadow-[0_18px_45px_rgba(124,82,27,0.08)] md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-wide text-[#8A6A35]">AI Note 2.0</p>
              <h1 className="mt-2 text-4xl font-black text-[#2F2418] sm:text-5xl">AI Workspace</h1>
              <p className="mt-4 text-base font-bold leading-7 text-[#6F5A40]">
                문서를 업로드하고, 분석하고, 변환하고, AI와 대화하세요.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
              <CreditBadge credits={user?.credits} tone="blue" />
              <div className="flex items-center gap-3 rounded-2xl border border-[#E2C985]/70 bg-white/70 px-4 py-3 text-sm font-bold text-[#6F5A40]">
                <span className="max-w-40 truncate">{user?.name}</span>
                <span className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-black text-[#7A551D]">
                  {user?.plan}
                </span>
              </div>
            </div>
          </div>
        </section>

        <nav
          aria-label="AI Workspace menu"
          className="grid gap-2 rounded-3xl border border-black/10 bg-white p-2 shadow-sm sm:grid-cols-2 lg:grid-cols-6"
        >
          {workspaceTabs.map((item) => {
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
                    ? "bg-[#2F2418] text-white shadow-[0_12px_24px_rgba(47,36,24,0.18)]"
                    : "border border-black/10 bg-[#FFFDF8] text-[#6F5A40] hover:border-[#D8AE5E] hover:bg-[#FFF8EE] hover:text-[#2F2418]",
                ].join(" ")}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {activePanel === "overview" && <Overview onNavigate={handleWorkspaceTabChange} />}
        {activePanel === "documents" && <PdfAnalysis />}
        {activePanel === "analysis" && (
          <div className="grid gap-6">
            <Summary />
            <KeywordExtract />
          </div>
        )}
        {activePanel === "chat" && <ChatDocument isAdmin={isAdmin} />}
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
      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <span className="text-xs font-extrabold uppercase tracking-wide text-coral">Profile</span>
        <h2 className="mt-3 text-2xl font-black text-ink">{user.name}</h2>
        <p className="mt-2 text-sm font-semibold text-neutral-500">{user.email}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <InfoCard label="등급" value={user.plan} />
          <InfoCard label="권한 상태" value={isAdmin ? "관리자" : "일반 회원"} />
        </div>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <span className="text-xs font-extrabold uppercase tracking-wide text-coral">Access</span>
        <h3 className="mt-3 text-xl font-black text-ink">AI 문서 어시스턴트</h3>
        <p className="mt-4 rounded-2xl bg-neutral-50 p-5 text-sm font-bold leading-7 text-neutral-700">
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
    <article className="rounded-2xl border border-black/5 bg-neutral-50 p-4">
      <p className="text-xs font-bold text-neutral-500">{label}</p>
      <strong className="mt-2 block text-lg font-black text-ink">{value}</strong>
    </article>
  );
}
