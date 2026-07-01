"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  ArrowRightLeft,
  BarChart3,
  FileSearch,
  History,
  MessageSquareText,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";
import type { WorkspaceTab } from "./types";
import { ActivityCard } from "./ActivityCard";
import { QuickActionCard } from "./QuickActionCard";
import { StatCard } from "./StatCard";

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

type DashboardOverviewProps = {
  onNavigate: (tab: WorkspaceTab) => void;
  compact?: boolean;
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
    description: "PDF, TXT, XLSX, CSV 문서를 업로드하고 AI 분석을 위한 검색 인덱스를 준비합니다.",
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
    description: "업무용 파일로 변환하고 분석 결과와 작업 기록을 관리합니다.",
    icon: <History size={22} />,
  },
];

function getTimestamp(item: { created_at?: string; uploaded_at?: string }) {
  return item.created_at || item.uploaded_at || "";
}

function getLatest<T extends { created_at?: string; uploaded_at?: string }>(items: T[]) {
  return [...items].sort((a, b) => getTimestamp(b).localeCompare(getTimestamp(a)))[0];
}

export function DashboardOverview({ onNavigate, compact = false }: DashboardOverviewProps) {
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

  const statCards = [
    { label: "업로드 문서", value: overviewData.documentCount, icon: <FileSearch size={20} /> },
    { label: "AI 분석", value: overviewData.analysisCount, icon: <BarChart3 size={20} /> },
    { label: "AI 질문", value: overviewData.questionCount, icon: <MessageSquareText size={20} /> },
    { label: "변환 작업", value: overviewData.conversionCount, icon: <ArrowRightLeft size={20} /> },
  ];

  const recentCards = [
    { label: "최근 업로드 문서", value: overviewData.recentDocument },
    { label: "최근 AI 분석", value: overviewData.recentAnalysis },
    { label: "최근 질문", value: overviewData.recentQuestion },
    { label: "최근 변환", value: overviewData.recentConversion },
  ];

  const actionCards: Array<{ title: string; description: string; tab: WorkspaceTab; icon: ReactNode }> = [
    {
      title: "문서 업로드",
      description: "문서 목록과 분석 상태를 확인합니다.",
      tab: "documents",
      icon: <UploadCloud size={22} />,
    },
    {
      title: "AI 분석",
      description: "요약과 키워드 추출을 시작합니다.",
      tab: "analysis",
      icon: <BarChart3 size={22} />,
    },
    {
      title: "AI Chat",
      description: "문서 기반 질문을 바로 이어갑니다.",
      tab: "chat",
      icon: <MessageSquareText size={22} />,
    },
    {
      title: "파일 변환",
      description: "Excel, HWPX 변환 도구로 이동합니다.",
      tab: "convert",
      icon: <ArrowRightLeft size={22} />,
    },
  ];

  if (compact) {
    return (
      <section className="grid gap-3">
        <div className="grid grid-cols-2 gap-2">
          {statCards.map((card) => (
            <article key={card.label} className="min-h-[5.75rem] rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-[0.68rem] font-black uppercase tracking-wide text-muted">
                  {card.label}
                </p>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {card.icon}
                </span>
              </div>
              <strong className="mt-2 block text-2xl font-black leading-none text-title">{card.value}</strong>
            </article>
          ))}
        </div>

        <section className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <History className="text-primary" size={17} />
            <h2 className="text-sm font-black text-title">최근 활동</h2>
          </div>
          <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-panel">
            {recentCards.map((card) => (
              <article key={card.label} className="grid gap-1 px-3 py-2.5">
                <p className="truncate text-[0.68rem] font-black uppercase tracking-wide text-muted">{card.label}</p>
                <p className="line-clamp-1 text-xs font-bold text-body">{card.value}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary" size={17} />
            <h2 className="text-sm font-black text-title">빠른 시작</h2>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {actionCards.map((card) => (
              <button
                key={card.title}
                type="button"
                onClick={() => onNavigate(card.tab)}
                className="min-h-[5.25rem] rounded-2xl border border-border bg-panel p-3 text-left transition active:scale-[0.98]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/15 text-primary">
                  {card.icon}
                </span>
                <strong className="mt-2 block truncate text-sm font-black text-title">{card.title}</strong>
                <span className="mt-1 line-clamp-1 text-[0.68rem] font-bold text-body">{card.description}</span>
              </button>
            ))}
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} icon={card.icon} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft md:p-6">
          <div className="flex items-center gap-3">
            <History className="text-primary" size={22} />
            <h2 className="text-xl font-black text-title">최근 활동</h2>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {recentCards.map((card) => (
              <ActivityCard key={card.label} label={card.label} value={card.value} />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-[linear-gradient(135deg,rgb(var(--ai-card))_0%,rgb(var(--ai-surface))_100%)] p-5 shadow-soft md:p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="text-primary" size={22} />
            <h2 className="text-xl font-black text-title">빠른 시작</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {actionCards.map((card) => (
              <QuickActionCard
                key={card.title}
                title={card.title}
                description={card.description}
                icon={card.icon}
                onClick={() => onNavigate(card.tab)}
              />
            ))}
          </div>
        </section>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewSteps.map((step, index) => (
          <article
            key={step.title}
            className="rounded-3xl border border-border bg-card p-5 shadow-soft"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {step.icon}
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-wide text-muted">
              Step {index + 1}
            </p>
            <h2 className="mt-2 text-xl font-black text-title">{step.title}</h2>
            <p className="mt-3 text-sm font-bold leading-6 text-body">{step.description}</p>
          </article>
        ))}
      </section>
    </section>
  );
}
