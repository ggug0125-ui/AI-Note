import Link from "next/link";
import {
  ArrowRight,
  Bot,
  FileClock,
  FileText,
  Hash,
  HelpCircle,
  History,
  MessageSquareText,
  Sparkles,
  UploadCloud,
  WandSparkles,
} from "lucide-react";
import { SiteHeader } from "../components/SiteHeader";

const features = [
  {
    title: "Document Center",
    description: "PDF와 TXT 문서를 업로드하고 분석할 문서를 한 곳에서 관리합니다.",
    icon: FileText,
  },
  {
    title: "AI Summary",
    description: "긴 문서의 핵심 내용을 목적에 맞는 요약으로 빠르게 정리합니다.",
    icon: Sparkles,
  },
  {
    title: "Keyword Extract",
    description: "주요 키워드와 토픽을 뽑아 문서의 흐름을 바로 파악합니다.",
    icon: Hash,
  },
  {
    title: "AI Chat",
    description: "선택한 문서를 기반으로 질문하고 출처와 함께 답변을 확인합니다.",
    icon: MessageSquareText,
  },
  {
    title: "Convert Studio",
    description: "Excel, HWPX 등 문서를 필요한 형식으로 변환합니다.",
    icon: WandSparkles,
  },
  {
    title: "History Timeline",
    description: "업로드, 요약, 키워드, 질문 기록을 타임라인으로 다시 확인합니다.",
    icon: History,
  },
];

const workflow = [
  {
    title: "문서 업로드",
    description: "분석할 문서를 Document Center에 올리고 선택합니다.",
    icon: UploadCloud,
  },
  {
    title: "AI 분석",
    description: "요약과 키워드 추출로 문서 구조를 빠르게 파악합니다.",
    icon: Sparkles,
  },
  {
    title: "AI와 대화",
    description: "문서 기반 질문과 답변으로 필요한 근거를 찾습니다.",
    icon: Bot,
  },
  {
    title: "파일 변환",
    description: "Convert Studio에서 업무에 맞는 형식으로 변환합니다.",
    icon: WandSparkles,
  },
  {
    title: "작업 기록 관리",
    description: "History Timeline에서 이전 작업을 다시 확인합니다.",
    icon: FileClock,
  },
];

