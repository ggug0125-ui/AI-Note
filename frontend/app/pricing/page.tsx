import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Check,
  CircleHelp,
  Coins,
  Download,
  FileText,
  Github,
  GraduationCap,
  History,
  Mail,
  RefreshCcw,
  Sparkles,
  TableProperties,
  Trophy,
  UploadCloud,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";

type Plan = {
  name: string;
  badge?: string;
  price: string;
  credits: string;
  description: string;
  features: string[];
  ctaLabel: string;
  href: string;
  featured?: boolean;
};

type PolicyRow = {
  service: string;
  policy: string;
  note: string;
  icon: LucideIcon;
};

const PRICING_PLANS: Plan[] = [
  {
    name: "Starter",
    price: "₩5,900",
    credits: "50 Credit",
    description: "가볍게 문서 분석과 변환을 시작하는 개인용 플랜입니다.",
    features: ["짧은 문서 분석", "파일 변환 체험", "AI 타로 이용"],
    ctaLabel: "크레딧 충전하기",
    href: "/mypage",
  },
  {
    name: "Standard",
    badge: "추천",
    price: "₩12,900",
    credits: "150 Credit",
    description: "학생, 직장인이 가장 부담 없이 반복 사용하기 좋은 플랜입니다.",
    features: ["문서 분석 반복 사용", "변환 파일 다운로드", "크레딧 사용내역 확인"],
    ctaLabel: "크레딧 충전하기",
    href: "/mypage",
    featured: true,
  },
  {
    name: "Premium",
    price: "₩29,900",
    credits: "420 Credit",
    description: "긴 문서와 여러 변환 작업을 자주 처리하는 사용자에게 맞습니다.",
    features: ["대용량 문서 처리", "업무용 변환 워크플로", "타로와 문서 분석 함께 사용"],
    ctaLabel: "크레딧 충전하기",
    href: "/mypage",
  },
  {
    name: "Enterprise",
    price: "문의",
    credits: "Custom",
    description: "팀, 강의, 기관 시연처럼 별도 크레딧 운영이 필요한 경우 상담합니다.",
    features: ["맞춤 크레딧", "팀 사용 안내", "도입 상담"],
    ctaLabel: "문의하기",
    href: "mailto:ggug0125@gmail.com",
  },
];

const creditIntro = [
  {
    title: "필요한 만큼만 사용",
    description: "월 구독 부담 없이 필요한 작업에 맞춰 크레딧을 충전하고 사용합니다.",
    icon: Coins,
  },
  {
    title: "실패한 작업은 차감 없음",
    description: "문서 업로드와 파일 변환은 성공한 경우에만 크레딧이 차감됩니다.",
    icon: RefreshCcw,
  },
  {
    title: "변환 파일 재다운로드 무료",
    description: "이미 변환된 파일은 다운로드 API로 다시 받아도 크레딧이 차감되지 않습니다.",
    icon: Download,
  },
];

const policyRows: PolicyRow[] = [
  {
    service: "문서 업로드",
    policy: "1~2 Page = 1 Credit / 3 Page 이상 = Page × 0.5",
    note: "PDF, TXT 문서 분석 정책에 적용됩니다.",
    icon: UploadCloud,
  },
  {
    service: "파일 변환",
    policy: "1~2 Page = 1 Credit / 3 Page 이상 = Page × 0.5",
    note: "PDF, TXT, XLSX, HWPX 변환 성공 후 차감됩니다.",
    icon: WandSparkles,
  },
  {
    service: "AI 타로",
    policy: "오늘의 운세 하루 1회 무료 / 추가 오늘의 운세 1 Credit / 주제별 리딩 3 Credit",
    note: "연애, 재물, 취업·진로, 학업, 자유질문은 3 Credit입니다.",
    icon: Sparkles,
  },
  {
    service: "다운로드",
    policy: "무료",
    note: "변환 완료 파일 재다운로드는 크레딧을 차감하지 않습니다.",
    icon: Download,
  },
];

const usageExamples = [
  {
    title: "학생",
    description: "강의자료를 업로드해 핵심 요약과 키워드를 정리하고, 과제 제출용 형식으로 변환합니다.",
    icon: GraduationCap,
  },
  {
    title: "직장인",
    description: "회의자료와 보고서를 빠르게 요약하고, XLSX·PDF 변환으로 공유 파일을 준비합니다.",
    icon: BriefcaseBusiness,
  },
  {
    title: "취업 준비",
    description: "채용 공고와 포트폴리오 자료를 분석하고, 취업·진로 타로로 가볍게 방향을 점검합니다.",
    icon: Trophy,
  },
];

