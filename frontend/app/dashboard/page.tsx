"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatDocument } from "../../components/ChatDocument";
import { FileConvert } from "../../components/FileConvert";
import { HistoryDashboard } from "../../components/HistoryDashboard";
import { KeywordExtract } from "../../components/KeywordExtract";
import { Navbar, type DashboardTab } from "../../components/Navbar";
import { PdfAnalysis } from "../../components/PdfAnalysis";
import { Summary } from "../../components/Summary";

const API_BASE_URL = "http://127.0.0.1:8000";
const TOKEN_KEY = "access_token";
const USER_KEY = "user";

type AuthUser = {
  user_id: string;
  email: string;
  name: string;
};

const tabCopy: Record<DashboardTab, { eyebrow: string; title: string; description: string }> = {
  assistant: {
    eyebrow: "Document Assistant",
    title: "AI 문서 어시스턴트",
    description: "PDF 업로드, 파일 관리, 문서 기반 질의응답을 한 곳에서 진행합니다."
  },
  "pdf-analysis": {
    eyebrow: "Document Intelligence",
    title: "PDF 문서 분석",
    description: "문서 구조, 페이지, 텍스트, 청크 정보를 화면에서 확인합니다."
  },
  summary: {
    eyebrow: "AI Summary",
    title: "AI 자동 요약",
    description: "긴 문서를 빠르게 읽고 업무에 필요한 핵심만 정리합니다."
  },
  keywords: {
    eyebrow: "Knowledge Mining",
    title: "키워드 추출",
    description: "문서의 핵심 주제와 검색 키워드를 자동으로 추출합니다."
  },
  history: {
    eyebrow: "Work History",
    title: "작업 기록",
    description: "문서별 요약, 키워드, 질문과 답변 이력을 조회하고 관리합니다."
  },
  convert: {
    eyebrow: "Workflow Export",
    title: "엑셀·한글 변환",
    description: "분석 결과를 업무 파일 포맷으로 변환하는 작업 공간입니다."
  }
};

function clearAuthStorage() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>("assistant");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const current = tabCopy[activeTab];

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
            Authorization: `Bearer ${token}`
          }
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
          Authorization: `Bearer ${token}`
        }
      }).catch(() => undefined);
    }

    clearAuthStorage();
    router.replace("/login");
  }

  if (isCheckingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F2EC] px-4 text-ink dark:bg-[#11100D] dark:text-neutral-100">
        <p className="rounded-2xl bg-white px-5 py-4 text-sm font-bold shadow-sm dark:bg-white/5">로그인 상태를 확인하고 있습니다...</p>
      </main>
    );
  }

  return (
    <main className="dashboard-shell min-h-screen overflow-x-hidden bg-[#F5F2EC] text-ink">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} userName={user?.name} onLogout={handleLogout} />

      <div className="mx-auto max-w-7xl px-4 py-5 md:px-8 md:py-8">
        <section className="mb-5 max-w-full rounded-2xl border border-black/10 bg-white p-4 shadow-sm md:mb-6 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wide text-coral">{current.eyebrow}</span>
              <h1 className="mt-2 text-2xl font-black text-ink sm:text-3xl md:text-4xl">{current.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600">{current.description}</p>
            </div>
            <div className="grid w-full max-w-full grid-cols-3 gap-2 rounded-2xl bg-neutral-50 p-2 text-center md:w-auto">
              <div className="px-3 py-2">
                <strong className="block text-lg font-black text-ink">6</strong>
                <span className="text-xs font-bold text-neutral-500">메뉴</span>
              </div>
              <div className="px-3 py-2">
                <strong className="block text-lg font-black text-ink">RAG</strong>
                <span className="text-xs font-bold text-neutral-500">검색</span>
              </div>
              <div className="px-3 py-2">
                <strong className="block text-lg font-black text-ink">API</strong>
                <span className="text-xs font-bold text-neutral-500">연동</span>
              </div>
            </div>
          </div>
        </section>

        {activeTab === "assistant" && <ChatDocument />}
        {activeTab === "pdf-analysis" && <PdfAnalysis />}
        {activeTab === "summary" && <Summary />}
        {activeTab === "keywords" && <KeywordExtract />}
        {activeTab === "history" && <HistoryDashboard />}
        {activeTab === "convert" && <FileConvert />}
      </div>
    </main>
  );
}
