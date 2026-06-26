"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { BarChart3, History, MessageSquareText, UploadCloud } from "lucide-react";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";
import type { WorkspaceTab } from "./types";
import { DashboardStats } from "./DashboardStats";
import { QuickActions } from "./QuickActions";
import { RecentActivity } from "./RecentActivity";

type DashboardFile = {
  file_id: string;
  filename: string;
  created_at?: string;
  uploaded_at?: string;
};

type DashboardResults = {
  documents?: DashboardFile[];
  summaries?: Array<{ summary_type?: string; summary?: string; created_at?: string; filename?: string }>;
  keywords?: Array<{ scope?: string; keywords?: string[]; created_at?: string; filename?: string }>;
  chats?: Array<{ question?: string; answer?: string; created_at?: string; filename?: string }>;
};

type OverviewData = {
  documentCount: number;
  analysisCount: number;
  questionCount: number;
  conversionCount: number;
  recentDocument: string;
  recentAnalysis: string;
  recentQuestion: string;
  recentConversion: string;
};

type OverviewProps = {
  onNavigate: (tab: WorkspaceTab) => void;
};

const emptyRecordText = "아직 기록이 없습니다.";

const emptyOverviewData: OverviewData = {
  documentCount: 0,
  analysisCount: 0,
  questionCount: 0,
  conversionCount: 0,
  recentDocument: emptyRecordText,
  recentAnalysis: emptyRecordText,
  recentQuestion: emptyRecordText,
  recentConversion: emptyRecordText,
};

const overviewSteps: Array<{ title: string; description: string; icon: ReactNode }> = [
  {
    title: "문서 업로드",
    description: "PDF 문서를 업로드하고 AI 분석을 위한 검색 인덱스를 준비합니다.",
    icon: <UploadCloud size={22} />,
  },
  {
    title: "AI 분석",
    description: "요약과 키워드 추출로 문서의 핵심 내용을 빠르게 정리합니다.",
    icon: <BarChart3 size={22} />,
  },
  {
    title: "AI 대화",
    description: "선택한 문서의 내용만 근거로 질문하고 답변을 확인합니다.",
    icon: <MessageSquareText size={22} />,
  },
  {
    title: "변환 및 기록",
    description: "업무용 파일로 변환하고 분석 결과와 대화 기록을 관리합니다.",
    icon: <History size={22} />,
  },
];

function getTimestamp(item: { created_at?: string; uploaded_at?: string }) {
  return item.created_at || item.uploaded_at || "";
}

function getLatest<T extends { created_at?: string; uploaded_at?: string }>(items: T[]) {
  return [...items].sort((a, b) => getTimestamp(b).localeCompare(getTimestamp(a)))[0];
}

export function Overview({ onNavigate }: OverviewProps) {
  const [overviewData, setOverviewData] = useState<OverviewData>(emptyOverviewData);

  useEffect(() => {
    let isMounted = true;

    async function loadOverview() {
      try {
        const [filesResult, resultsResult] = await Promise.allSettled([
          authenticatedFetch(`${API_BASE_URL}/files`),
          authenticatedFetch(`${API_BASE_URL}/results`),
        ]);

        let files: DashboardFile[] = [];
        let results: DashboardResults = {};

        if (filesResult.status === "fulfilled" && filesResult.value.ok) {
          const data = (await filesResult.value.json()) as { files?: DashboardFile[] };
          files = Array.isArray(data.files) ? data.files : [];
        }

        if (resultsResult.status === "fulfilled" && resultsResult.value.ok) {
          results = (await resultsResult.value.json()) as DashboardResults;
        }

        const summaries = Array.isArray(results.summaries) ? results.summaries : [];
        const keywords = Array.isArray(results.keywords) ? results.keywords : [];
        const chats = Array.isArray(results.chats) ? results.chats : [];
        const analyses: Array<{ filename?: string; summary_type?: string; scope?: string; created_at?: string }> = [
          ...summaries.map((item) => ({
            filename: item.filename,
            summary_type: item.summary_type,
            created_at: item.created_at,
          })),
          ...keywords.map((item) => ({
            filename: item.filename,
            scope: item.scope,
            created_at: item.created_at,
          })),
        ];
        const latestDocument = getLatest(files);
        const latestAnalysis = getLatest(analyses);
        const latestQuestion = getLatest(chats);

        if (isMounted) {
          setOverviewData({
            documentCount: files.length,
            analysisCount: analyses.length,
            questionCount: chats.length,
            conversionCount: 0,
            recentDocument: latestDocument?.filename || emptyRecordText,
            recentAnalysis:
              latestAnalysis?.filename ||
              latestAnalysis?.summary_type ||
              latestAnalysis?.scope ||
              emptyRecordText,
            recentQuestion: latestQuestion?.question || emptyRecordText,
            recentConversion: emptyRecordText,
          });
        }
      } catch {
        if (isMounted) {
          setOverviewData(emptyOverviewData);
        }
      }
    }

    void loadOverview();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="grid gap-5">
      <DashboardStats
        documentCount={overviewData.documentCount}
        analysisCount={overviewData.analysisCount}
        questionCount={overviewData.questionCount}
        conversionCount={overviewData.conversionCount}
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <RecentActivity
          recentDocument={overviewData.recentDocument}
          recentAnalysis={overviewData.recentAnalysis}
          recentQuestion={overviewData.recentQuestion}
          recentConversion={overviewData.recentConversion}
        />
        <QuickActions onNavigate={onNavigate} />
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewSteps.map((step, index) => (
          <article
            key={step.title}
            className="rounded-3xl border border-[#E9D8BD] bg-white p-5 shadow-[0_14px_34px_rgba(124,82,27,0.07)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF3E5] text-coral">
              {step.icon}
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-wide text-[#8A7354]">
              Step {index + 1}
            </p>
            <h2 className="mt-2 text-xl font-black text-[#2F2418]">{step.title}</h2>
            <p className="mt-3 text-sm font-bold leading-6 text-[#6F5A40]">{step.description}</p>
          </article>
        ))}
      </section>
    </section>
  );
}
