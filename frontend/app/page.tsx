import { ArrowRight, FileText, Hash, MessageCircle, PlayCircle, Sheet, Sparkles, Stars } from "lucide-react";
import { PrimaryLink } from "../components/PrimaryLink";
import { SiteHeader } from "../components/SiteHeader";
import { WaveBackground } from "../components/WaveBackground";

const features = [
  {
    title: "PDF 문서 분석",
    description: "PDF 파일을 업로드하면 AI가 자동으로 텍스트를 추출하고 핵심 내용을 분석합니다.",
    icon: FileText,
    metricLabel: "텍스트 인식률",
    metric: "99.8%",
    tone: "bg-red-50 text-red-600"
  },
  {
    title: "AI 자동 요약",
    description: "긴 문서도 3줄 핵심 요약으로 변환합니다. 중요한 내용을 놓치지 않고 빠르게 파악하세요.",
    icon: Stars,
    metricLabel: "요약 정확도",
    metric: "98%",
    tone: "bg-amber-50 text-amber-600"
  },
  {
    title: "키워드 추출",
    description: "문서의 핵심 키워드를 자동으로 추출하여 주제 파악과 검색을 용이하게 합니다.",
    icon: Hash,
    metricLabel: "평균 추출 키워드",
    metric: "25+",
    tone: "bg-emerald-50 text-emerald-700"
  },
  {
    title: "AI 문서 채팅",
    description: "문서 내용을 기반으로 AI에게 질문하면 정확한 답변과 함께 출처 문단을 보여줍니다.",
    icon: MessageCircle,
    metricLabel: "출처 기반 답변",
    metric: "ON",
    tone: "bg-red-50 text-red-600"
  },
  {
    title: "엑셀·한글 변환",
    description: "한글(HWP)과 엑셀(XLSX) 파일도 분석할 수 있도록 확장 가능한 구조를 제공합니다.",
    icon: Sheet,
    metricLabel: "지원 예정 포맷",
    metric: "12+",
    tone: "bg-amber-50 text-amber-700"
  }
];

const steps = [
  {
    title: "문서 업로드",
    description: "PDF, 한글, 엑셀 파일을 드래그 앤 드롭으로 간편하게 업로드하세요."
  },
  {
    title: "AI 자동 분석",
    description: "업로드된 문서를 AI가 실시간으로 분석하여 텍스트를 추출하고 구조화합니다."
  },
  {
    title: "요약 & 키워드",
    description: "핵심 요약과 주요 키워드가 자동 생성됩니다. 대시보드에서 한눈에 확인하세요."
  },
  {
    title: "AI 채팅으로 deep dive",
    description: "문서 내용에 대해 AI와 자유롭게 대화하며 더 깊은 인사이트를 얻을 수 있습니다."
  }
];