const advantages = [
  { title: "AI 문서 분석", description: "요약, 키워드, AI Chat으로 문서의 핵심을 빠르게 파악합니다.", icon: FileText },
  { title: "파일 변환", description: "PDF, TXT, XLSX, HWPX를 필요한 형식으로 변환합니다.", icon: WandSparkles },
  { title: "AI 타로", description: "오늘의 운세와 주제별 리딩을 AI가 생성합니다.", icon: Bot },
  { title: "크레딧 사용내역", description: "업로드, 변환, 타로, 충전 기록을 마이페이지에서 확인합니다.", icon: History },
];

const faqs = [
  {
    question: "작업이 실패해도 크레딧이 차감되나요?",
    answer: "아니요. 문서 업로드와 파일 변환은 성공한 경우에만 차감됩니다.",
  },
  {
    question: "다운로드할 때도 크레딧을 쓰나요?",
    answer: "아니요. 변환 완료 후 다운로드와 재다운로드는 무료입니다.",
  },
  {
    question: "무료로 사용할 수 있는 기능이 있나요?",
    answer: "AI 타로 오늘의 운세는 하루 1회 무료입니다. 다운로드도 무료로 제공됩니다.",
  },
  {
    question: "환불 정책은 어떻게 되나요?",
    answer: "결제 및 환불은 서비스 운영 정책에 따라 안내됩니다. 시연 단계에서는 문의를 통해 확인해주세요.",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--ai-color-background)] text-[var(--ai-color-text-primary)]">
      <SiteHeader />

      <section className="relative overflow-hidden bg-[linear-gradient(145deg,rgb(var(--ai-bg))_0%,rgb(var(--ai-surface))_48%,rgb(var(--ai-panel))_100%)] px-4 pb-12 pt-24 md:px-8 md:pb-16 md:pt-28">
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.72fr)]">
          <div>
            <span className="ai-badge ai-badge-primary w-fit">AI Note Pricing</span>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              필요한 만큼 사용하는 크레딧 기반 AI 플랫폼
            </h1>
            <p className="mt-5 max-w-2xl text-base font-bold leading-8 text-[var(--ai-color-text-secondary)] md:text-lg">
              문서 분석, 파일 변환, AI 타로를 하나의 크레딧으로 이용합니다. 성공한 작업만 차감하고 다운로드는 무료입니다.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/mypage" className="ai-btn ai-btn-primary min-h-12 px-7 shadow-[0_16px_34px_rgba(242,72,72,0.22)]">
                크레딧 충전하기
                <ArrowRight size={18} />
              </Link>
              <Link href="#policy" className="ai-btn ai-btn-ghost min-h-12 px-6">
                정책 보기
                <TableProperties size={18} />
              </Link>
            </div>
          </div>

          <div className="rounded-[var(--ai-radius-card)] border border-primary/25 bg-card/85 p-5 shadow-[0_24px_64px_rgba(111,64,40,0.14)] backdrop-blur">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <span className="text-sm font-black text-title">Credit Rule</span>
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-black text-white">Simple</span>
            </div>
            <div className="mt-5 grid gap-3">
              {creditIntro.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-2xl border border-border bg-panel p-4">
                    <p className="flex items-center gap-2 text-sm font-black text-title">
                      <Icon size={18} className="text-primary" />
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm font-bold leading-6 text-[var(--ai-color-text-secondary)]">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-7xl">
          <PricingSectionHeader
            eyebrow="Credit Basics"
            title="크레딧은 이렇게 사용됩니다"
            description="AI Note는 필요한 기능을 성공적으로 사용했을 때만 크레딧을 차감하는 단순한 정책을 따릅니다."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {creditIntro.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-[var(--ai-radius-card)] border border-border bg-card p-6 shadow-soft">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-panel text-primary">
                    <Icon size={23} />
                  </div>
                  <h3 className="mt-5 text-xl font-black text-title">{item.title}</h3>
                  <p className="mt-3 text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)]">{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="policy" className="bg-[var(--ai-color-surface)] px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-7xl">
          <PricingSectionHeader
            eyebrow="Usage Policy"
            title="크레딧 사용 정책"
            description="현재 AI Note 2.0에서 적용되는 문서 업로드, 파일 변환, AI 타로, 다운로드 정책입니다."
          />
          <div className="mt-10 overflow-hidden rounded-[var(--ai-radius-card)] border border-border bg-card shadow-soft">
            <div className="hidden grid-cols-[0.8fr_1.25fr_1fr] border-b border-border bg-panel px-5 py-4 text-sm font-black text-title md:grid">
              <span>기능</span>
              <span>차감 정책</span>
              <span>안내</span>
            </div>
            {policyRows.map((row) => {
              const Icon = row.icon;
              return (
                <article key={row.service} className="grid gap-3 border-b border-border px-5 py-5 last:border-b-0 md:grid-cols-[0.8fr_1.25fr_1fr] md:items-center">
                  <div className="flex items-center gap-3 text-base font-black text-title">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-panel text-primary">
                      <Icon size={20} />
                    </span>
                    {row.service}
                  </div>
                  <p className="text-sm font-black leading-7 text-body">{row.policy}</p>
                  <p className="text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)]">{row.note}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-7xl">
          <PricingSectionHeader
            eyebrow="Plans"
            title="요금제 카드"
            description="가격과 크레딧은 페이지 상단 상수에서 관리해 향후 쉽게 변경할 수 있습니다."
          />
          <div className="mt-10 grid gap-4 lg:grid-cols-4">
            {PRICING_PLANS.map((plan) => (
              <PlanCard key={plan.name} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--ai-color-surface)] px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-7xl">
          <PricingSectionHeader
            eyebrow="Examples"
            title="사용 예시"
            description="AI Note의 크레딧은 공부, 업무, 취업 준비처럼 반복되는 문서 작업에 맞춰 사용할 수 있습니다."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {usageExamples.map((example) => {
              const Icon = example.icon;
              return (
                <article key={example.title} className="rounded-[var(--ai-radius-card)] border border-border bg-card p-6 shadow-soft">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-panel text-primary">
                    <Icon size={23} />
                  </div>
                  <h3 className="mt-5 text-xl font-black text-title">{example.title}</h3>
                  <p className="mt-3 text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)]">{example.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-7xl">
          <PricingSectionHeader
            eyebrow="Why AI Note"
            title="AI Note 장점"
            description="문서 분석부터 기록 확인까지 하나의 작업 흐름으로 연결됩니다."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {advantages.map((advantage) => {
              const Icon = advantage.icon;
              return (
                <article key={advantage.title} className="rounded-[var(--ai-radius-card)] border border-border bg-card p-5 shadow-soft transition hover:-translate-y-1 hover:border-primary/35">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-panel text-primary">
                    <Icon size={21} />
                  </div>
                  <h3 className="mt-5 text-lg font-black text-title">{advantage.title}</h3>
                  <p className="mt-3 text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)]">{advantage.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[var(--ai-color-surface)] px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <PricingSectionHeader
            eyebrow="FAQ"
            title="자주 묻는 질문"
            description="크레딧 차감과 다운로드, 무료 기능, 환불 정책에 대한 기본 안내입니다."
          />
          <div className="grid gap-3">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex gap-3">
                  <CircleHelp className="mt-0.5 shrink-0 text-primary" size={20} />
                  <div>
                    <h3 className="text-base font-black text-title">{faq.question}</h3>
                    <p className="mt-2 text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)]">{faq.answer}</p>
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
              <span className="ai-badge ai-badge-primary w-fit">Start</span>
              <h2 className="mt-5 text-3xl font-black leading-tight md:text-5xl">크레딧을 확인하고 AI Workspace에서 시작하세요.</h2>
              <p className="mt-4 max-w-2xl text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)] md:text-base">
                업로드, 분석, 파일 변환, 사용내역 확인까지 하나의 작업 공간에서 이어집니다.
              </p>
            </div>
            <Link href="/dashboard" className="ai-btn ai-btn-primary min-h-12 justify-center px-7">
              AI Workspace 바로가기
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <PricingFooter />
    </main>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const isEnterprise = plan.name === "Enterprise";
  return (
    <article
      className={[
        "relative flex min-h-[29rem] flex-col rounded-[var(--ai-radius-card)] border p-6 shadow-soft transition hover:-translate-y-1",
        plan.featured
          ? "border-primary/55 bg-[linear-gradient(145deg,rgb(var(--ai-card))_0%,rgb(var(--ai-panel))_100%)] shadow-[0_24px_64px_rgba(242,72,72,0.16)]"
          : "border-border bg-card hover:border-primary/30",
      ].join(" ")}
    >
      {plan.badge && (
        <span className="absolute right-5 top-5 rounded-full bg-primary px-3 py-1 text-xs font-black text-white">
          {plan.badge}
        </span>
      )}
      <h3 className="text-2xl font-black text-title">{plan.name}</h3>
      <p className="mt-3 text-sm font-bold leading-7 text-[var(--ai-color-text-secondary)]">{plan.description}</p>
      <div className="mt-6">
        <p className="text-4xl font-black text-title">{plan.price}</p>
        <p className="mt-2 text-sm font-black text-primary">{plan.credits}</p>
      </div>
      <ul className="mt-6 grid gap-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2 text-sm font-bold text-body">
            <Check className="mt-0.5 shrink-0 text-primary" size={16} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        href={plan.href}
        className={[
          "ai-btn mt-auto min-h-12 justify-center px-5",
          plan.featured ? "ai-btn-primary" : "ai-btn-ghost",
        ].join(" ")}
      >
        {plan.ctaLabel}
        {isEnterprise ? <Mail size={18} /> : <ArrowRight size={18} />}
      </Link>
    </article>
  );
}

function PricingSectionHeader({
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

function PricingFooter() {
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
            <span className="text-[var(--ai-color-text-primary)]">Pricing</span>: Credit Based
          </p>
        </div>
      </div>
    </footer>
  );
}
