import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CreditCard,
  FileClock,
  FileText,
  Github,
  Hash,
  HelpCircle,
  History,
  Mail,
  MessageSquareText,
  Sparkles,
  UploadCloud,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { SiteHeader } from "../components/SiteHeader";

const features = [
  {
    title: "Document Center",
    description: "PDF와 TXT 문서를 업로드하고 분석할 문서를 한 곳에서 관리합니다.",
    icon: FileText,
    tag: "PDF / TXT",
  },
  {
    title: "AI Summary",
    description: "긴 문서의 핵심 내용을 목적에 맞는 요약으로 빠르게 정리합니다.",
    icon: Sparkles,
    tag: "Smart Summary",
  },
  {
    title: "Keyword Extract",
    description: "주요 키워드와 토픽을 뽑아 문서의 흐름을 바로 파악합니다.",
    icon: Hash,
    tag: "Topic Mining",
  },
  {
    title: "AI Chat",
    description: "선택한 문서를 기반으로 질문하고 출처와 함께 답변을 확인합니다.",
    icon: MessageSquareText,
    tag: "RAG Chat",
  },
  {
    title: "Convert Studio",
    description: "Excel, HWPX 등 문서를 필요한 형식으로 변환합니다.",
    icon: WandSparkles,
    tag: "Excel / HWPX",
  },
  {
    title: "History Timeline",
    description: "업로드, 요약, 키워드, 질문 기록을 타임라인으로 다시 확인합니다.",
    icon: History,
    tag: "Saved Records",
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

      <section className="relative overflow-hidden bg-[linear-gradient(145deg,var(--ai-color-background)_0%,#fff8f0_48%,#fff1e5_100%)] px-4 pb-10 pt-20 md:px-8 md:pb-14 md:pt-[6.5rem] lg:pb-16 lg:pt-28">
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 lg:min-h-[720px] lg:grid-cols-[minmax(0,0.88fr)_minmax(24rem,1.12fr)] xl:gap-16">
          <div className="max-w-3xl py-2 lg:py-8">
            <span className="ai-badge ai-badge-primary w-fit">AI Note 2.0</span>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.03] sm:text-5xl lg:text-6xl xl:text-7xl">
              <span className="block">문서 업무를</span>
              <span className="mt-1 block text-[1.08em] text-coral">AI Workspace</span>
              <span className="block">에서 끝내세요.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base font-extrabold leading-7 text-[var(--ai-color-text-secondary)] md:mt-6 md:text-lg md:leading-8">
              업로드, 요약, 키워드, AI 채팅, 변환, 기록 관리까지 한 곳에서 처리합니다.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center">
              <Link href="/dashboard" className="ai-btn ai-btn-primary min-h-12 px-7 shadow-[0_16px_34px_rgba(242,72,72,0.22)] sm:min-w-52">
                AI Workspace 시작하기
                <ArrowRight size={18} />
              </Link>
              <Link href="/tarot" className="ai-btn ai-btn-ghost min-h-12 px-6 sm:min-w-40">
                AI Tarot 보기
              </Link>
            </div>
            <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3 md:mt-10">
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
                <article
                  key={feature.title}
                  className="group flex min-h-[17rem] flex-col overflow-hidden rounded-[var(--ai-radius-card)] border border-[rgba(232,188,115,0.58)] bg-[linear-gradient(145deg,#ffffff_0%,#fffdf8_50%,#fff8f0_100%)] p-5 shadow-[0_14px_34px_rgba(111,64,40,0.08)] transition duration-200 hover:-translate-y-1.5 hover:border-[rgba(242,72,72,0.32)] hover:shadow-[0_24px_54px_rgba(111,64,40,0.16)] md:p-6"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(232,188,115,0.46)] bg-[var(--ai-color-surface)] text-coral shadow-[0_10px_22px_rgba(111,64,40,0.07)] transition duration-200 group-hover:-translate-y-0.5 group-hover:scale-105 group-hover:border-coral/40 group-hover:bg-white group-hover:shadow-[0_14px_30px_rgba(242,72,72,0.16)]">
                    <Icon size={23} />
                  </div>
                  <h3 className="mt-5 text-xl font-black">{feature.title}</h3>
                  <p className="mt-3 text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)]">
                    {feature.description}
                  </p>
                  <div className="mt-auto pt-6">
                    <span className="inline-flex rounded-full border border-[rgba(232,188,115,0.62)] bg-white/78 px-3 py-1 text-[0.7rem] font-black text-[var(--ai-color-active)] shadow-[0_8px_18px_rgba(111,64,40,0.06)]">
                      {feature.tag}
                    </span>
                  </div>
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
        <div className="mx-auto grid max-w-7xl items-stretch gap-5 lg:grid-cols-[1fr_0.9fr]">
          <article className="relative flex h-full min-h-[30rem] flex-col overflow-hidden rounded-[var(--ai-radius-card)] border border-[rgba(232,188,115,0.58)] bg-[linear-gradient(145deg,#fffdf8_0%,#fff1f7_48%,#f4ecff_100%)] p-6 shadow-[0_18px_40px_rgba(124,82,27,0.14)] md:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#f24848_0%,#e7a93b_42%,#c084fc_100%)]" aria-hidden="true" />
            <span className="ai-badge w-fit border-[rgba(232,188,115,0.58)] bg-white/80 text-[var(--ai-color-active)]">AI Tarot</span>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-pink-200/80 bg-white/70 px-3 py-1 text-xs font-black text-[#8a3a62]">Chichi World</span>
              <span className="rounded-full border border-violet-200/80 bg-white/70 px-3 py-1 text-xs font-black text-[#5f3d8a]">Lilla World</span>
            </div>
            <h2 className="mt-5 text-3xl font-black md:text-4xl">Chichi와 Lilla의 작은 세계</h2>
            <p className="mt-4 text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)] md:text-base md:leading-8">
              AI Note의 문서 업무 흐름과 별도로, AI Tarot는 Chichi와 Lilla가 안내하는 감성적인 타로 경험을 제공합니다.
              오늘의 운세와 주제별 리딩을 가볍게 확인할 수 있습니다.
            </p>
            <Link href="/tarot" className="ai-btn mt-6 min-h-12 w-fit border border-[rgba(242,72,72,0.28)] bg-white/86 px-6 text-coral shadow-[0_14px_30px_rgba(190,24,93,0.12)] hover:-translate-y-0.5 hover:bg-[var(--ai-color-surface)] hover:shadow-[0_18px_38px_rgba(190,24,93,0.18)]">
              Chichi & Lilla 만나러 가기
              <ArrowRight size={18} />
            </Link>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-5 md:gap-6">
              <TarotWorldCard imageSrc="/images/tarot/witch-hero1.png" label="Chichi World" />
              <TarotWorldCard imageSrc="/images/tarot/yojung-main.png" label="Lilla World" />
            </div>
          </article>

          <article className="ai-card-premium flex h-full min-h-[30rem] flex-col rounded-[var(--ai-radius-card)] border border-[rgba(232,188,115,0.58)] p-6 shadow-[0_18px_40px_rgba(124,82,27,0.14)] md:p-8">
            <span className="ai-badge w-fit border-[rgba(232,188,115,0.58)] bg-white/80 text-[var(--ai-color-active)]">AI Credit System</span>
            <h2 className="mt-5 text-3xl font-black md:text-4xl">AI Credit System</h2>
            <div className="mt-4 grid gap-3 text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)] md:text-base md:leading-8">
              <p>
                AI 문서 분석과 AI Tarot은 하나의 Smart Credit으로 이용됩니다.
                AI Note는 사용한 만큼만 차감되는 합리적인 크레딧 시스템을 제공합니다.
              </p>
              <p>
                문서 분석, AI Tarot, 그리고 앞으로 추가될 AI 서비스까지 하나의 크레딧으로 통합 관리됩니다.
              </p>
            </div>
            <div className="mx-auto mt-8 grid w-full max-w-[36rem] items-stretch gap-3.5 sm:grid-cols-3">
              <CreditFeatureCard icon={FileText} title="Document Analysis" summary="페이지 기반" highlight="Smart Credit" highlightTone="coral" />
              <CreditFeatureCard icon={Sparkles} title="AI Tarot" summary="오늘의 운세 무료" highlight="추가 리딩 차감" highlightTone="mixed" />
              <CreditFeatureCard icon={CreditCard} title="Payment" summary="Mock / Toss" highlight="Coming Soon" highlightTone="gold" />
            </div>
            <p className="mt-5 text-center text-xs font-black uppercase text-[var(--ai-color-text-secondary)]">
              One Credit, Every AI Service.
            </p>
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

      <LandingFooter />
    </main>
  );
}

function HeroMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="ai-panel-compact bg-white/80 shadow-[0_12px_28px_rgba(111,64,40,0.08)] backdrop-blur">
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

function CreditFeatureCard({
  icon: Icon,
  title,
  summary,
  highlight,
  highlightTone,
}: {
  icon: LucideIcon;
  title: string;
  summary: string;
  highlight: string;
  highlightTone: "coral" | "mixed" | "gold";
}) {
  const highlightClass = highlightTone === "gold" ? "text-[var(--ai-color-payment)]" : "text-coral";

  return (
    <div className="flex min-h-[9.5rem] flex-col items-center justify-center rounded-2xl border border-[rgba(232,188,115,0.46)] bg-white/70 px-4 py-5 text-center shadow-[0_14px_28px_rgba(124,82,27,0.1)] transition duration-200 hover:-translate-y-1 hover:border-coral/35 hover:shadow-[0_20px_40px_rgba(124,82,27,0.16)] md:px-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(232,188,115,0.5)] bg-[var(--ai-color-surface)] text-coral shadow-[0_8px_18px_rgba(124,82,27,0.08)]">
        <Icon size={24} />
      </div>
      <span className="mt-3 text-[0.8rem] font-black leading-5 text-[var(--ai-color-text-secondary)]">{title}</span>
      <div className="mt-2 flex flex-col items-center gap-1">
        <strong className="text-base font-black leading-6 text-[var(--ai-color-text-primary)]">{summary}</strong>
        {highlightTone === "mixed" ? (
          <span className="text-[0.82rem] font-black leading-5">
            <span className="text-[var(--ai-color-success)]">무료</span>
            <span className="text-coral"> / 추가 차감</span>
          </span>
        ) : (
          <span className={`text-[0.82rem] font-black leading-5 ${highlightClass}`}>{highlight}</span>
        )}
      </div>
    </div>
  );
}