const showcase = [
  {
    title: "연구 논문 분석",
    description: "복잡한 학술 논문을 요약하고 핵심 방법론과 결과를 자동 추출합니다.",
    image: "from-stone-100 via-amber-50 to-red-100"
  },
  {
    title: "비즈니스 리포트",
    description: "분기별 보고서에서 핵심 수치와 트렌드를 빠르게 찾아줍니다.",
    image: "from-blue-500 via-sky-400 to-blue-900"
  },
  {
    title: "계약서 검토",
    description: "중요 조항과 위험 요소를 문맥 기반으로 확인합니다.",
    image: "from-orange-100 via-white to-stone-200"
  },
  {
    title: "교육 자료 정리",
    description: "강의 노트와 교재를 체계적으로 정리하고 학습 가이드를 생성합니다.",
    image: "from-red-100 via-amber-50 to-stone-100"
  }
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-ivory text-ink">
      <SiteHeader />

      <section className="relative flex min-h-screen items-center px-4 pb-14 pt-24 md:px-8 md:pb-16 md:pt-28">
        <WaveBackground />
        <div className="relative z-10 mx-auto w-full max-w-7xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-4 py-2 text-sm font-semibold text-neutral-700 shadow-soft">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            AI 문서 분석의 새로운 기준
          </div>
          <h1 className="mx-auto mt-7 max-w-4xl text-4xl font-black leading-tight sm:text-5xl md:text-7xl lg:text-8xl">
            문서를 읽는
            <br />
            <span className="text-coral">가장 스마트한</span> 방법
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-neutral-600 md:mt-7 md:text-xl md:leading-8">
            PDF, 한글, 엑셀 파일을 업로드하면 AI가 자동으로 요약과 키워드를 추출해드립니다.
            문서 내용에 대해 AI와 채팅하며 더 깊은 인사이트를 발견하세요.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PrimaryLink href="/login">
              무료로 시작하기
              <ArrowRight className="ml-2" size={18} />
            </PrimaryLink>
            <PrimaryLink href="#features" variant="secondary">
              <PlayCircle className="mr-2" size={18} />
              기능 살펴보기
            </PrimaryLink>
          </div>
          <div className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-3 sm:gap-4 md:mt-20 md:grid-cols-4">
            {[
              ["98%", "요약 정확도"],
              ["50K+", "분석 문서"],
              ["3초", "평균 처리 시간"],
              ["12+", "지원 파일 형식"]
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-soft backdrop-blur-md md:p-6">
                <strong className="block text-2xl font-black md:text-3xl">{value}</strong>
                <span className="mt-2 block text-sm text-neutral-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="bg-[#F4F2EE] px-4 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-[0.9fr_1fr] md:items-start">
            <div>
              <span className="rounded-full bg-red-100 px-4 py-2 text-sm font-bold text-coral">핵심 기능</span>
              <h2 className="mt-5 text-3xl font-black leading-tight md:text-6xl">
                당신의 문서를
                <br />
                더 똑똑하게
              </h2>
            </div>
            <p className="max-w-xl pt-2 text-base leading-7 text-neutral-600 md:pt-8 md:text-lg md:leading-8">
              AI가 문서의 맥락을 이해하고 가장 중요한 정보만 쏙쏙 뽑아드려요. 복잡한 문서도 3초면 끝.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:mt-16 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="max-w-full rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-soft md:p-8">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${feature.tone}`}>
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-6 text-xl font-black">{feature.title}</h3>
                  <p className="mt-4 min-h-20 leading-7 text-neutral-600">{feature.description}</p>
                  <div className="mt-6 flex items-end justify-between border-t border-neutral-100 pt-5">
                    <span className="text-sm text-neutral-500">{feature.metricLabel}</span>
                    <strong className="text-2xl font-black text-neutral-800">{feature.metric}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how" className="bg-white px-4 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-7xl">
          <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">사용 방법</span>
          <h2 className="mt-5 text-3xl font-black leading-tight md:text-6xl">
            4단계로 끝나는
            <br />
            문서 분석
          </h2>
          <div className="mt-10 grid gap-4 md:mt-14 md:grid-cols-4 md:gap-5">
            {steps.map((step, index) => (
              <article key={step.title} className="relative max-w-full rounded-2xl border border-black/5 bg-[#F4F2EE] p-5 md:p-6">
                <span className="text-4xl font-black text-neutral-300">{String(index + 1).padStart(2, "0")}</span>
                <div className="mt-5 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-neutral-700 shadow-sm">
                  {index === 0 ? <FileText size={18} /> : index === 1 ? <Sparkles size={18} /> : index === 2 ? <Hash size={18} /> : <MessageCircle size={18} />}
                </div>
                <h3 className="mt-6 font-black">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-neutral-600">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="reviews" className="border-y border-black/5 bg-white px-4 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-700">사용자 후기</span>
          <h2 className="mt-5 text-3xl font-black leading-tight md:text-5xl">
            실제 사용자들의
            <br />
            생생한 경험담
          </h2>
          <article className="mt-10 max-w-full rounded-3xl border border-black/5 bg-[#F4F2EE] p-5 text-left shadow-sm md:mt-14 md:p-10">
            <div className="inline-flex rounded-full bg-black px-4 py-2 text-sm font-black text-amber-300">★★★★★ 5.0</div>
            <p className="mt-7 text-base leading-7 text-neutral-800 md:text-xl md:leading-9">
              “논문 리뷰할 때 정말 혁명적이에요. PDF 50페이지짜리 논문도 3초만에 요약해주고, 궁금한 부분은 바로 채팅으로 물어볼 수 있어서 연구 효율이 크게 올랐습니다.”
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-400" />
              <div>
                <strong>김민준</strong>
                <span className="block text-sm text-neutral-500">대학원생 · 서울대학교</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="bg-[#0E0C09] px-4 py-16 text-white md:px-8 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-2 md:items-end">
            <div>
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-coral">분석 결과</span>
              <h2 className="mt-5 text-3xl font-black leading-tight md:text-6xl">
                당신의 문서가
                <br />
                이렇게 변합니다
              </h2>
            </div>
            <p className="max-w-xl text-lg leading-8 text-neutral-300">
              AI가 분석한 결과를 깔끔한 대시보드에서 한눈에 확인하세요. 요약, 키워드, 인사이트까지.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:mt-14 md:grid-cols-4 md:gap-5">
            {showcase.map((item) => (
              <article key={item.title} className="overflow-hidden rounded-2xl bg-white text-ink">
                <div className={`h-48 bg-gradient-to-br ${item.image}`} />
                <div className="p-5">
                  <h3 className="font-black">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-neutral-600">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="relative overflow-hidden bg-white px-4 py-16 text-center md:px-8 md:py-24">
        <WaveBackground className="opacity-80" />
        <div className="relative z-10 mx-auto max-w-4xl">
          <h2 className="text-3xl font-black leading-tight md:text-6xl">
            지금 바로
            <br />
            <span className="text-coral">무료로 시작</span>하세요
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-neutral-600">
            신규 가입 시 모든 기능을 14일간 무료로 체험할 수 있습니다. 신용카드 정보 없이 바로 시작하세요.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <PrimaryLink href="/login">
              무료 체험 시작하기
              <ArrowRight className="ml-2" size={18} />
            </PrimaryLink>
            <PrimaryLink href="/login" variant="secondary">
              기존 계정 로그인
            </PrimaryLink>
          </div>
        </div>
      </section>
    </main>
  );
}
