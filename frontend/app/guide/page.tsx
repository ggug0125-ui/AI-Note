import Link from "next/link";
import {
  ArrowRight,
  Bot,
  ChevronDown,
  Coins,
  FileClock,
  FileText,
  Github,
  HelpCircle,
  History,
  LogIn,
  Mail,
  MessageSquareText,
  Sparkles,
  UploadCloud,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";

type GuideStep = {
  number: string;
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  bullets: string[];
};

const guideSteps: GuideStep[] = [
  {
    number: "Step 1",
    title: "로그인",
    subtitle: "AI Workspace 입장 준비",
    description: "AI Note의 문서 분석, 변환, 기록 저장 기능은 로그인 후 사용할 수 있습니다.",
    icon: LogIn,
    bullets: ["상단 로그인 버튼 선택", "계정으로 로그인", "Header에서 크레딧 잔액 확인"],
  },
  {
    number: "Step 2",
    title: "문서 업로드",
    subtitle: "분석할 자료 등록",
    description: "AI Workspace의 문서 업로드 영역에서 분석할 PDF 또는 TXT 문서를 등록합니다.",
    icon: UploadCloud,
    bullets: ["Document Center 열기", "PDF 또는 TXT 선택", "업로드 완료 상태 확인"],
  },
  {
    number: "Step 3",
    title: "문서 분석",
    subtitle: "요약, 키워드, AI Chat",
    description: "업로드한 문서를 선택한 뒤 요약, 키워드 추출, 문서 기반 질문을 이어서 진행합니다.",
    icon: MessageSquareText,
    bullets: ["문서 선택", "요약 또는 키워드 실행", "AI Chat으로 근거 기반 질문"],
  },
  {
    number: "Step 4",
    title: "파일 변환",
    subtitle: "Convert Studio 사용",
    description: "PDF, TXT, XLSX, HWPX 문서를 필요한 형식으로 변환하고 무료로 다시 다운로드합니다.",
    icon: WandSparkles,
    bullets: ["Convert Studio 열기", "원본 파일과 변환 형식 선택", "완료 카드에서 다운로드"],
  },
  {
    number: "Step 5",
    title: "AI 타로",
    subtitle: "가볍게 확인하는 AI 리딩",
    description: "오늘의 운세와 주제별 타로 리딩을 AI가 생성하고, 저장된 기록은 마이페이지에서 확인합니다.",
    icon: Sparkles,
    bullets: ["AI 타로 페이지 이동", "카테고리 선택", "결과 저장 후 기록 확인"],
  },
  {
    number: "Step 6",
    title: "크레딧 정책",
    subtitle: "성공한 작업만 차감",
    description: "문서 분석과 변환은 성공한 경우에만 크레딧이 차감됩니다. 다운로드는 무료입니다.",
    icon: Coins,
    bullets: ["실패한 변환은 차감 없음", "변환 파일 재다운로드 무료", "마이페이지에서 사용내역 확인"],
  },
  {
    number: "Step 7",
    title: "작업 기록",
    subtitle: "결과를 다시 찾기",
    description: "업로드 문서, 요약, 키워드, 질문 기록, 파일 변환 기록과 크레딧 사용내역을 다시 확인합니다.",
    icon: History,
    bullets: ["마이페이지 이동", "필요한 기록 탭 선택", "결과와 사용 크레딧 확인"],
  },
];

const quickLinks = [
  { label: "문서 업로드", href: "/dashboard", icon: UploadCloud },
  { label: "파일 변환", href: "/dashboard", icon: WandSparkles },
  { label: "AI 타로", href: "/tarot", icon: Sparkles },
  { label: "사용내역", href: "/mypage", icon: FileClock },
];

const faqs = [
  {
    question: "처음에는 무엇부터 하면 되나요?",
    answer: "로그인 후 AI Workspace로 이동해 문서를 업로드하세요. 업로드가 끝나면 요약, 키워드, AI Chat을 바로 사용할 수 있습니다.",
  },
  {
    question: "파일 변환은 어떤 형식을 지원하나요?",
    answer: "현재 가이드 기준으로 PDF, TXT, XLSX, HWPX 간 변환을 지원합니다. DOCX, PPTX, CSV, MD, OCR은 이번 범위에 포함되지 않습니다.",
  },
  {
    question: "크레딧은 언제 차감되나요?",
    answer: "문서 업로드, 파일 변환, AI 타로처럼 크레딧이 필요한 작업이 성공했을 때만 차감됩니다. 실패한 변환과 다운로드에는 차감이 없습니다.",
  },
  {
    question: "변환한 파일은 다시 받을 수 있나요?",
    answer: "네. 변환이 완료된 파일은 기록에 남고 다운로드 API로 다시 받을 수 있습니다. 재다운로드는 크레딧을 차감하지 않습니다.",
  },
  {
    question: "작업 기록은 어디에서 확인하나요?",
    answer: "마이페이지에서 문서 기록, 타로 기록, 결제 내역, 크레딧 사용내역을 확인할 수 있습니다.",
  },
];

export default function GuidePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--ai-color-background)] text-[var(--ai-color-text-primary)]">
      <SiteHeader />

      <section className="relative overflow-hidden bg-[linear-gradient(145deg,rgb(var(--ai-bg))_0%,rgb(var(--ai-surface))_48%,rgb(var(--ai-panel))_100%)] px-4 pb-12 pt-24 md:px-8 md:pb-16 md:pt-28">
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(22rem,0.75fr)]">
          <div>
            <span className="ai-badge ai-badge-primary w-fit">AI Note Guide</span>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              처음이라도 3분 안에 시작하는 AI Note 사용법
            </h1>
            <p className="mt-5 max-w-2xl text-base font-bold leading-8 text-[var(--ai-color-text-secondary)] md:text-lg">
              로그인부터 문서 업로드, 분석, 파일 변환, AI 타로, 크레딧 사용내역 확인까지 실제 사용 순서대로 정리했습니다.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard" className="ai-btn ai-btn-primary min-h-12 px-7 shadow-[0_16px_34px_rgba(242,72,72,0.22)]">
                AI Workspace 바로가기
                <ArrowRight size={18} />
              </Link>
              <Link href="#steps" className="ai-btn ai-btn-ghost min-h-12 px-6">
                단계별 보기
                <ChevronDown size={18} />
              </Link>
            </div>
          </div>

          <div className="rounded-[var(--ai-radius-card)] border border-border bg-card/85 p-5 shadow-[0_24px_64px_rgba(111,64,40,0.14)] backdrop-blur">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <span className="text-sm font-black text-title">3 Minute Setup</span>
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-black text-white">7 Steps</span>
            </div>
            <div className="mt-5 grid gap-3">
              {quickLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center justify-between rounded-2xl border border-border bg-panel px-4 py-3 text-sm font-black text-body transition hover:border-primary/40 hover:text-primary"
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={18} />
                      {item.label}
                    </span>
                    <ArrowRight size={16} />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="steps" className="px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-7xl">
          <GuideSectionHeader
            eyebrow="Step Guide"
            title="AI Note를 쓰는 가장 빠른 순서"
            description="처음 사용하는 사용자가 화면을 헤매지 않도록 실제 작업 흐름대로 배치했습니다."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {guideSteps.map((step) => (
              <GuideStepCard key={step.number} step={step} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--ai-color-surface)] px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <GuideSectionHeader
            eyebrow="FAQ"
            title="자주 묻는 질문"
            description="시연 중 바로 답해야 하는 핵심 질문을 짧게 정리했습니다."
          />
          <div className="grid gap-3">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex gap-3">
                  <HelpCircle className="mt-0.5 shrink-0 text-primary" size={20} />
                  <div>
                    <h3 className="text-base font-black text-title">{faq.question}</h3>
                    <p className="mt-2 text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)]">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[var(--ai-radius-card)] border border-primary/25 bg-[linear-gradient(135deg,rgb(var(--ai-card))_0%,rgb(var(--ai-panel))_52%,rgb(var(--ai-surface))_100%)] p-6 shadow-[0_22px_60px_rgba(124,82,27,0.14)] md:p-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <span className="ai-badge ai-badge-primary w-fit">Ready</span>
              <h2 className="mt-5 text-3xl font-black leading-tight md:text-5xl">이제 AI Workspace에서 바로 시작하세요.</h2>
              <p className="mt-4 max-w-2xl text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)] md:text-base">
                문서 업로드, 분석, 파일 변환, 기록 확인까지 한 화면에서 이어집니다.
              </p>
            </div>
            <Link href="/dashboard" className="ai-btn ai-btn-primary min-h-12 justify-center px-7">
              AI Workspace 바로가기
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <GuideFooter />
    </main>
  );
}

function GuideSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <span className="ai-badge ai-badge-primary">{eyebrow}</span>
      <h2 className="mt-5 text-3xl font-black leading-tight md:text-5xl">{title}</h2>
      <p className="mt-4 text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)] md:text-base md:leading-8">
        {description}
      </p>
    </div>
  );
}

function GuideStepCard({ step }: { step: GuideStep }) {
  const Icon = step.icon;

  return (
    <article className="group flex min-h-[20rem] flex-col rounded-[var(--ai-radius-card)] border border-border bg-[linear-gradient(145deg,rgb(var(--ai-card))_0%,rgb(var(--ai-surface))_58%,rgb(var(--ai-panel))_100%)] p-5 shadow-soft transition duration-200 hover:-translate-y-1 hover:border-primary/35 hover:shadow-[var(--ai-shadow-hover)] md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase text-primary">{step.number}</span>
          <h3 className="mt-2 text-2xl font-black text-title">{step.title}</h3>
          <p className="mt-1 text-sm font-black text-[var(--ai-color-text-secondary)]">{step.subtitle}</p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-soft transition group-hover:border-primary/40 group-hover:bg-panel">
          <Icon size={23} />
        </div>
      </div>
      <p className="mt-5 text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)]">
        {step.description}
      </p>
      <div className="mt-auto pt-5">
        <ul className="grid gap-2">
          {step.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2 text-sm font-bold text-body">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function GuideFooter() {
  return (
    <footer className="border-t border-border bg-[linear-gradient(180deg,rgb(var(--ai-panel))_0%,rgb(var(--ai-surface))_100%)] px-4 py-10 text-title md:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-end">
        <div>
          <span className="ai-badge ai-badge-primary">AI Note</span>
          <p className="mt-4 text-2xl font-black">AI-Powered Document Workspace</p>
          <p className="mt-3 text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)]">
            Designed & Developed by dong&jung
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm font-black">
            <a href="mailto:ggug0125@gmail.com" className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-[var(--ai-color-text-secondary)] transition hover:border-primary/40 hover:text-primary">
              <Mail size={16} />
              ggug0125@gmail.com
            </a>
            <a
              href="https://github.com/ggug0125-ui?tab=repositories"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-[var(--ai-color-text-secondary)] transition hover:border-primary/40 hover:text-primary"
            >
              <Github size={16} />
              GitHub Repository
            </a>
          </div>
        </div>
        <div className="grid gap-3 text-sm font-black text-[var(--ai-color-text-secondary)] md:justify-items-end md:text-right">
          <p>
            <span className="text-[var(--ai-color-text-primary)]">Version</span>: AI Note 2.0 Preview
          </p>
          <p>
            <span className="text-[var(--ai-color-text-primary)]">Guide</span>: 3 Minute Quick Start
          </p>
        </div>
      </div>
    </footer>
  );
}