function TarotWorldCard({ imageSrc, label }: { imageSrc: string; label: string }) {
  return (
    <div className="w-36 rounded-2xl border border-white/80 bg-white/70 p-2.5 text-center shadow-[0_14px_28px_rgba(111,64,40,0.1)] backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-coral/35 hover:shadow-[0_20px_40px_rgba(111,64,40,0.16)] md:w-40 xl:w-44">
      <div className="aspect-square overflow-hidden rounded-xl border border-[rgba(232,188,115,0.42)] bg-[linear-gradient(145deg,#fff8f0_0%,#f8ecff_100%)]">
        <img src={imageSrc} alt={label} className="h-full w-full object-cover object-top" />
      </div>
      <span className="mt-2 inline-flex w-full items-center justify-center gap-1 text-center text-xs font-black text-[var(--ai-color-text-secondary)]">
        <Sparkles size={13} className="text-coral" />
        {label}
      </span>
    </div>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-[rgba(232,188,115,0.52)] bg-[linear-gradient(180deg,#fff8f0_0%,#fffdf8_100%)] px-4 py-10 text-[var(--ai-color-text-primary)] md:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-end">
        <div>
          <span className="ai-badge ai-badge-primary">AI Note</span>
          <p className="mt-4 text-2xl font-black">AI-Powered Document Workspace</p>
          <p className="mt-3 text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)]">
            Designed & Developed by dong&jung
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm font-black">
            <a href="mailto:ggug0125@gmail.com" className="inline-flex items-center gap-2 rounded-full border border-[rgba(232,188,115,0.6)] bg-white/78 px-4 py-2 text-[var(--ai-color-text-secondary)] transition hover:border-coral/40 hover:text-coral">
              <Mail size={16} />
              ggug0125@gmail.com
            </a>
            <a
              href="https://github.com/ggug0125-ui?tab=repositories"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(232,188,115,0.6)] bg-white/78 px-4 py-2 text-[var(--ai-color-text-secondary)] transition hover:border-coral/40 hover:text-coral"
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
            <span className="text-[var(--ai-color-text-primary)]">Tech</span>: Next.js · FastAPI · OpenAI · MongoDB
          </p>
        </div>
      </div>
    </footer>
  );
}

function HeroWorkspaceMockup() {
  return (
    <div className="pointer-events-none relative ml-auto hidden w-full max-w-[39rem] lg:block" aria-hidden="true">
      <div className="relative h-[31.5rem] overflow-hidden rounded-[1.75rem] border border-[var(--ai-color-border)] bg-white/75 shadow-[0_24px_64px_rgba(111,64,40,0.14)] backdrop-blur-sm xl:h-[33rem]">
        <div className="flex items-center gap-2 border-b border-[var(--ai-color-border)] px-5 py-4">
          <span className="h-3 w-3 rounded-full bg-coral" />
          <span className="h-3 w-3 rounded-full bg-[var(--ai-color-payment)]" />
          <span className="h-3 w-3 rounded-full bg-[var(--ai-color-success)]" />
          <span className="ml-4 text-xs font-black text-[var(--ai-color-text-secondary)]">AI Workspace</span>
        </div>
        <div className="grid grid-cols-[0.78fr_1.22fr] gap-4 p-5 xl:gap-5 xl:p-6">
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