const faqs = [
  {
    question: "어떤 문서를 지원하나요?",
    answer: "현재 AI Workspace의 문서 분석은 PDF와 TXT 중심으로 동작하며, 변환은 Excel → CSV/PDF, HWPX → TXT를 지원합니다.",
  },
  {
    question: "AI Chat은 어떤 방식인가요?",
    answer: "사용자가 선택한 문서의 분석 결과를 기반으로 질문에 답변하고, 가능한 경우 참고 출처를 함께 보여주는 방식입니다.",
  },
  {
    question: "파일 변환은 어떤 형식을 지원하나요?",
    answer: "현재 Convert Studio는 Excel → CSV, Excel → PDF, HWPX → TXT를 지원하며 DOCX, PPTX, PDF 변환은 준비 중입니다.",
  },
  {
    question: "기록은 저장되나요?",
    answer: "요약, 키워드, 질문 기록은 작업 기록 화면에서 확인할 수 있습니다. 변환 기록 저장은 추후 지원 예정입니다.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--ai-color-background)] text-[var(--ai-color-text-primary)]">
      <SiteHeader />

      <section className="relative overflow-hidden px-4 pb-12 pt-24 md:px-8 md:pb-16 md:pt-28">
        <div className="absolute inset-0 bg-[var(--ai-color-background)]" aria-hidden="true" />
        <div className="relative z-10 mx-auto grid min-h-[78vh] max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(24rem,1.1fr)] xl:gap-14">
          <div className="max-w-3xl">
            <span className="ai-badge ai-badge-primary w-fit">AI Note 2.0</span>
            <h1 className="mt-6 max-w-3xl text-3xl font-black leading-[1.04] sm:text-4xl lg:text-5xl xl:text-6xl">
              <span className="block">문서 업무를</span>
              <span className="block text-[1.09em] text-coral">AI Workspace</span>
              <span className="block">에서 끝내세요.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base font-bold leading-8 text-[var(--ai-color-text-secondary)] md:text-lg md:leading-9">
              업로드, 요약, 키워드, AI 채팅, 변환, 기록 관리까지 한 곳에서 처리합니다.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard" className="ai-btn ai-btn-primary min-h-12 px-6">
                AI Workspace 시작하기
                <ArrowRight size={18} />
              </Link>
              <Link href="/tarot" className="ai-btn ai-btn-secondary min-h-12 px-6">
                AI Tarot 보기
              </Link>
            </div>
            <div className="mt-12 grid max-w-3xl gap-3 sm:grid-cols-3">
              <HeroMetric value="6" label="Workspace 메뉴" />
              <HeroMetric value="PDF / TXT" label="문서 분석 지원" />
              <HeroMetric value="Credits" label="크레딧 기반 사용" />
            </div>
          </div>
          <HeroWorkspaceMockup />
        </div>
      </section>

      <section className="px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Workspace Features"
            title="AI Note 2.0의 주요 기능"
            description="문서를 다루는 반복 업무를 하나의 Workspace 흐름으로 묶었습니다."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article key={feature.title} className="ai-card ai-card-hover p-5 md:p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--ai-color-surface)] text-coral">
                    <Icon size={23} />
                  </div>
                  <h3 className="mt-5 text-xl font-black">{feature.title}</h3>
                  <p className="mt-3 text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)]">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[var(--ai-color-surface)] px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="AI Workspace Flow"
            title="업로드부터 기록 관리까지"
            description="사용자가 실제로 문서를 처리하는 순서에 맞춰 Workspace가 움직입니다."
          />
          <div className="mt-10 grid gap-4 lg:grid-cols-5">
            {workflow.map((step, index) => {
              const Icon = step.icon;

              return (
                <article key={step.title} className="ai-panel-compact">
                  <span className="text-3xl font-black text-coral">{String(index + 1).padStart(2, "0")}</span>
                  <div className="mt-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-coral">
                    <Icon size={21} />
                  </div>
                  <h3 className="mt-5 font-black">{step.title}</h3>
                  <p className="mt-3 text-sm font-bold leading-6 text-[var(--ai-color-text-secondary)]">
                    {step.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1fr_0.9fr] lg:items-stretch">
          <article className="ai-card p-6 md:p-8">
            <span className="ai-badge ai-badge-info">AI Tarot</span>
            <h2 className="mt-5 text-3xl font-black md:text-4xl">Chichi와 Lilla의 작은 세계</h2>
            <p className="mt-4 text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)] md:text-base md:leading-8">
              AI Note의 문서 업무 흐름과 별도로, AI Tarot는 Chichi와 Lilla가 안내하는 감성적인 타로 경험을 제공합니다.
              오늘의 운세와 주제별 리딩을 가볍게 확인할 수 있습니다.
            </p>
            <Link href="/tarot" className="ai-btn ai-btn-secondary mt-6 min-h-12 px-6">
              AI Tarot로 이동
              <ArrowRight size={18} />
            </Link>
          </article>

          <article className="ai-card-premium p-6 md:p-8">
            <span className="ai-badge ai-badge-warning">Credit / Payment</span>
            <h2 className="mt-5 text-3xl font-black md:text-4xl">크레딧 기반 사용</h2>
            <p className="mt-4 text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)] md:text-base md:leading-8">
              AI 문서 분석과 일부 기능은 크레딧 기반으로 관리됩니다. 결제 시스템은 프로젝트 흐름에 맞춰 단계적으로 연동 중이며,
              현재 화면에서는 사용 가능한 크레딧과 작업 비용을 확인하는 방향으로 구성되어 있습니다.
            </p>
            <div className="mt-6 grid gap-3">
              <InfoRow label="문서 분석" value="페이지 수 기반 크레딧 사용" />
              <InfoRow label="AI Tarot" value="일부 리딩은 크레딧 정책 적용" />
              <InfoRow label="결제" value="Mock / Toss 흐름을 단계적으로 정리 중" />
            </div>
          </article>
        </div>
      </section>

      <section className="bg-[var(--ai-color-surface)] px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-5xl">
          <SectionHeader
            eyebrow="FAQ"
            title="자주 묻는 질문"
            description="현재 AI Note 2.0 Workspace 기준으로 안내합니다."
          />
          <div className="mt-10 grid gap-4">
            {faqs.map((faq) => (
              <article key={faq.question} className="ai-card p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--ai-color-surface)] text-coral">
                    <HelpCircle size={20} />
                  </div>
                  <div>
                    <h3 className="font-black">{faq.question}</h3>
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
        <div className="ai-card mx-auto max-w-5xl p-6 text-center md:p-10">
          <span className="ai-badge ai-badge-primary">AI Note 2.0</span>
          <h2 className="mt-5 text-3xl font-black md:text-5xl">이제 Workspace에서 시작하세요.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)] md:text-base md:leading-8">
            문서를 올리고, 정리하고, 질문하고, 변환하고, 기록까지 다시 확인하는 흐름을 한 화면에서 이어갈 수 있습니다.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/dashboard" className="ai-btn ai-btn-primary min-h-12 px-6">
              AI Workspace 시작하기
              <ArrowRight size={18} />
            </Link>
            <Link href="/tarot" className="ai-btn ai-btn-secondary min-h-12 px-6">
              AI Tarot 보기
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="ai-panel-compact bg-white/85 backdrop-blur">
      <strong className="block text-xl font-black text-[var(--ai-color-text-primary)]">{value}</strong>
      <span className="mt-1 block text-xs font-black text-[var(--ai-color-text-secondary)]">{label}</span>
    </div>
  );
}

function SectionHeader({
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="ai-panel-compact bg-white/70">
      <span className="text-xs font-black text-[var(--ai-color-text-secondary)]">{label}</span>
      <strong className="mt-1 block text-sm font-black text-[var(--ai-color-text-primary)]">{value}</strong>
    </div>
  );
}

function HeroWorkspaceMockup() {
  return (
    <div className="pointer-events-none relative mx-auto hidden w-full max-w-2xl lg:block" aria-hidden="true">
      <div className="relative h-[34rem] overflow-hidden rounded-[2rem] border border-[var(--ai-color-border)] bg-white/70 shadow-[var(--ai-shadow-soft)] backdrop-blur-sm">
        <div className="flex items-center gap-2 border-b border-[var(--ai-color-border)] px-5 py-4">
          <span className="h-3 w-3 rounded-full bg-coral" />
          <span className="h-3 w-3 rounded-full bg-[var(--ai-color-payment)]" />
          <span className="h-3 w-3 rounded-full bg-[var(--ai-color-success)]" />
          <span className="ml-4 text-xs font-black text-[var(--ai-color-text-secondary)]">AI Workspace</span>
        </div>
        <div className="grid grid-cols-[0.8fr_1.2fr] gap-4 p-5">
          <div className="grid gap-3">
            {["Document Center", "AI Summary", "AI Chat", "Convert Studio"].map((item, index) => (
              <div key={item} className={index === 1 ? "ai-panel-compact bg-[var(--ai-color-surface)]" : "ai-panel-compact bg-white/80"}>
                <span className="text-xs font-black text-[var(--ai-color-text-secondary)]">{item}</span>
                <div className="mt-3 h-2 rounded-full bg-[var(--ai-color-border)]" />
              </div>
            ))}
          </div>
          <div className="ai-panel-compact bg-white/80">
            <div className="mb-4 flex items-center justify-between">
              <span className="ai-badge ai-badge-primary">Selected Document</span>
              <span className="ai-badge">Ready</span>
            </div>
            <div className="grid gap-3">
              <div className="h-3 rounded-full bg-[var(--ai-color-border)]" />
              <div className="h-3 w-5/6 rounded-full bg-[var(--ai-color-border)]" />
              <div className="h-3 w-3/5 rounded-full bg-[var(--ai-color-border)]" />
              <div className="mt-4 rounded-2xl bg-[var(--ai-color-active)] p-4 text-white">
                <span className="text-xs font-black">문서 기반 답변 준비 완료</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
