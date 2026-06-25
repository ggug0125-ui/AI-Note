"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Heart,
  Moon,
  Sparkles,
  Star,
  Sun,
  WandSparkles,
  X
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";
import { CreditBadge } from "@/components/CreditBadge";
import {
  getTarotCardBackImage,
  getTarotCardsForTheme,
  type TarotCard,
  type TarotTheme
} from "@/lib/tarotCards";

const cards = [
  { label: "과거", symbol: "☾" },
  { label: "현재", symbol: "✦" },
  { label: "미래", symbol: "☼" }
];

const categories = [
  { title: "오늘의 운세", icon: Sun },
  { title: "연애운", icon: Heart },
  { title: "취업/진로", icon: Star },
  { title: "재물운", icon: Sparkles },
  { title: "학업운", icon: WandSparkles },
  { title: "자유 질문", icon: CircleHelp }
];

const tarotDeckCopy: Record<string, { title: string; description: string }> = {
  "오늘의 운세": {
    title: "오늘의 운세 카드 덱",
    description: "오늘 당신에게 다가오는 흐름은 무엇일까요? 마음이 끌리는 카드 3장을 선택해보세요."
  },
  "연애운": {
    title: "연애운 카드 덱",
    description: "당신의 마음과 인연의 흐름을 들여다볼 시간입니다. 끌리는 카드 3장이 사랑의 메시지를 전해줄 거예요."
  },
  "재물운": {
    title: "재물운 카드 덱",
    description: "기회는 어디에 숨어 있을까요? 카드 3장을 통해 돈과 행운의 흐름을 읽어보세요."
  },
  "취업/진로": {
    title: "취업·진로 카드 덱",
    description: "당신이 나아갈 길에 어떤 가능성이 기다리고 있을까요? 카드 3장이 미래의 방향을 비춰줍니다."
  },
  "취업/진로운": {
    title: "취업·진로 카드 덱",
    description: "당신이 나아갈 길에 어떤 가능성이 기다리고 있을까요? 카드 3장이 미래의 방향을 비춰줍니다."
  },
  "학업운": {
    title: "학업운 카드 덱",
    description: "노력은 어떤 결실로 이어질까요? 카드 3장을 선택하고 성장의 흐름을 확인해보세요."
  },
  "자유 질문": {
    title: "자유 질문 카드 덱",
    description: "마음속 질문을 떠올려보세요. 카드 3장이 당신만의 답을 찾아가는 단서를 보여줄 거예요."
  }
};

const savedReadingFilters = ["전체", "오늘의 운세", "연애운", "재물운", "취업/진로", "학업운", "자유질문"];

const flyingWitchImages = ["/images/tarot/witch-flying.png", "/images/tarot/witch-hero1.png"];
const mascotImages = ["/images/tarot/witch-hero.png", "/images/tarot/witch-hero1.png"];
const fairyMascotImages = ["/images/tarot/yojung-sub.png"];

const cardPositions = ["과거", "현재", "미래"];
const TOKEN_KEY = "access_token";
const USER_KEY = "user";
const CREDIT_SHORTAGE_MESSAGE = "크레딧이 부족합니다. 결제 정보에서 크레딧을 충전해주세요.";

const tarotThemeOptions: Array<{
  theme: TarotTheme;
  label: string;
  description: string;
  features: string[];
  previewCard: string;
  mbtiImage: string;
  brandName: string;
}> = [
  {
    theme: "witch",
    label: "마녀의 세계",
    description: "밤의 숲처럼 깊고 선명한 메시지를 전합니다.",
    features: ["현실적인 조언", "숨겨진 진실", "직관적 해석"],
    previewCard: "/images/tarot/witch-hero1.png",
    mbtiImage: "/images/tarot/mbti_t.png",
    brandName: "Chichi"
  },
  {
    theme: "fairy",
    label: "요정의 세계",
    description: "빛처럼 따뜻하고 감성적인 흐름을 전합니다.",
    features: ["따뜻한 위로", "희망의 흐름", "감성적 해석"],
    previewCard: "/images/tarot/yojung-main.png",
    mbtiImage: "/images/tarot/mbti_f.png",
    brandName: "Lilla"
  }
];

type TarotReadingSource = "local" | "openai";
type CalendarType = "solar" | "lunar";

type LocalTarotReading = {
  overallSummary: string;
  pastInsight: string;
  presentInsight: string;
  futureInsight: string;
  advice: string;
  caution: string;
  finalMessage: string;
  source: TarotReadingSource;
  credit_usage?: TarotCreditUsage;
};

type TarotCreditUsage = {
  service: "tarot";
  category: string;
  credit_cost: number;
  free_daily: boolean;
  credits_before: number;
  credits_after: number;
};

type TarotReadingContext = {
  category: string;
  question: string;
  birthDate: string;
  calendarType: CalendarType;
  theme: TarotTheme;
};

type PendingTarotStart = {
  category: string;
  question: string;
  birthDate: string;
  calendarType: CalendarType;
};

type SavedTarotCard = {
  position: string;
  name: string;
  englishName: string;
  keywords: string[];
  uprightMeaning: string;
};

type SavedTarotReading = {
  reading_id: string;
  category: string;
  question: string;
  theme?: TarotTheme | null;
  birth_date?: string | null;
  calendar_type?: CalendarType | null;
  cards: SavedTarotCard[];
  reading: LocalTarotReading;
  source: TarotReadingSource;
  created_at: string;
};

function shuffleCards(source: TarotCard[]) {
  return [...source].sort(() => Math.random() - 0.5);
}

function buildLocalTarotReading(cards: TarotCard[]): LocalTarotReading | null {
  if (cards.length < 3) {
    return null;
  }

  const [past, present, future] = cards;
  const flowKeywords = cards.map((card) => card.keywords[0]).join(" → ");
  const adviceKeywords = [present.keywords[1], future.keywords[1]].filter(Boolean).join("과 ");

  return {
    overallSummary: `${past.koreanName}의 ${past.keywords[0]}에서 출발한 흐름이 ${present.koreanName}의 ${present.keywords[0]}을 지나 ${future.koreanName}의 ${future.keywords[0]} 가능성으로 이어지고 있습니다. 오늘의 큰 흐름은 ${flowKeywords}입니다.`,
    pastInsight: `과거에는 ${past.koreanName} 카드가 말하듯 ${past.keywords.join(", ")}의 영향이 컸습니다. ${past.uprightMeaning}`,
    presentInsight: `현재의 핵심은 ${present.koreanName} 카드의 ${present.keywords[0]}입니다. ${present.uprightMeaning}`,
    futureInsight: `미래에는 ${future.koreanName} 카드가 보여주는 ${future.keywords.join(", ")}의 방향이 열릴 수 있습니다. ${future.uprightMeaning}`,
    advice: `지금은 ${adviceKeywords || present.keywords[0]}을 의식하며 움직여보세요. ${present.shortMessage} ${future.shortMessage}`,
    caution: `${past.keywords.at(-1)}와 ${present.keywords.at(-1)}에만 마음이 쏠리면 시야가 좁아질 수 있습니다. 선택을 서두르기보다 카드가 보여준 흐름을 차분히 확인해보세요.`,
    finalMessage: `${future.shortMessage} 오늘의 선택은 이미 다음 장면을 조용히 준비하고 있습니다.`,
    source: "local"
  };
}

function formatSavedReadingDate(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatBirthDateLabel(birthDate: string) {
  if (!birthDate) {
    return "";
  }

  return birthDate.replaceAll("-", ".");
}

function getCalendarTypeLabel(calendarType: CalendarType | null | undefined) {
  return calendarType === "lunar" ? "음력" : "양력";
}

function formatBirthDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 4) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function formatCalendarDate(year: number, month: number, day: number) {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0")
  ].join("-");
}

function formatCreditAmount(credits: number) {
  return Number.isInteger(credits) ? String(credits) : credits.toFixed(1);
}

function getTarotCreditPolicyText(category: string) {
  if (category === categories[0]?.title) {
    return "오늘의 운세: 하루 1회 무료, 추가 이용 시 1 Credit";
  }

  return "연애운/재물운/취업·진로/학업운/자유질문: 3 Credits";
}

function getTarotExpectedCreditLabel(category: string) {
  if (category === categories[0]?.title) {
    return "하루 1회 무료 / 추가 1 Credit";
  }

  return "3 Credits";
}

function getTarotCreditUsageMessage(usage: TarotCreditUsage) {
  if (usage.free_daily) {
    return "오늘의 운세 무료 이용이 적용되었습니다.";
  }
  if (usage.credit_cost <= 0) {
    return "크레딧 차감 없이 결과가 저장되었습니다.";
  }

  return `${formatCreditAmount(usage.credit_cost)} Credits가 차감되었습니다. 현재 보유 크레딧: ${usage.credits_after.toLocaleString("en-US")} Credits`;
}

function getBirthDateParts(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  };
}

function CalendarTypeToggle({
  value,
  onChange,
  isFairyTheme
}: {
  value: CalendarType;
  onChange: (value: CalendarType) => void;
  isFairyTheme: boolean;
}) {
  return (
    <div className={["grid grid-cols-2 gap-2 rounded-2xl border p-1.5", isFairyTheme ? "border-pink-300/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.62),rgba(251,207,232,0.46),rgba(216,180,254,0.38))] shadow-[0_10px_28px_rgba(190,24,93,0.18),inset_0_0_0_1px_rgba(255,255,255,0.35)]" : "border-emerald-200/15 bg-emerald-950/55"].join(" ")}>
      {[
        { label: "양력", value: "solar" as CalendarType },
        { label: "음력", value: "lunar" as CalendarType }
      ].map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              "min-h-12 rounded-xl px-5 py-3 text-base font-black transition",
              isFairyTheme
                ? isActive
                  ? "bg-[linear-gradient(135deg,#ec4899,#d946ef,#8b5cf6)] text-white shadow-[0_0_24px_rgba(236,72,153,0.36),0_8px_18px_rgba(109,40,217,0.22)]"
                  : "border border-pink-300/30 bg-white/20 text-[#6d1645] hover:bg-fuchsia-200/45 hover:text-[#4a0f2f]"
                : isActive
                  ? "bg-yellow-300 text-[#042015] shadow-[0_0_18px_rgba(250,204,21,0.22)]"
                  : "text-emerald-100/75 hover:bg-emerald-300/10 hover:text-emerald-50"
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function BirthDateInput({
  value,
  onChange,
  label,
  isFairyTheme
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  isFairyTheme: boolean;
}) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const initialParts = getBirthDateParts(value);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);
  const [viewYear, setViewYear] = useState(initialParts?.year ?? currentYear);
  const [viewMonth, setViewMonth] = useState(initialParts?.month ?? today.getMonth() + 1);
  const selectedParts = getBirthDateParts(value);
  const years = Array.from({ length: currentYear - 1920 + 1 }, (_, index) => 1920 + index);
  const firstDayOfMonth = new Date(viewYear, viewMonth - 1, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const calendarCells = [
    ...Array.from({ length: firstDayOfMonth }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
  ];

  useEffect(() => {
    if (value.trim()) {
      setIsSkipped(false);
    }
  }, [value]);

  function openCalendar() {
    const parts = getBirthDateParts(value);
    if (parts && parts.year >= 1920 && parts.year <= currentYear && parts.month >= 1 && parts.month <= 12) {
      setViewYear(parts.year);
      setViewMonth(parts.month);
    }
    setIsCalendarOpen((current) => !current);
  }

  function moveMonth(offset: number) {
    const nextDate = new Date(viewYear, viewMonth - 1 + offset, 1);
    const minDate = new Date(1920, 0, 1);
    const maxDate = new Date(currentYear, 11, 1);
    const clampedDate = nextDate < minDate ? minDate : nextDate > maxDate ? maxDate : nextDate;
    setViewYear(clampedDate.getFullYear());
    setViewMonth(clampedDate.getMonth() + 1);
  }

  function selectDate(day: number) {
    onChange(formatCalendarDate(viewYear, viewMonth, day));
    setIsSkipped(false);
  }

  function selectToday() {
    setViewYear(currentYear);
    setViewMonth(today.getMonth() + 1);
    onChange(formatCalendarDate(currentYear, today.getMonth() + 1, today.getDate()));
    setIsSkipped(false);
  }

  function skipBirthDate() {
    onChange("");
    setIsSkipped(true);
    setIsCalendarOpen(false);
  }

  return (
    <div className="relative">
      <label className="block">
        <span className={["text-xs font-black", isFairyTheme ? "text-[#5b1238]" : "text-yellow-100"].join(" ")}>{label}</span>
        <div className="relative mt-2">
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(event) => {
              onChange(formatBirthDateInput(event.target.value));
              setIsSkipped(false);
            }}
            placeholder="예: 1990-03-15"
            className={[
              "min-h-14 w-full rounded-2xl border py-4 pl-4 pr-[8.25rem] text-base font-bold outline-none transition",
              isFairyTheme
                ? isSkipped
                  ? "border-[#ec4899] bg-white/94 text-[#111827] shadow-[0_0_0_2px_rgba(236,72,153,0.2),0_12px_30px_rgba(236,72,153,0.18)] placeholder:text-slate-400"
                  : "border-pink-300/75 bg-white/92 text-[#111827] shadow-[0_10px_28px_rgba(236,72,153,0.14),0_0_0_1px_rgba(251,207,232,0.45)] placeholder:text-slate-400 focus:border-[#e879a7] focus:shadow-[0_0_30px_rgba(236,72,153,0.3),0_0_18px_rgba(251,191,36,0.18)]"
                : isSkipped
                  ? "border-yellow-300/80 bg-white/94 text-[#111827] shadow-[0_0_0_2px_rgba(250,204,21,0.18),0_0_24px_rgba(52,211,153,0.14)] placeholder:text-slate-400"
                  : "border-emerald-200/35 bg-white/92 text-[#111827] placeholder:text-slate-400 focus:border-yellow-200/70 focus:shadow-[0_0_24px_rgba(250,204,21,0.16)]"
            ].join(" ")}
          />
          <button
            type="button"
            onClick={skipBirthDate}
            className={[
              "absolute right-[3.75rem] top-1/2 inline-flex min-h-8 -translate-y-1/2 items-center justify-center rounded-lg border px-2.5 text-xs font-black transition",
              isFairyTheme
                ? isSkipped
                  ? "border-[#ec4899] bg-[linear-gradient(135deg,#ec4899,#d946ef)] text-white shadow-[0_8px_18px_rgba(236,72,153,0.28)]"
                  : "border-pink-300/65 bg-white/72 text-[#6d1645] hover:bg-pink-100/85"
                : isSkipped
                  ? "border-yellow-300 bg-yellow-300 text-[#042015] shadow-[0_8px_18px_rgba(250,204,21,0.2)]"
                  : "border-emerald-200/35 bg-white/72 text-[#064e3b] hover:bg-emerald-50"
            ].join(" ")}
          >
            미입력
          </button>
          <button
            type="button"
            onClick={openCalendar}
            className={[
              "absolute right-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl border transition",
              isFairyTheme
                ? "border-pink-300/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(251,207,232,0.8),rgba(221,214,254,0.72))] text-[#6d1645] shadow-[0_8px_18px_rgba(190,24,93,0.16)] hover:border-[#f0ab62] hover:bg-[linear-gradient(135deg,#fff7ed,#f9a8d4,#c084fc)]"
                : "border-emerald-200/25 bg-emerald-950/80 text-yellow-100 hover:border-yellow-200/70 hover:bg-emerald-900"
            ].join(" ")}
            aria-label={`${label} 달력 열기`}
          >
            <CalendarDays size={19} />
          </button>
        </div>
      </label>

      {isCalendarOpen && (
        <div
          className={[
            "absolute left-0 right-0 top-[calc(100%+0.75rem)] z-30 rounded-2xl border p-3 shadow-[0_24px_70px_rgba(0,0,0,0.36)]",
            isFairyTheme
              ? "border-pink-200/90 bg-[radial-gradient(circle_at_18%_12%,rgba(255,247,237,0.9),transparent_30%),linear-gradient(145deg,#fff1f7,#f9a8d4,#c084fc)] text-[#4a0f2f] shadow-[0_24px_70px_rgba(126,34,206,0.28),0_0_34px_rgba(251,191,36,0.2)]"
              : "border-emerald-200/35 bg-[linear-gradient(145deg,#020806,#064e3b,#2e1065)] text-emerald-50"
          ].join(" ")}
        >
          <div className="grid grid-cols-[44px_1fr_1fr_44px] gap-2">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className={["inline-flex h-11 items-center justify-center rounded-xl border", isFairyTheme ? "border-pink-200/70 bg-white/45 text-[#831843]" : "border-emerald-200/20 bg-black/35 text-yellow-100"].join(" ")}
              aria-label="이전달"
            >
              <ChevronLeft size={18} />
            </button>
            <select
              value={viewYear}
              onChange={(event) => setViewYear(Number(event.target.value))}
              className={["h-11 rounded-xl border px-3 text-sm font-black outline-none", isFairyTheme ? "border-pink-200/70 bg-white/70 text-[#4c0519]" : "border-emerald-200/20 bg-black/55 text-emerald-50"].join(" ")}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              value={viewMonth}
              onChange={(event) => setViewMonth(Number(event.target.value))}
              className={["h-11 rounded-xl border px-3 text-sm font-black outline-none", isFairyTheme ? "border-pink-200/70 bg-white/70 text-[#4c0519]" : "border-emerald-200/20 bg-black/55 text-emerald-50"].join(" ")}
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                <option key={month} value={month}>
                  {month}월
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className={["inline-flex h-11 items-center justify-center rounded-xl border", isFairyTheme ? "border-pink-200/70 bg-white/45 text-[#831843]" : "border-emerald-200/20 bg-black/35 text-yellow-100"].join(" ")}
              aria-label="다음달"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className={["mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-black", isFairyTheme ? "text-[#831843]" : "text-emerald-100/78"].join(" ")}>
            {["일", "월", "화", "수", "목", "금", "토"].map((dayName) => (
              <span key={dayName} className="py-1">
                {dayName}
              </span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarCells.map((day, index) =>
              day ? (
                <button
                  key={`${viewYear}-${viewMonth}-${day}`}
                  type="button"
                  onClick={() => selectDate(day)}
                  className={[
                    "h-9 rounded-lg text-sm font-black transition",
                    selectedParts?.year === viewYear && selectedParts.month === viewMonth && selectedParts.day === day
                      ? isFairyTheme
                        ? "bg-[#831843] text-white"
                        : "bg-yellow-300 text-[#042015]"
                      : isFairyTheme
                        ? "bg-white/35 text-[#4c0519] hover:bg-pink-200/70"
                        : "bg-black/28 text-emerald-50 hover:bg-emerald-300/20"
                  ].join(" ")}
                >
                  {day}
                </button>
              ) : (
                <span key={`blank-${index}`} className="h-9" />
              )
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={selectToday}
              className={["min-h-11 rounded-xl border px-4 text-sm font-black", isFairyTheme ? "border-pink-200/70 bg-white/45 text-[#831843]" : "border-emerald-200/25 bg-black/35 text-emerald-50"].join(" ")}
            >
              오늘
            </button>
            <button
              type="button"
              onClick={() => setIsCalendarOpen(false)}
              className={["min-h-11 rounded-xl px-4 text-sm font-black", isFairyTheme ? "bg-pink-300 text-[#4c0519]" : "bg-emerald-300 text-[#042015]"].join(" ")}
            >
              선택 완료
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function restoreSavedCards(cards: SavedTarotCard[], theme: TarotTheme): TarotCard[] {
  const themedCards = getTarotCardsForTheme(theme);

  return cards.map((savedCard, index) => {
    const matchedCard = themedCards.find(
      (card) => card.name === savedCard.englishName || card.koreanName === savedCard.name
    );

    if (matchedCard) {
      return matchedCard;
    }

    return {
      id: 1000 + index,
      number: "",
      name: savedCard.englishName,
      koreanName: savedCard.name,
      theme,
      image: getTarotCardBackImage(theme),
      keywords: savedCard.keywords,
      uprightMeaning: savedCard.uprightMeaning,
      reversedMeaning: "",
      shortMessage: savedCard.uprightMeaning
    };
  });
}

async function fetchOpenAITarotReading(cards: TarotCard[], context: TarotReadingContext): Promise<LocalTarotReading> {
  const response = await authenticatedFetch(`${API_BASE_URL}/tarot/reading`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      category: context.category,
      question: context.question,
      theme: context.theme,
      birth_date: context.birthDate || null,
      calendar_type: context.birthDate ? context.calendarType : null,
      cards: cards.map((card, index) => ({
        position: cardPositions[index],
        name: card.koreanName,
        englishName: card.name,
        keywords: card.keywords,
        uprightMeaning: card.uprightMeaning
      }))
    })
  });

  if (!response.ok) {
    if (response.status === 402) {
      throw new Error(CREDIT_SHORTAGE_MESSAGE);
    }

    let message = "OpenAI tarot reading request failed.";
    try {
      const error = await response.json();
      message = String(error.detail || error.message || message);
    } catch {
      // Keep the generic message if the response body is not JSON.
    }
    throw new Error(message);
  }

  const data = (await response.json()) as LocalTarotReading;
  return {
    overallSummary: data.overallSummary,
    pastInsight: data.pastInsight,
    presentInsight: data.presentInsight,
    futureInsight: data.futureInsight,
    advice: data.advice,
    caution: data.caution,
    finalMessage: data.finalMessage,
    source: "openai",
    credit_usage: data.credit_usage
  };
}

function LocalTarotReadingSection({
  reading,
  category,
  isFairyTheme = false
}: {
  reading: LocalTarotReading;
  category: string;
  isFairyTheme?: boolean;
}) {
  const readingItems = [
    { label: "과거의 원인", text: reading.pastInsight },
    { label: "현재의 핵심", text: reading.presentInsight },
    { label: "미래 가능성", text: reading.futureInsight },
    { label: "조언", text: reading.advice },
    { label: "주의점", text: reading.caution },
    { label: "마지막 메시지", text: reading.finalMessage }
  ];

  return (
    <section
      className={[
        "rounded-2xl border p-4 shadow-[0_18px_48px_rgba(0,0,0,0.28)] sm:p-5",
        isFairyTheme
          ? "border-pink-300/50 bg-[linear-gradient(145deg,rgba(253,242,248,0.94),rgba(251,207,232,0.82),rgba(221,214,254,0.78))] text-[#4c0519] shadow-[0_18px_48px_rgba(76,5,75,0.22)]"
          : "border-yellow-300/20 bg-[linear-gradient(145deg,rgba(6,78,59,0.34),rgba(0,0,0,0.34))] shadow-[0_18px_48px_rgba(0,0,0,0.28),inset_0_0_0_1px_rgba(52,211,153,0.08)]"
      ].join(" ")}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={["text-xs font-black sm:text-sm", isFairyTheme ? "text-[#831843]" : "text-yellow-100"].join(" ")}>3장 조합 기반 종합 리딩</p>
          <h3 className={["mt-1.5 text-xl font-black sm:text-2xl", isFairyTheme ? "text-[#4c0519]" : "text-white"].join(" ")}>{category} 리딩</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className={["rounded-full border px-4 py-2 text-xs font-bold", isFairyTheme ? "border-pink-300/50 bg-white/58 text-[#831843]" : "border-yellow-300/25 bg-yellow-300/10 text-yellow-100"].join(" ")}>
            {category}
          </div>
          <div className={["rounded-full border px-4 py-2 text-xs font-bold", isFairyTheme ? "border-fuchsia-300/50 bg-fuchsia-950/12 text-[#5b123d]" : "border-emerald-200/20 bg-black/25 text-emerald-100"].join(" ")}>
            {reading.source === "openai" ? "OpenAI 해석" : "로컬 해석"}
          </div>
        </div>
      </div>
      <p className={["mt-4 rounded-2xl border p-3 text-sm leading-relaxed sm:p-4 sm:text-base", isFairyTheme ? "border-pink-300/45 bg-white/64 font-medium text-[#4c0519]" : "border-emerald-200/15 bg-black/25 font-bold text-emerald-50/88"].join(" ")}>
        {reading.overallSummary}
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {readingItems.map((item) => (
          <article key={item.label} className={["rounded-2xl border p-3 sm:p-4", isFairyTheme ? "border-pink-300/42 bg-white/54" : "border-emerald-200/14 bg-black/24"].join(" ")}>
            <h4 className={["text-sm font-black", isFairyTheme ? "text-[#be185d]" : "text-yellow-200"].join(" ")}>{item.label}</h4>
            <p className={["mt-2 text-sm leading-relaxed", isFairyTheme ? "font-medium text-[#3b082f]" : "text-emerald-50/84"].join(" ")}>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FallbackImage({
  sources,
  alt,
  className,
  fallback
}: {
  sources: string[];
  alt: string;
  className: string;
  fallback: React.ReactNode;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const [hasImageFallback, setHasImageFallback] = useState(false);
  const currentImage = sources[imageIndex];

  function handleImageError() {
    if (imageIndex < sources.length - 1) {
      setImageIndex((current) => current + 1);
      return;
    }

    setHasImageFallback(true);
  }

  if (hasImageFallback) {
    return fallback;
  }

  return <img src={currentImage} alt={alt} onError={handleImageError} className={className} />;
}

export default function TarotPage() {
  const [authStatus, setAuthStatus] = useState<"checking" | "authenticated" | "guest">("checking");
  const [authChecked, setAuthChecked] = useState(false);
  const [authLabel, setAuthLabel] = useState("로그인을 하세요");
  const [isReadingStarted, setIsReadingStarted] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isTarotAnalyzing, setIsTarotAnalyzing] = useState(false);
  const [isDeckShuffling, setIsDeckShuffling] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<TarotTheme>("witch");
  const [readingTheme, setReadingTheme] = useState<TarotTheme>("witch");
  const [selectedCategory, setSelectedCategory] = useState("오늘의 운세");
  const [isCategoryIntroActive, setIsCategoryIntroActive] = useState(false);
  const [question, setQuestion] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [calendarType, setCalendarType] = useState<CalendarType>("solar");
  const [partnerBirthDate, setPartnerBirthDate] = useState("");
  const [partnerCalendarType, setPartnerCalendarType] = useState<CalendarType>("solar");
  const [deck, setDeck] = useState<TarotCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<TarotCard[]>([]);
  const [tarotReading, setTarotReading] = useState<LocalTarotReading | null>(null);
  const [readingCategory, setReadingCategory] = useState("오늘의 운세");
  const [readingQuestion, setReadingQuestion] = useState("");
  const [readingBirthDate, setReadingBirthDate] = useState("");
  const [readingCalendarType, setReadingCalendarType] = useState<CalendarType>("solar");
  const [isSavingReading, setIsSavingReading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [savedReadings, setSavedReadings] = useState<SavedTarotReading[]>([]);
  const [isLoadingSavedReadings, setIsLoadingSavedReadings] = useState(false);
  const [savedReadingsError, setSavedReadingsError] = useState(false);
  const [savedReadingFilter, setSavedReadingFilter] = useState("전체");
  const [deletingReadingId, setDeletingReadingId] = useState<string | null>(null);
  const [pendingTarotStart, setPendingTarotStart] = useState<PendingTarotStart | null>(null);
  const [pendingCreditConfirm, setPendingCreditConfirm] = useState<PendingTarotStart | null>(null);
  const [credits, setCredits] = useState(0);
  const [tarotCreditError, setTarotCreditError] = useState("");
  const [tarotCreditNotice, setTarotCreditNotice] = useState("");
  const analysisTimerRef = useRef<number | null>(null);
  const shuffleTimerRef = useRef<number | null>(null);
  const autoSavedKeysRef = useRef<Set<string>>(new Set());
  const savingKeysRef = useRef<Set<string>>(new Set());
  const analysisInFlightRef = useRef(false);
  const isReadingComplete = selectedCards.length === 3;
  const localTarotReading = isReadingComplete ? tarotReading ?? buildLocalTarotReading(selectedCards) : null;
  const loveCategoryTitle = categories[1]?.title ?? "연애운";
  const freeQuestionCategoryTitle = categories[categories.length - 1]?.title ?? "자유 질문";
  const hasSelectedCategoryIntro = isCategoryIntroActive && Boolean(selectedCategory);
  const isLoveCategory = hasSelectedCategoryIntro && selectedCategory === loveCategoryTitle;
  const isFreeQuestionCategory = hasSelectedCategoryIntro && selectedCategory === freeQuestionCategoryTitle;
  const currentQuestion = isFreeQuestionCategory ? question.trim() : "";
  const currentBirthDate = birthDate.trim();
  const deckCopy = tarotDeckCopy[readingCategory] ?? tarotDeckCopy[selectedCategory] ?? tarotDeckCopy["오늘의 운세"];
  const cardBackImage = getTarotCardBackImage(selectedTheme);
  const readingCardBackImage = getTarotCardBackImage(readingTheme);
  const isFairyTheme = selectedTheme === "fairy";
  const isReadingFairyTheme = readingTheme === "fairy";
  const recordPanelTheme = selectedCards.length > 0 ? readingTheme : selectedTheme;
  const recordMascotImages = recordPanelTheme === "fairy" ? fairyMascotImages : mascotImages;
  const filteredSavedReadings = savedReadings.filter((reading) => {
    if (savedReadingFilter === "전체") {
      return true;
    }

    if (savedReadingFilter === "취업/진로") {
      return reading.category === "취업/진로" || reading.category === "취업/진로운";
    }

    if (savedReadingFilter === "자유질문") {
      return reading.category === "자유 질문";
    }

    return reading.category === savedReadingFilter;
  });

  async function loadCredits() {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/credits/me`);
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      const nextCredits = Number(data.credits || data.user?.credits || 0);
      setCredits(nextCredits);
      if (data.user) {
        window.localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }
    } catch {
      // Credit display should not block the tarot experience.
    }
  }

  useEffect(() => {
    const checkAuth = () => {
      const token = window.localStorage.getItem(TOKEN_KEY)?.trim();
      const hasToken = Boolean(token && token !== "undefined" && token !== "null");

      if (!hasToken) {
        setAuthLabel("로그인을 하세요");
        setAuthStatus("guest");
        setAuthChecked(true);
        return;
      }

      let nextAuthLabel = "로그인됨";
      const rawUser = window.localStorage.getItem(USER_KEY);

      if (rawUser) {
        try {
          const user = JSON.parse(rawUser) as { name?: string; email?: string; credits?: number };
          setCredits(Number(user.credits || 0));
          if (user.name?.trim()) {
            nextAuthLabel = `${user.name.trim()}님`;
          } else if (user.email?.trim()) {
            nextAuthLabel = user.email.trim();
          }
        } catch {
          nextAuthLabel = "로그인됨";
        }
      }

      setAuthLabel(nextAuthLabel);
      setAuthStatus("authenticated");
      setAuthChecked(true);
    };

    checkAuth();

    return () => {
      if (analysisTimerRef.current) {
        window.clearTimeout(analysisTimerRef.current);
      }
      if (shuffleTimerRef.current) {
        window.clearTimeout(shuffleTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (authChecked && authStatus === "authenticated") {
      void loadSavedReadings();
      void loadCredits();
    }
  }, [authChecked, authStatus]);

  function openCategorySelection(defaultCategory?: string) {
    if (defaultCategory) {
      setSelectedCategory(defaultCategory);
      setIsCategoryIntroActive(true);
    } else {
      setSelectedCategory("");
      setIsCategoryIntroActive(false);
    }
    if (defaultCategory !== "자유 질문") {
      setQuestion("");
    }
    setIsCategoryModalOpen(true);
  }

  function beginReadingWithCategory(
    category: string,
    nextQuestion = "",
    nextBirthDate = birthDate,
    nextCalendarType: CalendarType = calendarType
  ) {
    setSelectedCategory(category);
    setQuestion(nextQuestion);
    setBirthDate(nextBirthDate);
    setCalendarType(nextCalendarType);
    if (analysisTimerRef.current) {
      window.clearTimeout(analysisTimerRef.current);
    }

    setDeck(shuffleCards(getTarotCardsForTheme(selectedTheme)));
    setSelectedCards([]);
    setTarotReading(null);
    setSaveStatus("idle");
    setTarotCreditError("");
    setTarotCreditNotice("");
    setIsSavingReading(false);
    setReadingCategory(category);
    setReadingQuestion(category === "자유 질문" ? nextQuestion.trim() || "자유 질문" : "");
    setReadingBirthDate(nextBirthDate.trim());
    setReadingCalendarType(nextCalendarType);
    setReadingTheme(selectedTheme);
    setIsTarotAnalyzing(false);
    setIsDeckShuffling(false);
    analysisInFlightRef.current = false;
    setIsResultModalOpen(false);
    setIsCategoryModalOpen(false);
    setIsReadingStarted(true);
    setIsDeckModalOpen(true);
  }

  function requestReadingStart(
    category: string,
    nextQuestion = "",
    nextBirthDate = birthDate,
    nextCalendarType: CalendarType = calendarType
  ) {
    const isLoveStart = category === loveCategoryTitle;
    const hasMissingBirthDate = isLoveStart
      ? !nextBirthDate.trim() || !partnerBirthDate.trim()
      : !nextBirthDate.trim();

    if (hasMissingBirthDate) {
      setPendingTarotStart({
        category,
        question: nextQuestion,
        birthDate: nextBirthDate,
        calendarType: nextCalendarType
      });
      return;
    }

    setPendingCreditConfirm({
      category,
      question: nextQuestion,
      birthDate: nextBirthDate,
      calendarType: nextCalendarType
    });
    void loadCredits();
  }

  function confirmPendingTarotStart() {
    if (!pendingTarotStart) {
      return;
    }

    const nextStart = pendingTarotStart;
    setPendingTarotStart(null);
    setPendingCreditConfirm(nextStart);
    void loadCredits();
  }

  function startReading() {
    setPendingCreditConfirm({
      category: readingCategory || selectedCategory,
      question: readingQuestion || currentQuestion,
      birthDate: readingBirthDate || currentBirthDate,
      calendarType: readingCalendarType
    });
    void loadCredits();
  }

  function cancelCreditConfirm() {
    setPendingCreditConfirm(null);
  }

  function confirmCreditStart() {
    if (!pendingCreditConfirm) {
      return;
    }

    const nextStart = pendingCreditConfirm;
    setPendingCreditConfirm(null);
    beginReadingWithCategory(
      nextStart.category,
      nextStart.question,
      nextStart.birthDate,
      nextStart.calendarType
    );
  }

  function shuffleDeck() {
    if (selectedCards.length > 0 || isTarotAnalyzing || isDeckShuffling) {
      return;
    }

    if (shuffleTimerRef.current) {
      window.clearTimeout(shuffleTimerRef.current);
    }

    setIsDeckShuffling(true);
    shuffleTimerRef.current = window.setTimeout(() => {
      setDeck(shuffleCards(getTarotCardsForTheme(selectedTheme)));
      setIsDeckShuffling(false);
      shuffleTimerRef.current = null;
    }, 900);
  }

  function handleCardSelect(card: TarotCard) {
    if (
      !isReadingStarted ||
      isTarotAnalyzing ||
      analysisInFlightRef.current ||
      isReadingComplete ||
      selectedCards.some((selected) => selected.id === card.id)
    ) {
      return;
    }

    const nextCards = [...selectedCards, card];
    setSelectedCards(nextCards);

    if (nextCards.length === 3) {
      analysisInFlightRef.current = true;
      void completeTarotReading(nextCards);
    }
  }

  async function completeTarotReading(cards: TarotCard[]) {
    setIsTarotAnalyzing(true);
    setTarotCreditError("");
    const readingContext = {
      category: selectedCategory,
      question: currentQuestion,
      birthDate: currentBirthDate,
      calendarType,
      theme: cards[0]?.theme ?? readingTheme
    };

    const minimumDelay = new Promise<void>((resolve) => {
      analysisTimerRef.current = window.setTimeout(() => {
        analysisTimerRef.current = null;
        resolve();
      }, 1800);
    });

    const fallbackReading = buildLocalTarotReading(cards);
    let reading: LocalTarotReading | null = null;

    try {
      reading = await fetchOpenAITarotReading(cards, readingContext);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("크레딧이 부족") || message === CREDIT_SHORTAGE_MESSAGE) {
        await minimumDelay;
        setIsTarotAnalyzing(false);
        analysisInFlightRef.current = false;
        setSelectedCards([]);
        setTarotCreditError(CREDIT_SHORTAGE_MESSAGE);
        return;
      }

      reading = fallbackReading;
    }

    await minimumDelay;

    if (reading) {
      setTarotReading(reading);
      setReadingCategory(readingContext.category);
      setReadingQuestion(readingContext.question);
      setReadingBirthDate(readingContext.birthDate);
      setReadingCalendarType(readingContext.calendarType);
      setSaveStatus("idle");
    }

    setIsDeckModalOpen(false);
    setIsTarotAnalyzing(false);
    analysisInFlightRef.current = false;
    setIsResultModalOpen(true);

    if (reading) {
      void saveReadingRecord(
        cards,
        reading,
        readingContext.category,
        readingContext.question,
        readingContext.birthDate,
        readingContext.calendarType,
        readingContext.theme
      );
    }
  }

  async function saveCurrentReading() {
    if (!isReadingComplete || !localTarotReading || isSavingReading || saveStatus === "success") {
      return;
    }

    await saveReadingRecord(
      selectedCards,
      localTarotReading,
      readingCategory,
      readingQuestion,
      readingBirthDate,
      readingCalendarType,
      readingTheme
    );
  }

  function buildSavedReadingKey(
    cards: TarotCard[],
    reading: LocalTarotReading,
    category: string,
    savedQuestion: string,
    savedBirthDate: string,
    savedCalendarType: CalendarType,
    theme: TarotTheme
  ) {
    return JSON.stringify({
      category,
      question: savedQuestion,
      theme,
      birthDate: savedBirthDate,
      calendarType: savedBirthDate ? savedCalendarType : null,
      cards: cards.map((card) => card.name),
      reading
    });
  }

  async function saveReadingRecord(
    cards: TarotCard[],
    reading: LocalTarotReading,
    category: string,
    savedQuestion: string,
    savedBirthDate: string,
    savedCalendarType: CalendarType,
    theme: TarotTheme
  ) {
    const normalizedBirthDate = savedBirthDate.trim();
    const saveKey = buildSavedReadingKey(cards, reading, category, savedQuestion, normalizedBirthDate, savedCalendarType, theme);
    if (autoSavedKeysRef.current.has(saveKey) || savingKeysRef.current.has(saveKey)) {
      setSaveStatus("success");
      return;
    }

    savingKeysRef.current.add(saveKey);
    setIsSavingReading(true);
    setSaveStatus("idle");

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/tarot/readings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          category,
          question: savedQuestion,
          theme,
          birth_date: normalizedBirthDate || null,
          calendar_type: normalizedBirthDate ? savedCalendarType : null,
          cards: cards.map((card, index) => ({
            position: cardPositions[index],
            name: card.koreanName,
            englishName: card.name,
            keywords: card.keywords,
            uprightMeaning: card.uprightMeaning
          })),
          reading,
          source: reading.source
        })
      });

      if (!response.ok) {
        if (response.status === 402) {
          throw new Error(CREDIT_SHORTAGE_MESSAGE);
        }

        let message = "Failed to save tarot reading";
        try {
          const error = await response.json();
          message = String(error.detail || error.message || message);
        } catch {
          // Keep the generic message if the response body is not JSON.
        }
        throw new Error(message);
      }

      const data = (await response.json()) as { credit_usage?: TarotCreditUsage };
      if (data.credit_usage) {
        setTarotCreditNotice(getTarotCreditUsageMessage(data.credit_usage));
        setCredits(Number(data.credit_usage.credits_after ?? credits));
        setTarotReading((current) => (
          current === reading ? { ...current, credit_usage: data.credit_usage } : current
        ));
        await loadCredits();
      }

      autoSavedKeysRef.current.add(saveKey);
      setSaveStatus("success");
      await loadSavedReadings();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("크레딧이 부족") || message === CREDIT_SHORTAGE_MESSAGE) {
        setTarotCreditNotice(CREDIT_SHORTAGE_MESSAGE);
      }
      setSaveStatus("error");
    } finally {
      savingKeysRef.current.delete(saveKey);
      setIsSavingReading(false);
    }
  }

  async function loadSavedReadings() {
    setIsLoadingSavedReadings(true);
    setSavedReadingsError(false);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/tarot/readings?limit=20`);
      if (!response.ok) {
        throw new Error("Failed to load tarot readings");
      }

      const data = (await response.json()) as { readings: SavedTarotReading[] };
      setSavedReadings(data.readings ?? []);
    } catch {
      setSavedReadingsError(true);
    } finally {
      setIsLoadingSavedReadings(false);
    }
  }

  async function deleteSavedReading(readingId: string) {
    if (deletingReadingId || !window.confirm("정말 삭제하시겠습니까?")) {
      return;
    }

    setDeletingReadingId(readingId);
    setSavedReadingsError(false);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/tarot/readings/${readingId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Failed to delete tarot reading");
      }

      await loadSavedReadings();
    } catch {
      setSavedReadingsError(true);
    } finally {
      setDeletingReadingId(null);
    }
  }

  function openSavedReading(reading: SavedTarotReading) {
    const savedTheme = reading.theme === "fairy" ? "fairy" : "witch";
    const restoredCards = restoreSavedCards(reading.cards, savedTheme);
    setSelectedCards(restoredCards);
    setTarotReading({
      ...reading.reading,
      source: reading.source
    });
    setSelectedCategory(reading.category);
    setQuestion(reading.question || "");
    setBirthDate(reading.birth_date || "");
    setCalendarType(reading.calendar_type || "solar");
    setReadingCategory(reading.category);
    setReadingQuestion(reading.question || "");
    setReadingBirthDate(reading.birth_date || "");
    setReadingCalendarType(reading.calendar_type || "solar");
    setSelectedTheme(savedTheme);
    setReadingTheme(savedTheme);
    setIsReadingStarted(true);
    setIsDeckModalOpen(false);
    setIsTarotAnalyzing(false);
    setIsResultModalOpen(true);
    setSaveStatus("success");
  }

  if (!authChecked || authStatus === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020805] px-5 text-emerald-50">
        <div className="rounded-3xl border border-emerald-200/15 bg-black/30 px-6 py-5 text-center shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur">
          <p className="text-base font-black text-emerald-100">AI 타로 입장 확인중...</p>
        </div>
      </main>
    );
  }

  if (authStatus === "guest") {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#020805] px-5 py-8 text-emerald-50 sm:px-8 lg:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(52,211,153,0.22),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(250,204,21,0.16),transparent_24%),linear-gradient(135deg,#020805_0%,#062116_48%,#010403_100%)]" />
        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-200/20 bg-black/25 px-4 text-sm font-bold text-emerald-100 backdrop-blur transition hover:border-emerald-300/60 hover:bg-emerald-300/10"
          >
            <ArrowLeft size={16} />
            NoteFlow AI
          </Link>
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <div className="rounded-full border border-emerald-200/20 bg-black/25 px-4 py-2 text-xs font-extrabold text-emerald-100">
              {authLabel}
            </div>
            <div className="rounded-full border border-yellow-300/30 bg-yellow-300/10 px-4 py-2 text-sm font-extrabold text-yellow-200">
              AI 타로
            </div>
          </div>
        </header>

        <section className="relative z-10 mx-auto mt-24 w-full max-w-xl rounded-3xl border border-emerald-200/18 bg-black/35 p-6 text-center shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur md:p-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-300/35 bg-yellow-300/12 text-yellow-100 shadow-[0_0_28px_rgba(250,204,21,0.18)]">
            <Sparkles size={28} />
          </div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">AI 타로는 로그인 후 이용할 수 있습니다.</h1>
          <p className="mt-4 text-sm font-bold leading-7 text-emerald-100/82 sm:text-base">
            로그인하고 오늘의 카드 메시지를 확인해보세요.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-300 px-6 text-sm font-black text-[#042015] shadow-[0_0_28px_rgba(52,211,153,0.28)] transition hover:-translate-y-0.5 hover:bg-emerald-200"
            >
              로그인하기
            </Link>
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-full border border-yellow-300/45 bg-yellow-300/10 px-6 text-sm font-black text-yellow-100 transition hover:-translate-y-0.5 hover:bg-yellow-300/20"
            >
              NoteFlow AI 홈
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen overflow-hidden bg-[#05020a] text-white"
    >
      <section className="relative isolate min-h-screen px-4 py-6 sm:px-6 lg:px-10">
        <div className="pointer-events-none fixed inset-0 -z-20 bg-[url('/images/backgrounds/tarot-world.png')] bg-cover bg-center bg-fixed" />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-black/35" />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(217,70,239,0.18),transparent_24%),linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.38))]" />
        <div className="pointer-events-none tarot-magic-dust tarot-magic-dust-one" aria-hidden="true" />
        <div className="pointer-events-none tarot-magic-dust tarot-magic-dust-two" aria-hidden="true" />
        <div className="pointer-events-none tarot-magic-dust tarot-magic-dust-three" aria-hidden="true" />
        <div className="pointer-events-none tarot-shooting-star left-[12%] top-28" />
        <div className="pointer-events-none tarot-shooting-star tarot-shooting-star-delay left-[72%] top-40" />
        {isFairyTheme && (
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, index) => (
              <span key={`bubble-${index}`} className="tarot-fairy-bubble" style={{ "--bubble-index": index } as CSSProperties} />
            ))}
            {Array.from({ length: 6 }).map((_, index) => (
              <span key={`butterfly-${index}`} className="tarot-fairy-butterfly" style={{ "--butterfly-index": index } as CSSProperties}>
                🦋
              </span>
            ))}
          </div>
        )}
        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-200/20 bg-black/25 px-4 text-sm font-bold text-emerald-100 backdrop-blur transition hover:border-emerald-300/60 hover:bg-emerald-300/10"
          >
            <ArrowLeft size={16} />
            NoteFlow AI
          </Link>
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <CreditBadge credits={credits} tone={isFairyTheme ? "fairy" : "witch"} />
            <div className="rounded-full border border-emerald-200/20 bg-black/25 px-4 py-2 text-xs font-extrabold text-emerald-100 backdrop-blur">
              {authLabel}
            </div>
            <div className="rounded-full border border-yellow-300/30 bg-yellow-300/10 px-4 py-2 text-sm font-extrabold text-yellow-200">
              AI 타로
            </div>
          </div>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-5 pb-6 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6 lg:pt-10">
          <section
            className={[
              "relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.08] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-6",
              selectedTheme === "witch"
                ? "shadow-[0_30px_100px_rgba(0,0,0,0.42),0_0_42px_rgba(16,185,129,0.16)]"
                : "shadow-[0_30px_100px_rgba(0,0,0,0.42),0_0_42px_rgba(217,70,239,0.18)]"
            ].join(" ")}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_86%_16%,rgba(255,255,255,0.08),transparent_24%)]" />
            <div
              className={[
                "relative mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold backdrop-blur",
                selectedTheme === "witch"
                  ? "border-emerald-200/30 bg-emerald-300/12 text-emerald-100"
                  : "border-pink-200/35 bg-fuchsia-300/14 text-pink-50"
              ].join(" ")}
            >
              <Moon size={16} />
              AI 타로 세계 선택
            </div>
            <h1 className="relative max-w-3xl text-3xl font-black leading-tight text-white drop-shadow-[0_4px_22px_rgba(0,0,0,0.55)] sm:text-4xl">
              어떤 마법의 세계로 들어가시겠습니까?
            </h1>
            <p className="relative mt-5 max-w-2xl text-sm font-medium leading-7 text-white/82 sm:text-base sm:leading-8">
              밤의 마녀 세계와 낮의 요정 세계 중 하나를 선택하세요.
              선택한 세계의 마법이 당신의 운명을 읽어드립니다.
            </p>
            <div className="relative mt-7">
              <p className="text-sm font-black text-white/90">마법의 세계 선택</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {tarotThemeOptions.map((option) => {
                  const isSelectedTheme = selectedTheme === option.theme;
                  const isWitchOption = option.theme === "witch";

                  return (
                    <button
                      key={option.theme}
                      type="button"
                      onClick={() => {
                        setSelectedTheme(option.theme);
                        if (!isReadingStarted || !isDeckModalOpen) {
                          setReadingTheme(option.theme);
                        }
                      }}
                      className={[
                        "group relative overflow-hidden rounded-3xl border p-3 text-left transition duration-300 hover:-translate-y-1 hover:scale-[1.025] sm:p-4",
                        isWitchOption
                          ? "border-emerald-200/24 bg-[linear-gradient(145deg,rgba(2,44,34,0.78),rgba(6,78,59,0.46),rgba(0,0,0,0.4))] text-emerald-50 hover:border-emerald-200/70 hover:shadow-[0_0_38px_rgba(16,185,129,0.28)]"
                          : "border-pink-200/28 bg-[linear-gradient(145deg,rgba(131,24,67,0.74),rgba(192,38,211,0.46),rgba(255,255,255,0.16))] text-pink-50 hover:border-pink-100/80 hover:shadow-[0_0_38px_rgba(236,72,153,0.32)]",
                        isSelectedTheme
                          ? isWitchOption
                            ? "scale-[1.04] border-emerald-100 shadow-[0_0_70px_rgba(16,185,129,0.62),0_0_28px_rgba(251,191,36,0.22),0_24px_60px_rgba(0,0,0,0.34)] ring-2 ring-emerald-200/80"
                            : "scale-[1.04] border-pink-50 shadow-[0_0_76px_rgba(236,72,153,0.68),0_0_38px_rgba(168,85,247,0.38),0_24px_60px_rgba(0,0,0,0.34)] ring-2 ring-fuchsia-200/80"
                          : ""
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100",
                          isWitchOption
                            ? "bg-[radial-gradient(circle_at_50%_10%,rgba(52,211,153,0.22),transparent_40%)]"
                            : "bg-[radial-gradient(circle_at_50%_10%,rgba(244,114,182,0.28),transparent_42%)]"
                        ].join(" ")}
                      />
                      <span className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1 py-1">
  <img
    src={option.mbtiImage}
    alt=""
    className={[
      "h-12 w-full min-w-0 object-contain object-left transition duration-300 sm:h-14",
      isSelectedTheme
        ? isWitchOption
          ? "drop-shadow-[0_0_16px_rgba(52,211,153,0.9)]"
          : "drop-shadow-[0_0_16px_rgba(244,114,182,0.9)]"
        : "drop-shadow-[0_0_6px_rgba(255,255,255,0.2)]"
    ].join(" ")}
  />

  <span
    className={[
      "shrink-0 -translate-x-2 whitespace-nowrap pr-3 text-[26px] font-black leading-none tracking-normal transition duration-300 group-hover:scale-[1.02] sm:-translate-x-3 sm:text-[31px]",
      isWitchOption
        ? "text-emerald-50 [font-family:'Segoe_Script','Brush_Script_MT','Apple_Chancery',cursive] [text-shadow:0_0_12px_rgba(52,211,153,0.75),0_0_18px_rgba(251,191,36,0.38)]"
        : "text-pink-50 [font-family:'Segoe_Script','Brush_Script_MT','Apple_Chancery',cursive] [text-shadow:0_0_14px_rgba(244,114,182,0.9),0_0_18px_rgba(255,255,255,0.35)]"
    ].join(" ")}
  >
    {option.brandName}
  </span>
</span>
                      <span className="relative mt-2 block h-52 w-full overflow-hidden rounded-2xl border border-white/24 bg-black/20 shadow-[0_18px_44px_rgba(0,0,0,0.32)] sm:h-60">
                        <img
                          src={option.previewCard}
                          alt=""
                          className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
                        />
                      </span>
                      <span className="relative mt-4 block text-sm font-semibold leading-6 text-white/84">
                        {option.description}
                      </span>
                      <span className="relative mt-3 flex flex-wrap gap-1.5">
                        {option.features.map((feature) => (
                          <span
                            key={feature}
                            className={[
                              "rounded-full border px-2.5 py-1.5 text-xs font-black",
                              isWitchOption
                                ? "border-emerald-100/20 bg-emerald-300/10 text-emerald-50"
                                : "border-pink-100/22 bg-pink-200/12 text-pink-50"
                            ].join(" ")}
                          >
                            {feature}
                          </span>
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => openCategorySelection()}
                className={[
                  "pointer-events-auto inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-black shadow-[0_0_32px_rgba(52,211,153,0.35)] transition hover:-translate-y-0.5",
                  isFairyTheme
                    ? "bg-[linear-gradient(135deg,#db2777,#c026d3,#7c3aed)] text-white shadow-[0_0_30px_rgba(219,39,119,0.42)] hover:bg-[linear-gradient(135deg,#ec4899,#d946ef,#8b5cf6)]"
                    : "bg-emerald-300 text-[#042015] hover:bg-emerald-200"
                ].join(" ")}
              >
                타로 시작하기
              </button>
              <button
                type="button"
                onClick={() => openCategorySelection("오늘의 운세")}
                className={[
                  "inline-flex h-12 items-center justify-center rounded-full border px-6 text-sm font-black transition hover:-translate-y-0.5",
                  isFairyTheme
                    ? "border-pink-200/70 bg-white/82 text-[#831843] shadow-[0_0_20px_rgba(236,72,153,0.16)] hover:bg-pink-100/90 hover:text-[#4c0519]"
                    : "border-yellow-300/45 bg-yellow-300/10 text-yellow-100 hover:bg-yellow-300/20"
                ].join(" ")}
              >
                오늘의 운세
              </button>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
              <div
                className={[
                  "rounded-2xl border p-4 backdrop-blur",
                  isFairyTheme
                    ? "border-fuchsia-300/65 bg-fuchsia-950/18 shadow-[inset_0_0_0_1px_rgba(244,114,182,0.16),0_18px_44px_rgba(112,26,117,0.2)]"
                    : "border-emerald-200/15 bg-emerald-950/35"
                ].join(" ")}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <h2 className={["text-lg font-black", isFairyTheme ? "text-[#4c0519]" : "text-white"].join(" ")}>운세 카테고리</h2>
                  <p className={["text-xs font-bold", isFairyTheme ? "text-[#6b0636]/75" : "text-emerald-100/65"].join(" ")}>다른 카테고리로 새로 시작</p>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    const isSelectedCategory = selectedCategory === category.title;
                    return (
                      <button
                        key={category.title}
                        type="button"
                        onClick={() => openCategorySelection(category.title)}
                        className={[
                          "flex min-h-14 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-extrabold transition hover:-translate-y-0.5",
                          isFairyTheme
                            ? isSelectedCategory
                              ? "border-white/80 bg-[linear-gradient(135deg,#db2777,#c026d3,#7c3aed)] text-white shadow-[0_0_24px_rgba(236,72,153,0.34),0_0_14px_rgba(168,85,247,0.24)]"
                              : "border-fuchsia-300/45 bg-white/38 text-[#831843] hover:border-pink-200/75 hover:bg-pink-200/45"
                            : isSelectedCategory
                              ? "border-yellow-300/70 bg-emerald-300/12 text-emerald-50 shadow-[0_0_22px_rgba(52,211,153,0.2),0_0_14px_rgba(250,204,21,0.14)]"
                              : "border-emerald-200/15 bg-black/25 text-emerald-50 hover:border-yellow-300/45 hover:bg-emerald-300/10"
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                            isFairyTheme
                              ? isSelectedCategory
                                ? "bg-white/22 text-white"
                                : "bg-fuchsia-300/24 text-[#9d174d]"
                              : isSelectedCategory ? "bg-yellow-300/18 text-yellow-100" : "bg-emerald-300/15 text-emerald-200"
                          ].join(" ")}
                        >
                          <Icon size={16} />
                        </span>
                        <span className="break-keep">{category.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <aside
                className={[
                  "rounded-2xl border p-4 backdrop-blur",
                  isFairyTheme
                    ? "border-pink-300/55 bg-[linear-gradient(145deg,rgba(131,24,67,0.22),rgba(126,34,206,0.18))] shadow-[0_18px_46px_rgba(76,5,75,0.22)]"
                    : "border-yellow-300/20 bg-yellow-300/10"
                ].join(" ")}
              >
                <h2 className={["text-lg font-black", isFairyTheme ? "text-[#4c0519]" : "text-yellow-100"].join(" ")}>안내</h2>
                <div className={["mt-3 space-y-2 text-sm font-bold leading-6", isFairyTheme ? "text-[#4c0519]" : "text-emerald-50/82"].join(" ")}>
                  <p className={["rounded-xl border p-3", isFairyTheme ? "border-fuchsia-300/50 bg-white/38" : "border-emerald-200/15 bg-black/20"].join(" ")}>
                    원하는 운세를 선택하면 새 카테고리로 카드 뽑기가 시작됩니다.
                  </p>
                  <p className={["rounded-xl border p-3", isFairyTheme ? "border-fuchsia-300/50 bg-white/38" : "border-emerald-200/15 bg-black/20"].join(" ")}>
                    카드 3장을 고르면 AI 해석이 생성되고 결과가 자동 저장됩니다.
                  </p>
                </div>
              </aside>
            </div>
          </section>

          <section className="relative mx-auto w-full max-w-xl overflow-hidden">
            <div className="absolute -left-5 top-2 text-4xl">🌙</div>
            <div className="absolute -right-2 top-16 text-3xl">✨</div>
            <div className="absolute bottom-2 left-7 text-3xl">⭐</div>
            <div
              className={[
                "overflow-x-hidden rounded-3xl border border-white/15 bg-white/[0.08] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:p-5",
                selectedTheme === "witch"
                  ? "shadow-[0_24px_70px_rgba(0,0,0,0.38),0_0_28px_rgba(16,185,129,0.12)]"
                  : "shadow-[0_24px_70px_rgba(0,0,0,0.38),0_0_28px_rgba(236,72,153,0.16)]"
              ].join(" ")}
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className={["text-sm font-bold", isFairyTheme ? "text-pink-100" : "text-emerald-200"].join(" ")}>
                    {selectedCards.length > 0 ? "방금 선택한 과거 · 현재 · 미래 카드" : "카드를 뽑으면 이곳에 기록됩니다."}
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">오늘의 카드 기록</h2>
                </div>
                <div
                  className={[
                    "flex h-12 w-12 overflow-hidden rounded-2xl border shadow-[0_0_24px_rgba(16,185,129,0.24)]",
                    recordPanelTheme === "witch" ? "border-emerald-200/30 bg-emerald-300/15" : "border-pink-200/35 bg-pink-300/16"
                  ].join(" ")}
                >
                  <FallbackImage
                    sources={recordMascotImages}
                    alt="AI 타로 마스코트"
                    className="h-full w-full object-cover"
                    fallback={<div className="flex h-full w-full items-center justify-center text-3xl">{recordPanelTheme === "fairy" ? "🧚" : "🧙‍♀️"}</div>}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 overflow-x-hidden sm:gap-2">
                {cardPositions.map((position, index) => {
                  const selectedCard = selectedCards[index];
                  return (
                  <article
                    key={position}
                    className={[
                      "group flex aspect-[0.68] min-h-32 min-w-0 flex-col items-center justify-between overflow-hidden rounded-2xl border p-1.5 transition hover:-translate-y-1 sm:min-h-40 sm:p-2",
                      selectedTheme === "fairy"
                        ? "border-pink-200/70 bg-[linear-gradient(155deg,rgba(131,24,67,0.9),rgba(126,34,206,0.82))] shadow-[inset_0_0_0_1px_rgba(244,114,182,0.3),0_12px_28px_rgba(76,5,75,0.36)] hover:border-white hover:shadow-[0_0_30px_rgba(236,72,153,0.32)]"
                        : "border-yellow-300/50 bg-[linear-gradient(155deg,rgba(5,46,22,0.95),rgba(2,8,5,0.95))] shadow-[inset_0_0_0_1px_rgba(16,185,129,0.35),0_12px_26px_rgba(0,0,0,0.32)] hover:border-emerald-200 hover:shadow-[0_0_28px_rgba(52,211,153,0.24)]"
                    ].join(" ")}
                  >
                    <span className="relative z-10 text-xs font-black text-yellow-200">{position}</span>
                    {selectedCard ? (
                      <div className="tarot-card-flip relative my-2 h-full w-full overflow-hidden rounded-xl border border-yellow-200/35 bg-black/40">
                        <img src={selectedCard.image} alt={selectedCard.koreanName} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="relative my-2 h-full w-full overflow-hidden rounded-xl border border-emerald-200/20 bg-black/40">
                        <img src={cardBackImage} alt="" className="h-full w-full object-cover opacity-90" />
                        <span className="absolute inset-0 flex items-center justify-center text-4xl text-emerald-100/80 transition group-hover:scale-110">
                          {cards[index].symbol}
                        </span>
                      </div>
                    )}
                  </article>
                  );
                })}
              </div>
              <div className={["mt-4 border-t pt-4", isFairyTheme ? "border-pink-200/22" : "border-emerald-200/10"].join(" ")}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-black text-white">저장된 타로 기록</h3>
                  <button
                    type="button"
                    onClick={loadSavedReadings}
                    disabled={isLoadingSavedReadings}
                    className={[
                      "rounded-full border px-3 py-1.5 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-45",
                      isFairyTheme
                        ? "border-pink-200/55 bg-white/16 text-pink-50 hover:border-pink-100 hover:bg-pink-200/20"
                        : "border-emerald-200/20 bg-black/25 text-emerald-100 hover:border-yellow-300/45 hover:bg-yellow-300/10"
                    ].join(" ")}
                  >
                    새로고침
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {savedReadingFilters.map((filter) => {
                    const isActiveFilter = savedReadingFilter === filter;
                    return (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setSavedReadingFilter(filter)}
                        className={[
                          "rounded-full border px-2.5 py-1 text-xs font-black transition hover:-translate-y-0.5",
                          isFairyTheme
                            ? isActiveFilter
                              ? "border-white/70 bg-[linear-gradient(135deg,#db2777,#c026d3)] text-white shadow-[0_0_18px_rgba(236,72,153,0.28)]"
                              : "border-pink-200/28 bg-white/10 text-pink-50/88 hover:border-pink-200/70 hover:bg-pink-200/16"
                            : isActiveFilter
                              ? "border-yellow-300/70 bg-yellow-300/15 text-yellow-100 shadow-[0_0_18px_rgba(250,204,21,0.18)]"
                              : "border-emerald-200/15 bg-black/20 text-emerald-100/78 hover:border-emerald-200/35"
                        ].join(" ")}
                      >
                        {filter}
                      </button>
                    );
                  })}
                </div>
                <div className={["tarot-themed-scrollbar mt-3 max-h-[132px] space-y-2 overflow-y-auto overflow-x-hidden pr-1 sm:max-h-[140px]", isFairyTheme ? "tarot-fairy-scrollbar" : ""].join(" ")}>
                  {isLoadingSavedReadings ? (
                    <p
                      className={[
                        "rounded-2xl border p-3 text-sm font-bold",
                        isFairyTheme ? "border-pink-200/40 bg-white/14 text-pink-50" : "border-emerald-200/15 bg-black/20 text-emerald-100/78"
                      ].join(" ")}
                    >
                      저장된 기록을 불러오는 중...
                    </p>
                  ) : savedReadingsError ? (
                    <p
                      className={[
                        "rounded-2xl border p-3 text-sm font-bold",
                        isFairyTheme ? "border-pink-200/55 bg-fuchsia-950/20 text-pink-50" : "border-yellow-300/20 bg-yellow-300/10 text-yellow-100"
                      ].join(" ")}
                    >
                      저장된 타로 기록을 불러오지 못했습니다.
                    </p>
                  ) : savedReadings.length === 0 ? (
                    <p
                      className={[
                        "rounded-2xl border p-3 text-sm font-bold",
                        isFairyTheme ? "border-pink-200/40 bg-white/14 text-pink-50" : "border-emerald-200/15 bg-black/20 text-emerald-100/78"
                      ].join(" ")}
                    >
                      아직 저장된 타로 기록이 없습니다.
                    </p>
                  ) : filteredSavedReadings.length === 0 ? (
                    <p
                      className={[
                        "rounded-2xl border p-3 text-sm font-bold",
                        isFairyTheme ? "border-pink-200/40 bg-white/14 text-pink-50" : "border-emerald-200/15 bg-black/20 text-emerald-100/78"
                      ].join(" ")}
                    >
                      해당 카테고리의 저장된 기록이 없습니다.
                    </p>
                  ) : (
                    filteredSavedReadings.map((reading) => (
                      <article
                        key={reading.reading_id}
                        className={[
                          "min-w-0 rounded-2xl border p-2.5",
                          isFairyTheme
                            ? "border-fuchsia-300/40 bg-white/16 shadow-[0_12px_30px_rgba(76,5,75,0.22)]"
                            : "border-emerald-200/15 bg-black/24"
                        ].join(" ")}
                      >
                        <div className="flex min-w-0 items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={["text-xs font-bold", isFairyTheme ? "text-pink-100/72" : "text-emerald-100/65"].join(" ")}>{formatSavedReadingDate(reading.created_at)}</p>
                            <h4 className={["mt-1 truncate text-sm font-black", isFairyTheme ? "text-pink-50" : "text-yellow-100"].join(" ")}>{reading.category}</h4>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openSavedReading(reading)}
                              className={[
                                "inline-flex h-8 items-center justify-center rounded-full px-3 text-xs font-black transition hover:-translate-y-0.5",
                                isFairyTheme ? "bg-[linear-gradient(135deg,#ec4899,#c026d3)] text-white hover:bg-[linear-gradient(135deg,#f472b6,#d946ef)]" : "bg-emerald-300 text-[#042015] hover:bg-emerald-200"
                              ].join(" ")}
                            >
                              다시 보기
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteSavedReading(reading.reading_id)}
                              disabled={deletingReadingId === reading.reading_id}
                              className={[
                                "inline-flex h-8 items-center justify-center rounded-full border px-3 text-xs font-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45",
                                isFairyTheme
                                  ? "border-pink-200/55 bg-white/12 text-pink-50 hover:border-pink-100 hover:bg-pink-200/18"
                                  : "border-yellow-300/35 bg-yellow-300/10 text-yellow-100 hover:border-yellow-200 hover:bg-yellow-300/20"
                              ].join(" ")}
                            >
                              {deletingReadingId === reading.reading_id ? "삭제 중..." : "삭제"}
                            </button>
                          </div>
                        </div>
                        {reading.question && (
                          <p className={["mt-2 truncate text-xs font-bold leading-5", isFairyTheme ? "text-pink-50/82" : "text-emerald-100/78"].join(" ")}>질문: {reading.question}</p>
                        )}
                        <p className={["mt-1 truncate text-xs font-bold leading-5", isFairyTheme ? "text-pink-50/78" : "text-emerald-50/80"].join(" ")}>
                          {reading.cards.map((card) => `${card.position} ${card.name}`).join(" · ")}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        {isReadingComplete && (
          <section
            className={[
              "relative z-10 mx-auto mb-10 max-w-7xl rounded-3xl border p-5 backdrop-blur md:p-7",
              isReadingFairyTheme
                ? "border-pink-300/55 bg-[linear-gradient(145deg,rgba(253,242,248,0.9),rgba(251,207,232,0.78),rgba(221,214,254,0.72))] shadow-[0_26px_84px_rgba(76,5,75,0.26)]"
                : "border-yellow-300/20 bg-yellow-300/10"
            ].join(" ")}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className={["text-sm font-bold", isReadingFairyTheme ? "text-[#be185d]" : "text-yellow-100"].join(" ")}>로컬 데이터 기반 해석</p>
                <h2 className={["mt-2 text-2xl font-black", isReadingFairyTheme ? "text-[#4c0519]" : "text-white"].join(" ")}>과거 · 현재 · 미래 메시지</h2>
              </div>
              <button
                type="button"
                onClick={startReading}
                className={[
                  "inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-black transition hover:-translate-y-0.5",
                  isReadingFairyTheme ? "bg-[linear-gradient(135deg,#db2777,#c026d3)] text-white shadow-[0_0_24px_rgba(236,72,153,0.26)] hover:bg-[linear-gradient(135deg,#ec4899,#d946ef)]" : "bg-emerald-300 text-[#042015] hover:bg-emerald-200"
                ].join(" ")}
              >
                다시 뽑기
              </button>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {selectedCards.map((card, index) => (
                <article
                  key={card.id}
                  className={[
                    "rounded-2xl border p-4",
                    isReadingFairyTheme ? "border-pink-300/45 bg-white/58 shadow-[0_14px_34px_rgba(76,5,75,0.14)]" : "border-emerald-200/15 bg-black/25"
                  ].join(" ")}
                >
                  <div className="flex gap-4">
                    <div
                      className={[
                        "aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-xl border p-1",
                        isReadingFairyTheme
                          ? "border-pink-300/45 bg-white/58"
                          : "border-yellow-300/35 bg-black/40"
                      ].join(" ")}
                    >
                      <img src={card.image} alt={card.koreanName} className="h-full w-full object-contain object-center" />
                    </div>
                    <div>
                      <p className={["text-xs font-black", isReadingFairyTheme ? "text-[#be185d]" : "text-yellow-200"].join(" ")}>{cardPositions[index]}</p>
                      <h3 className={["mt-1 text-lg font-black", isReadingFairyTheme ? "text-[#4c0519]" : "text-white"].join(" ")}>
                        {card.koreanName}
                      <span className={["block text-sm font-bold", isReadingFairyTheme ? "text-[#831843]" : "text-emerald-200"].join(" ")}>{card.name}</span>
                      </h3>
                      <p className={["mt-3 text-xs leading-relaxed", isReadingFairyTheme ? "font-medium text-[#5b123d]" : "font-bold text-emerald-100/80"].join(" ")}>{card.keywords.join(" · ")}</p>
                    </div>
                  </div>
                  <p className={["mt-4 text-sm leading-relaxed", isReadingFairyTheme ? "font-medium text-[#3b082f]" : "text-emerald-50/82"].join(" ")}>{card.uprightMeaning}</p>
                </article>
              ))}
            </div>

            {localTarotReading && (
              <div className="mt-6">
                <LocalTarotReadingSection
                  reading={localTarotReading}
                  category={readingCategory}
                  isFairyTheme={isReadingFairyTheme}
                />
              </div>
            )}
          </section>
        )}

      </section>

      {isCategoryModalOpen && (
        <div
            className={[
              "fixed inset-0 z-50 flex items-center justify-center overflow-hidden px-3 py-5 backdrop-blur-xl sm:px-6",
            isFairyTheme ? "bg-[radial-gradient(circle_at_18%_12%,rgba(244,114,182,0.46),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(192,132,252,0.38),transparent_28%),rgba(76,5,75,0.72)]" : "bg-black/86"
          ].join(" ")}
        >
          <section
            className={[
              "relative max-h-[90vh] w-[calc(100vw-24px)] max-w-3xl overflow-y-auto rounded-2xl border p-4 shadow-[0_30px_100px_rgba(0,0,0,0.82)] sm:w-[calc(100vw-48px)] sm:p-5 md:p-6",
              isFairyTheme
                ? "border-pink-300/85 bg-[radial-gradient(circle_at_16%_8%,rgba(255,247,237,0.9),transparent_24%),radial-gradient(circle_at_88%_12%,rgba(216,180,254,0.56),transparent_30%),linear-gradient(145deg,rgba(253,242,248,0.96),rgba(251,207,232,0.86),rgba(244,114,182,0.72),rgba(168,85,247,0.48))] shadow-[0_30px_100px_rgba(76,5,75,0.52),0_0_48px_rgba(236,72,153,0.34),inset_0_0_0_1px_rgba(255,255,255,0.48)]"
                : "border-emerald-200/25 bg-[#03150e] shadow-[0_30px_100px_rgba(0,0,0,0.82),0_0_42px_rgba(52,211,153,0.16)]"
            ].join(" ")}
          >
            <div
              className={[
                "pointer-events-none absolute inset-0",
                isFairyTheme
                  ? "bg-[radial-gradient(circle_at_20%_12%,rgba(251,191,36,0.34),transparent_26%),radial-gradient(circle_at_84%_18%,rgba(217,70,239,0.26),transparent_26%),radial-gradient(circle_at_52%_4%,rgba(255,255,255,0.36),transparent_18%),radial-gradient(circle_at_72%_72%,rgba(244,114,182,0.22),transparent_28%)]"
                  : "bg-[radial-gradient(circle_at_20%_12%,rgba(52,211,153,0.14),transparent_30%),radial-gradient(circle_at_84%_18%,rgba(250,204,21,0.12),transparent_26%)]"
              ].join(" ")}
            />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <p className={["text-sm font-black", isFairyTheme ? "text-[#6d1645]" : "text-yellow-100"].join(" ")}>카테고리 먼저 선택</p>
                <h2 className={["mt-2 text-xl font-black sm:text-2xl", isFairyTheme ? "text-[#4a0f2f] drop-shadow-[0_1px_0_rgba(255,255,255,0.45)]" : "text-white"].join(" ")}>어떤 흐름을 읽어볼까요?</h2>
                <p className={["mt-2 text-sm font-bold leading-6", isFairyTheme ? "text-[#5b1238]" : "text-emerald-100/78"].join(" ")}>
                  선택한 카테고리를 기준으로 카드 3장을 뽑고 AI 해석을 생성합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className={[
                  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition",
                  isFairyTheme
                    ? "border-pink-300/80 bg-white/58 text-[#6d1645] shadow-[0_8px_20px_rgba(190,24,93,0.16)] hover:border-[#f0ab62] hover:bg-pink-100/80"
                    : "border-emerald-200/25 bg-black/70 text-emerald-50 hover:border-yellow-300/60 hover:bg-yellow-300/15"
                ].join(" ")}
                aria-label="카테고리 선택 닫기"
              >
                <X size={20} />
              </button>
            </div>

            {hasSelectedCategoryIntro && (
              <div
                className={[
                  "relative z-10 mt-5 rounded-2xl border p-4",
                  isFairyTheme
                    ? "border-pink-300/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.62),rgba(251,207,232,0.34),rgba(221,214,254,0.28))] shadow-[0_18px_48px_rgba(190,24,93,0.2),0_0_28px_rgba(251,191,36,0.18),inset_0_0_0_1px_rgba(255,255,255,0.5)]"
                    : "border-emerald-200/18 bg-black/72 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.08)]"
                ].join(" ")}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className={["text-xs font-black", isFairyTheme ? "text-[#6d1645]" : "text-yellow-100"].join(" ")}>개인화 정보</p>
                    <h3 className={["mt-1 text-lg font-black", isFairyTheme ? "text-[#4a0f2f]" : "text-emerald-50"].join(" ")}>{selectedCategory} 준비</h3>
                    <p className={["mt-1 text-xs font-bold", isFairyTheme ? "text-[#6f3f2b]" : "text-emerald-100/70"].join(" ")}>
                      선택사항입니다. 입력하면 생년월일 흐름을 참고한 해석으로 반영됩니다.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <span className={["inline-flex min-h-9 items-center rounded-full border px-3 py-1 text-[11px] font-black", isFairyTheme ? "border-pink-300/80 bg-white/64 text-[#6d1645] shadow-[0_6px_16px_rgba(190,24,93,0.12)]" : "border-yellow-300/25 bg-yellow-300/10 text-yellow-100"].join(" ")}>
                      선택 입력
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory("");
                        setQuestion("");
                        setIsCategoryIntroActive(false);
                      }}
                      className={[
                        "inline-flex min-h-9 items-center justify-center rounded-full border px-3 py-1 text-[11px] font-black transition hover:-translate-y-0.5",
                        isFairyTheme
                          ? "border-[#f0ab62]/80 bg-white/72 text-[#6d1645] shadow-[0_8px_20px_rgba(190,24,93,0.16)] hover:border-pink-300 hover:bg-[linear-gradient(135deg,#fff7ed,#fce7f3)] hover:text-[#4a0f2f]"
                          : "border-emerald-200/25 bg-black/45 text-emerald-50 hover:border-yellow-300/50 hover:bg-yellow-300/10"
                      ].join(" ")}
                    >
                      다른 카테고리 선택
                    </button>
                  </div>
                </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(220px,auto)] sm:items-end">
                <BirthDateInput
                  value={birthDate}
                  onChange={setBirthDate}
                  label={isLoveCategory ? "본인 생년월일" : "생년월일"}
                  isFairyTheme={isFairyTheme}
                />
                <CalendarTypeToggle value={calendarType} onChange={setCalendarType} isFairyTheme={isFairyTheme} />
              </div>
              {isLoveCategory && (
                <div className="mt-6 grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(220px,auto)] sm:items-end">
                  <BirthDateInput
                    value={partnerBirthDate}
                    onChange={setPartnerBirthDate}
                    label="상대방 생년월일"
                    isFairyTheme={isFairyTheme}
                  />
                  <CalendarTypeToggle
                    value={partnerCalendarType}
                    onChange={setPartnerCalendarType}
                    isFairyTheme={isFairyTheme}
                  />
                </div>
              )}
                {!isFreeQuestionCategory && (
                  <div className="mt-5 flex flex-col items-end gap-2">
                    <p className={["text-xs font-black", isFairyTheme ? "text-[#6d1645]" : "text-emerald-100/75"].join(" ")}>
                      💎 {getTarotCreditPolicyText(selectedCategory)}
                    </p>
                    <button
                      type="button"
                      onClick={() => requestReadingStart(selectedCategory, "", birthDate, calendarType)}
                      className={[
                        "inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 text-base font-black transition hover:-translate-y-0.5",
                        isFairyTheme ? "bg-[linear-gradient(135deg,#ec4899,#d946ef,#7c3aed)] text-white shadow-[0_14px_34px_rgba(190,24,93,0.32),0_0_28px_rgba(168,85,247,0.26)] hover:bg-[linear-gradient(135deg,#f472b6,#e879f9,#8b5cf6)] hover:shadow-[0_16px_38px_rgba(190,24,93,0.38),0_0_34px_rgba(168,85,247,0.32)]" : "bg-emerald-300 text-[#042015] hover:bg-emerald-200"
                      ].join(" ")}
                    >
                      카드 뽑기 시작
                    </button>
                  </div>
                )}
              </div>
            )}

            {!hasSelectedCategoryIntro && (
              <div className="relative z-10 mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => {
                  const Icon = category.icon;
                  const isSelectedCategory = selectedCategory === category.title;
                  const isFeaturedCategory = category.title === "오늘의 운세";

                  return (
                    <button
                      key={category.title}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category.title);
                        setIsCategoryIntroActive(true);
                        if (category.title !== freeQuestionCategoryTitle) {
                          setQuestion("");
                        }
                      }}
                      className={[
                        "relative flex min-h-20 items-center gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-1 sm:min-h-24 sm:p-4",
                        isFairyTheme
                          ? isSelectedCategory || isFeaturedCategory
                            ? "border-pink-100/90 bg-[linear-gradient(135deg,#db2777,#d946ef,#7c3aed)] text-white shadow-[0_0_30px_rgba(236,72,153,0.34),0_14px_32px_rgba(126,34,206,0.2)]"
                            : "border-pink-300/60 bg-white/46 shadow-[0_10px_24px_rgba(190,24,93,0.12)] hover:border-[#f0ab62]/80 hover:bg-pink-100/58"
                          : isSelectedCategory || isFeaturedCategory
                            ? "border-yellow-300/70 bg-emerald-950/85 shadow-[0_0_26px_rgba(52,211,153,0.22),0_0_18px_rgba(250,204,21,0.16)]"
                            : "border-emerald-200/18 bg-black/70 hover:border-yellow-300/45 hover:bg-emerald-950/80"
                      ].join(" ")}
                    >
                      {isFeaturedCategory && (
                        <span className={["absolute right-3 top-3 rounded-full px-2 py-1 text-[10px] font-black", isFairyTheme ? "bg-white/35 text-white shadow-[0_0_14px_rgba(255,255,255,0.28)]" : "bg-yellow-300/18 text-yellow-100"].join(" ")}>
                          추천
                        </span>
                      )}
                      <span className={["flex h-11 w-11 shrink-0 items-center justify-center rounded-full", isFairyTheme ? "bg-[linear-gradient(135deg,rgba(251,207,232,0.82),rgba(216,180,254,0.72))] text-[#6d1645] shadow-[0_8px_18px_rgba(190,24,93,0.14)]" : "bg-yellow-300/15 text-yellow-100"].join(" ")}>
                        <Icon size={20} />
                      </span>
                      <span>
                        <span className={["block font-black", isFairyTheme ? "text-[#4a0f2f]" : "text-white"].join(" ")}>{category.title}</span>
                        <span className={["mt-1 block text-xs font-bold leading-5", isFairyTheme ? "text-[#6f3f2b]" : "text-emerald-100/70"].join(" ")}>
                          {category.title === freeQuestionCategoryTitle
                            ? "질문을 적고 카드 흐름을 확인해요."
                            : category.title === loveCategoryTitle
                              ? "두 사람의 생년월일을 선택하고 시작해요."
                              : "생년월일을 확인하고 카드 흐름을 시작해요."}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {isFreeQuestionCategory && (
              <div className={["relative z-10 mt-6 rounded-2xl border p-4", isFairyTheme ? "border-pink-300/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.58),rgba(251,207,232,0.32),rgba(221,214,254,0.26))] shadow-[0_18px_42px_rgba(190,24,93,0.18),0_0_24px_rgba(251,191,36,0.16),inset_0_0_0_1px_rgba(255,255,255,0.42)]" : "border-yellow-300/25 bg-black/72 shadow-[inset_0_0_0_1px_rgba(250,204,21,0.08)]"].join(" ")}>
                <label htmlFor="tarot-category-question" className={["text-sm font-black", isFairyTheme ? "text-[#5b1238]" : "text-yellow-100"].join(" ")}>
                  자유 질문
                </label>
                <input
                  id="tarot-category-question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  maxLength={500}
                  placeholder="궁금한 내용을 짧게 적어주세요."
                  className={[
                    "mt-3 h-12 w-full rounded-2xl border px-4 text-sm font-bold outline-none transition",
                    isFairyTheme
                      ? "border-pink-300/75 bg-white/90 text-[#111827] shadow-[0_10px_24px_rgba(236,72,153,0.14)] placeholder:text-slate-400 focus:border-[#e879a7] focus:shadow-[0_0_30px_rgba(236,72,153,0.3)]"
                      : "border-yellow-300/35 bg-black/75 text-emerald-50 placeholder:text-emerald-100/45 focus:border-yellow-200/70 focus:shadow-[0_0_24px_rgba(250,204,21,0.16)]"
                  ].join(" ")}
                />
                <div className="mt-4 flex flex-col items-end gap-2">
                  <p className={["text-xs font-black", isFairyTheme ? "text-[#6d1645]" : "text-emerald-100/75"].join(" ")}>
                    💎 {getTarotCreditPolicyText(freeQuestionCategoryTitle)}
                  </p>
                  <button
                    type="button"
                    onClick={() => requestReadingStart(freeQuestionCategoryTitle, question.trim() || freeQuestionCategoryTitle, birthDate, calendarType)}
                    className={[
                      "inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 text-base font-black transition hover:-translate-y-0.5",
                      isFairyTheme ? "bg-[linear-gradient(135deg,#ec4899,#d946ef,#7c3aed)] text-white shadow-[0_14px_34px_rgba(190,24,93,0.32),0_0_28px_rgba(168,85,247,0.26)] hover:bg-[linear-gradient(135deg,#f472b6,#e879f9,#8b5cf6)]" : "bg-emerald-300 text-[#042015] hover:bg-emerald-200"
                    ].join(" ")}
                  >
                    카드 뽑기 시작
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {pendingTarotStart && (
        <div
          className={[
            "fixed inset-0 z-[70] flex items-center justify-center px-4 py-6 backdrop-blur-md",
            isFairyTheme ? "bg-fuchsia-950/58" : "bg-black/68"
          ].join(" ")}
        >
          <section
            className={[
              "relative w-full max-w-md rounded-2xl border p-5 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]",
              isFairyTheme
                ? "border-pink-300/80 bg-[radial-gradient(circle_at_18%_10%,rgba(255,247,237,0.85),transparent_28%),linear-gradient(145deg,rgba(253,242,248,0.98),rgba(251,207,232,0.9),rgba(192,132,252,0.72))] text-[#4a0f2f] shadow-[0_24px_80px_rgba(76,5,75,0.42),0_0_36px_rgba(236,72,153,0.28)]"
                : "border-yellow-300/35 bg-[radial-gradient(circle_at_18%_10%,rgba(250,204,21,0.18),transparent_28%),linear-gradient(145deg,rgba(3,21,14,0.98),rgba(6,78,59,0.94),rgba(0,0,0,0.9))] text-emerald-50 shadow-[0_24px_80px_rgba(0,0,0,0.62),0_0_34px_rgba(52,211,153,0.18)]"
            ].join(" ")}
          >
            <p className={["text-sm font-black", isFairyTheme ? "text-[#6d1645]" : "text-yellow-100"].join(" ")}>
              생년월일 없이 진행할까요?
            </p>
            <h3 className={["mt-2 text-xl font-black", isFairyTheme ? "text-[#4a0f2f]" : "text-white"].join(" ")}>
              카드가 눈치껏 읽어볼 차례예요
            </h3>
            <p className={["mt-3 text-sm font-bold leading-6", isFairyTheme ? "text-[#6f3f2b]" : "text-emerald-100/78"].join(" ")}>
              생년월일이 없으면 카드가 살짝 눈치껏 해석해요. 그래도 괜찮다면 바로 시작할게요.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPendingTarotStart(null)}
                className={[
                  "inline-flex min-h-12 items-center justify-center rounded-full border px-4 py-3 text-sm font-black transition hover:-translate-y-0.5",
                  isFairyTheme
                    ? "border-pink-300/80 bg-white/72 text-[#6d1645] hover:bg-pink-100"
                    : "border-emerald-200/25 bg-black/35 text-emerald-50 hover:border-yellow-300/55 hover:bg-yellow-300/10"
                ].join(" ")}
              >
                입력하고 갈게요
              </button>
              <button
                type="button"
                onClick={confirmPendingTarotStart}
                className={[
                  "inline-flex min-h-12 items-center justify-center rounded-full px-4 py-3 text-sm font-black transition hover:-translate-y-0.5",
                  isFairyTheme
                    ? "bg-[linear-gradient(135deg,#ec4899,#d946ef,#7c3aed)] text-white shadow-[0_14px_34px_rgba(190,24,93,0.32)] hover:bg-[linear-gradient(135deg,#f472b6,#e879f9,#8b5cf6)]"
                    : "bg-yellow-300 text-[#042015] shadow-[0_14px_34px_rgba(250,204,21,0.18)] hover:bg-yellow-200"
                ].join(" ")}
              >
                그냥 카드에게 맡길래요
              </button>
            </div>
          </section>
        </div>
      )}

      {pendingCreditConfirm && (
        <div
          className={[
            "fixed inset-0 z-[75] flex items-center justify-center px-4 py-6 backdrop-blur-md",
            isFairyTheme ? "bg-fuchsia-950/58" : "bg-black/70"
          ].join(" ")}
        >
          <section
            className={[
              "relative w-full max-w-md rounded-2xl border p-5 text-left shadow-[0_24px_80px_rgba(0,0,0,0.48)]",
              isFairyTheme
                ? "border-pink-300/75 bg-[linear-gradient(145deg,rgba(253,242,248,0.98),rgba(251,207,232,0.92),rgba(192,132,252,0.74))] text-[#4a0f2f]"
                : "border-yellow-300/40 bg-[radial-gradient(circle_at_18%_10%,rgba(250,204,21,0.16),transparent_30%),linear-gradient(145deg,rgba(3,21,14,0.98),rgba(6,78,59,0.95),rgba(0,0,0,0.92))] text-emerald-50"
            ].join(" ")}
          >
            <p className={["text-xs font-black uppercase tracking-wide", isFairyTheme ? "text-[#6d1645]" : "text-yellow-100"].join(" ")}>
              Credit Confirmation
            </p>
            <h3 className={["mt-2 text-xl font-black", isFairyTheme ? "text-[#4a0f2f]" : "text-white"].join(" ")}>
              AI 타로 해석 시작
            </h3>

            <div className="mt-5 grid gap-3 text-sm font-bold">
              <div className={["rounded-2xl border px-4 py-3", isFairyTheme ? "border-pink-200/70 bg-white/58" : "border-emerald-200/18 bg-black/28"].join(" ")}>
                <span className={["block text-xs font-black uppercase tracking-wide", isFairyTheme ? "text-[#7a2b52]" : "text-emerald-100/70"].join(" ")}>
                  선택한 카테고리
                </span>
                <strong className={["mt-1 block text-lg font-black", isFairyTheme ? "text-[#4a0f2f]" : "text-yellow-100"].join(" ")}>
                  {pendingCreditConfirm.category}
                </strong>
              </div>

              <div className={["rounded-2xl border px-4 py-3", isFairyTheme ? "border-pink-200/75 bg-pink-50/72" : "border-yellow-300/45 bg-yellow-300/12"].join(" ")}>
                <span className={["block text-xs font-black uppercase tracking-wide", isFairyTheme ? "text-[#7a2b52]" : "text-yellow-100/75"].join(" ")}>
                  예상 차감 크레딧
                </span>
                <span className={["mt-2 inline-flex rounded-full border px-3 py-2 text-base font-black", isFairyTheme ? "border-pink-300/80 bg-white/76 text-[#9d174d]" : "border-yellow-300/55 bg-yellow-300/18 text-yellow-100"].join(" ")}>
                  {getTarotExpectedCreditLabel(pendingCreditConfirm.category)}
                </span>
              </div>

              <div className={["rounded-2xl border px-4 py-3", isFairyTheme ? "border-pink-200/70 bg-white/58" : "border-emerald-200/18 bg-black/28"].join(" ")}>
                <span className={["block text-xs font-black uppercase tracking-wide", isFairyTheme ? "text-[#7a2b52]" : "text-emerald-100/70"].join(" ")}>
                  현재 보유 크레딧
                </span>
                <strong className={["mt-1 block text-lg font-black", isFairyTheme ? "text-[#4a0f2f]" : "text-emerald-50"].join(" ")}>
                  {credits.toLocaleString("en-US")} Credits
                </strong>
              </div>
            </div>

            <div className={["mt-5 rounded-2xl border px-4 py-3 text-sm font-bold leading-6", isFairyTheme ? "border-pink-200/70 bg-white/54 text-[#6f3f2b]" : "border-yellow-300/30 bg-black/24 text-emerald-100/82"].join(" ")}>
              <p>{getTarotCreditPolicyText(pendingCreditConfirm.category)}</p>
              <p className={["mt-2 font-black", isFairyTheme ? "text-[#9d174d]" : "text-yellow-100"].join(" ")}>
                타로 해석이 성공적으로 완료된 경우에만 크레딧이 차감됩니다.
              </p>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={cancelCreditConfirm}
                className={[
                  "inline-flex min-h-12 items-center justify-center rounded-full border px-4 py-3 text-sm font-black transition hover:-translate-y-0.5",
                  isFairyTheme
                    ? "border-pink-300/80 bg-white/72 text-[#6d1645] hover:bg-pink-100"
                    : "border-emerald-200/25 bg-black/35 text-emerald-50 hover:border-yellow-300/55 hover:bg-yellow-300/10"
                ].join(" ")}
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmCreditStart}
                className={[
                  "inline-flex min-h-12 items-center justify-center rounded-full px-4 py-3 text-sm font-black transition hover:-translate-y-0.5",
                  isFairyTheme
                    ? "bg-[linear-gradient(135deg,#ec4899,#d946ef,#7c3aed)] text-white shadow-[0_14px_34px_rgba(190,24,93,0.32)] hover:bg-[linear-gradient(135deg,#f472b6,#e879f9,#8b5cf6)]"
                    : "bg-yellow-300 text-[#042015] shadow-[0_14px_34px_rgba(250,204,21,0.18)] hover:bg-yellow-200"
                ].join(" ")}
              >
                확인하고 해석 시작
              </button>
            </div>
          </section>
        </div>
      )}

      {isReadingStarted && isDeckModalOpen && (
        <div
          className={[
            "fixed inset-0 z-50 flex items-center justify-center overflow-hidden px-3 py-5 backdrop-blur-sm sm:px-6",
            isReadingFairyTheme ? "bg-fuchsia-950/72" : "bg-black/78"
          ].join(" ")}
        >
          <section
            className={[
              "relative flex h-[88vh] w-[calc(100vw-24px)] max-w-5xl flex-col overflow-hidden rounded-2xl border p-4 pt-5 shadow-[0_30px_100px_rgba(0,0,0,0.72)] sm:w-[calc(100vw-48px)] sm:p-5 md:p-6",
              isReadingFairyTheme
                ? "border-fuchsia-300/70 bg-[linear-gradient(145deg,rgba(76,5,75,0.96),rgba(157,23,77,0.92),rgba(88,28,135,0.9))] shadow-[0_30px_100px_rgba(76,5,75,0.72),0_0_42px_rgba(236,72,153,0.3)]"
                : "border-emerald-200/20 bg-[#03150e]/95"
            ].join(" ")}
          >
            <div
              className={[
                "pointer-events-none absolute inset-0",
                isReadingFairyTheme
                  ? "bg-[radial-gradient(circle_at_18%_8%,rgba(244,114,182,0.34),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(250,204,21,0.18),transparent_24%)]"
                  : "bg-[radial-gradient(circle_at_18%_8%,rgba(52,211,153,0.16),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(250,204,21,0.12),transparent_24%)]"
              ].join(" ")}
            />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <h2 className={["text-xl font-black sm:text-2xl", isReadingFairyTheme ? "text-white drop-shadow-[0_2px_10px_rgba(76,5,75,0.48)]" : "text-white"].join(" ")}>{deckCopy.title}</h2>
                <p className={["mt-2 text-sm font-bold sm:text-base", isReadingFairyTheme ? "text-pink-50/88" : "text-emerald-100/82"].join(" ")}>
                  {deckCopy.description}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <CreditBadge credits={credits} tone={isReadingFairyTheme ? "fairy" : "witch"} />
                  <span className={["rounded-full border px-3 py-2 text-xs font-black", isReadingFairyTheme ? "border-pink-200/45 bg-white/12 text-pink-50" : "border-emerald-200/20 bg-black/24 text-emerald-100"].join(" ")}>
                    {getTarotCreditPolicyText(readingCategory)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeckModalOpen(false)}
                  disabled={isTarotAnalyzing}
                  className={[
                    "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-35",
                    isReadingFairyTheme
                      ? "border-pink-200/55 bg-white/14 text-pink-50 hover:border-pink-100 hover:bg-pink-200/20"
                      : "border-emerald-200/25 bg-black/35 text-emerald-50 hover:border-yellow-300/60 hover:bg-yellow-300/15"
                  ].join(" ")}
                  aria-label="카드 덱 닫기"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="relative z-10 flex flex-1 flex-col overflow-hidden pt-4 sm:pt-6">
              {tarotCreditError && (
                <div className="mb-3 rounded-2xl border border-red-300/65 bg-red-500/14 px-4 py-3 text-sm font-black text-red-100 shadow-[0_0_22px_rgba(248,113,113,0.18)]">
                  {tarotCreditError}
                </div>
              )}
              <div className={["pointer-events-none absolute inset-x-6 bottom-10 h-28 rounded-full blur-3xl", isReadingFairyTheme ? "bg-pink-300/24" : "bg-emerald-300/12"].join(" ")} />
              <div className="relative mx-auto grid h-44 w-full max-w-4xl grid-cols-3 items-start gap-3 px-1 sm:h-52 sm:gap-7 sm:px-4 md:h-56 lg:gap-8">
                {cardPositions.map((position, index) => {
                  const selectedCard = selectedCards[index];

                  return (
                    <div key={position} className="flex min-w-0 flex-col items-center">
                      <p className={["mb-2 text-xs font-black sm:mb-3 sm:text-sm", isReadingFairyTheme ? "text-pink-100" : "text-yellow-100"].join(" ")}>{position}</p>
                      {selectedCard ? (
                        <div
                          key={selectedCard.id}
                          className={[
                            "tarot-selected-card-flip relative aspect-[0.68] w-16 overflow-hidden rounded-xl border shadow-[0_0_30px_rgba(52,211,153,0.55),0_0_18px_rgba(250,204,21,0.42)] ring-4 sm:w-24 md:w-28 lg:w-32",
                            isReadingFairyTheme ? "border-pink-200/90 bg-fuchsia-950/50 ring-pink-300/55" : "border-yellow-300/90 bg-emerald-950/70 ring-emerald-300/35"
                          ].join(" ")}
                        >
                          <img src={selectedCard.image} alt={selectedCard.koreanName} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div
                          className={[
                            "flex aspect-[0.68] w-16 items-center justify-center rounded-xl border border-dashed shadow-[inset_0_0_20px_rgba(52,211,153,0.08)] sm:w-24 md:w-28 lg:w-32",
                            isReadingFairyTheme ? "border-pink-200/55 bg-white/12" : "border-emerald-200/25 bg-black/24"
                          ].join(" ")}
                        >
                          <span className="h-2 w-2 rounded-full bg-yellow-300/70 shadow-[0_0_18px_rgba(250,204,21,0.55)]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div
                className={[
                  "relative mx-auto h-[250px] w-full max-w-6xl overflow-hidden px-4 py-10 sm:h-[310px] md:h-[350px] lg:h-[390px] lg:px-8 lg:py-14",
                  isDeckShuffling ? "tarot-deck-shuffle" : ""
                ].join(" ")}
              >
                {deck.map((card, index) => {
                  const selectedIndex = selectedCards.findIndex((selected) => selected.id === card.id);
                  const isSelected = selectedIndex >= 0;
                  const spread = deck.length > 1 ? index / (deck.length - 1) - 0.5 : 0;
                  const angle = spread * 24;
                  const edgeDrop = Math.abs(spread) * 38;
                  const offset = `calc(${spread.toFixed(4)} * min(68vw, 760px))`;
                  const shuffleX = ((index % 7) - 3) * 12;
                  const shuffleY = ((index % 5) - 2) * 9;
                  const shuffleRotate = ((index % 6) - 2.5) * 5;
                  const shuffleScale = 1 + (index % 3) * 0.025;

                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => handleCardSelect(card)}
                      disabled={isSelected || isReadingComplete || isTarotAnalyzing || isDeckShuffling}
                      className={[
                        "pointer-events-auto group absolute left-1/2 top-1/2 aspect-[0.68] w-16 origin-bottom overflow-hidden rounded-xl border shadow-[0_18px_42px_rgba(0,0,0,0.42)] transition duration-500 sm:w-24 md:w-32 lg:w-36",
                        isReadingFairyTheme ? "bg-fuchsia-950/62" : "bg-emerald-950/70",
                        isSelected
                          ? "border-yellow-300/55 opacity-0"
                          : isReadingFairyTheme
                            ? "border-pink-200/70 hover:border-white hover:brightness-110"
                            : "border-emerald-200/25 hover:border-yellow-300/65 hover:brightness-110",
                        isReadingComplete && !isSelected ? "opacity-38" : "",
                        isTarotAnalyzing || isDeckShuffling ? "cursor-wait" : ""
                      ].join(" ")}
                      style={{
                        transform: isDeckShuffling
                          ? `translate(calc(-50% + ${offset} + ${shuffleX}px), calc(-50% + ${edgeDrop + shuffleY}px)) rotate(${angle + shuffleRotate}deg) scale(${shuffleScale})`
                          : `translate(calc(-50% + ${offset}), calc(-50% + ${edgeDrop}px)) rotate(${angle}deg) scale(1)`,
                        zIndex: isSelected ? 100 + selectedIndex : index
                      }}
                      aria-label={isSelected ? `${cardPositions[selectedIndex]} 카드 ${card.koreanName}` : "타로 카드 선택"}
                    >
                      <img
                        src={readingCardBackImage}
                        alt=""
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    </button>
                  );
                })}
              </div>

              <div className="relative z-10 mt-3 flex justify-center sm:mt-4">
                <button
                  type="button"
                  onClick={shuffleDeck}
                  disabled={selectedCards.length > 0 || isTarotAnalyzing || isDeckShuffling}
                  className={[
                    "pointer-events-auto inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-black transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-35 sm:px-8 sm:py-3 sm:text-base",
                    isReadingFairyTheme
                      ? "border-pink-200/70 bg-pink-400/24 text-pink-50 shadow-[0_0_28px_rgba(236,72,153,0.32),0_0_18px_rgba(168,85,247,0.22)] hover:border-white hover:bg-pink-300/34 hover:shadow-[0_0_38px_rgba(236,72,153,0.42),0_0_28px_rgba(168,85,247,0.3)]"
                      : "border-yellow-300/60 bg-yellow-300/12 text-yellow-100 shadow-[0_0_26px_rgba(250,204,21,0.2),0_0_18px_rgba(52,211,153,0.12)] hover:border-yellow-200 hover:bg-yellow-300/22 hover:shadow-[0_0_34px_rgba(250,204,21,0.28),0_0_24px_rgba(52,211,153,0.18)]"
                  ].join(" ")}
                >
                  {isDeckShuffling ? "섞는 중..." : "카드 섞기"}
                </button>
              </div>

              {isTarotAnalyzing && (
                <div className={["absolute inset-0 z-[200] flex items-center justify-center overflow-hidden backdrop-blur-[3px]", isReadingFairyTheme ? "bg-fuchsia-950/70" : "bg-black/62"].join(" ")}>
                  <div className="tarot-particle-field" aria-hidden="true">
                    {Array.from({ length: 18 }).map((_, index) => (
                      <span key={index} style={{ "--particle-index": index } as CSSProperties} />
                    ))}
                  </div>
                  <div
                    className={[
                      "relative overflow-hidden rounded-3xl border px-7 py-7 text-center",
                      isReadingFairyTheme
                        ? "border-fuchsia-300/50 bg-fuchsia-950/88 shadow-[0_0_54px_rgba(236,72,153,0.38),0_0_34px_rgba(250,204,21,0.18)]"
                        : "border-emerald-200/30 bg-[#03150e]/92 shadow-[0_0_52px_rgba(52,211,153,0.32),0_0_34px_rgba(250,204,21,0.14)]"
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "pointer-events-none absolute inset-0",
                        isReadingFairyTheme
                          ? "bg-[radial-gradient(circle_at_50%_18%,rgba(236,72,153,0.28),transparent_34%),radial-gradient(circle_at_50%_84%,rgba(250,204,21,0.18),transparent_38%)]"
                          : "bg-[radial-gradient(circle_at_50%_18%,rgba(52,211,153,0.22),transparent_34%),radial-gradient(circle_at_50%_84%,rgba(250,204,21,0.15),transparent_38%)]"
                      ].join(" ")}
                    />
                    <div className={["relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border shadow-[0_0_28px_rgba(52,211,153,0.36)]", isReadingFairyTheme ? "border-pink-200/45 bg-pink-300/14" : "border-yellow-200/35 bg-emerald-300/10"].join(" ")}>
                      <div className="absolute inset-2 animate-spin rounded-full border border-dashed border-yellow-200/70" />
                      <Sparkles size={24} className="text-yellow-100" />
                    </div>
                    <p className="relative text-base font-black text-white sm:text-lg">AI 타로 분석중입니다...</p>
                    <p className="relative mt-2 text-xs font-bold text-emerald-100/78 sm:text-sm">
                      선택한 과거 · 현재 · 미래의 흐름을 읽는 중...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {isResultModalOpen && isReadingComplete && (
        <div
          className={[
            "fixed inset-0 z-50 flex items-center justify-center overflow-hidden px-3 py-5 backdrop-blur-xl sm:px-6",
            isReadingFairyTheme ? "bg-fuchsia-950/76" : "bg-black/82"
          ].join(" ")}
        >
          <section
            className={[
              "relative flex h-[90vh] max-h-[90vh] w-[calc(100vw-24px)] max-w-6xl flex-col overflow-hidden rounded-2xl border p-3 shadow-[0_30px_100px_rgba(0,0,0,0.8),0_0_42px_rgba(52,211,153,0.18)] sm:w-[calc(100vw-48px)] sm:p-4 md:h-[84vh] md:p-5",
              isReadingFairyTheme
                ? "border-fuchsia-300/70 bg-[linear-gradient(145deg,rgba(76,5,75,0.96),rgba(157,23,77,0.88),rgba(88,28,135,0.9))] shadow-[0_30px_100px_rgba(76,5,75,0.78),0_0_42px_rgba(236,72,153,0.28)]"
                : "border-yellow-300/25 bg-[#03150e]"
            ].join(" ")}
          >
            <div
              className={[
                "pointer-events-none absolute inset-0",
                isReadingFairyTheme
                  ? "bg-[radial-gradient(circle_at_18%_10%,rgba(244,114,182,0.3),transparent_28%),radial-gradient(circle_at_86%_14%,rgba(250,204,21,0.18),transparent_24%)]"
                  : "bg-[radial-gradient(circle_at_18%_10%,rgba(52,211,153,0.18),transparent_28%),radial-gradient(circle_at_86%_14%,rgba(250,204,21,0.14),transparent_24%)]"
              ].join(" ")}
            />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <p className={["text-sm font-bold", isReadingFairyTheme ? "text-pink-100" : "text-yellow-100"].join(" ")}>선택한 카드 해석</p>
                <h2 className="mt-1.5 text-2xl font-black text-white sm:text-3xl">{readingCategory} 리딩</h2>
                {readingBirthDate && (
                  <p className={["mt-2 text-xs font-bold sm:text-sm", isReadingFairyTheme ? "text-pink-50/78" : "text-emerald-100/75"].join(" ")}>
                    {formatBirthDateLabel(readingBirthDate)} · {getCalendarTypeLabel(readingCalendarType)} 기준 개인화 해석
                  </p>
                )}
                {tarotCreditNotice && (
                  <p
                    className={[
                      "mt-3 inline-flex rounded-full border px-3 py-2 text-xs font-black sm:text-sm",
                      isReadingFairyTheme
                        ? "border-pink-200/55 bg-white/16 text-pink-50"
                        : "border-yellow-300/35 bg-yellow-300/12 text-yellow-100"
                    ].join(" ")}
                  >
                    {tarotCreditNotice}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsResultModalOpen(false)}
                className={[
                  "pointer-events-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition",
                  isReadingFairyTheme
                    ? "border-pink-200/55 bg-white/14 text-pink-50 hover:border-pink-100 hover:bg-pink-200/20"
                    : "border-emerald-200/25 bg-black/35 text-emerald-50 hover:border-yellow-300/60 hover:bg-yellow-300/15"
                ].join(" ")}
                aria-label="결과 닫기"
              >
                <X size={20} />
              </button>
            </div>

            <div className={["tarot-themed-scrollbar relative z-10 mt-4 flex-1 overflow-y-auto overflow-x-hidden pr-1 pb-3", isReadingFairyTheme ? "tarot-fairy-scrollbar" : ""].join(" ")}>
              <div className="grid items-stretch gap-3 md:grid-cols-3 lg:gap-4">
                {selectedCards.map((card, index) => (
                  <article
                    key={card.id}
                    className={[
                      "group flex h-full min-h-[420px] min-w-0 flex-col rounded-2xl border p-3 shadow-[0_18px_44px_rgba(0,0,0,0.32)] transition sm:min-h-[500px] sm:p-4 md:min-h-[520px] md:p-3 lg:min-h-[560px] lg:p-4",
                      isReadingFairyTheme
                        ? "border-pink-300/42 bg-white/52 shadow-[0_18px_44px_rgba(76,5,75,0.22)] hover:border-pink-200/80 hover:shadow-[0_0_34px_rgba(236,72,153,0.18),0_18px_44px_rgba(76,5,75,0.2)]"
                        : "border-emerald-200/18 bg-black/32 hover:border-yellow-300/45 hover:shadow-[0_0_34px_rgba(250,204,21,0.18),0_18px_44px_rgba(0,0,0,0.34)]"
                    ].join(" ")}
                  >
                    <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                      <div
                        className={[
                          "mx-auto my-0 flex h-[220px] w-[150px] shrink-0 items-center justify-center overflow-hidden rounded-xl border p-0 shadow-[0_0_28px_rgba(250,204,21,0.14)] transition duration-300 sm:h-[300px] sm:w-[210px] lg:h-[340px] lg:w-[240px]",
                          isReadingFairyTheme
                            ? "border-pink-300/45 bg-white/58 group-hover:shadow-[0_0_38px_rgba(236,72,153,0.24),0_0_24px_rgba(168,85,247,0.18)]"
                            : "border-yellow-300/45 bg-black/45 group-hover:shadow-[0_0_38px_rgba(250,204,21,0.28),0_0_24px_rgba(52,211,153,0.22)]"
                        ].join(" ")}
                      >
                        <div className="flex h-[220px] w-[150px] items-center justify-center sm:h-[300px] sm:w-[210px] lg:h-[340px] lg:w-[240px]">
                          <img src={card.image} alt={card.koreanName} className="h-full w-full object-contain object-center" />
                        </div>
                      </div>
                      <div className="mt-3 flex min-h-[66px] w-full min-w-0 flex-col justify-start">
                        <h3 className="w-full truncate text-sm font-black sm:text-base" title={`${cardPositions[index]} · ${card.koreanName} · ${card.name}`}>
                          <span className={isReadingFairyTheme ? "text-[#be185d]" : "text-yellow-200"}>{cardPositions[index]}</span>
                          <span className={["px-1.5", isReadingFairyTheme ? "text-pink-400/65" : "text-emerald-100/45"].join(" ")}>·</span>
                          <span className={isReadingFairyTheme ? "text-[#4c0519]" : "text-emerald-50"}>{card.koreanName}</span>
                          <span className={["px-1.5", isReadingFairyTheme ? "text-pink-400/65" : "text-emerald-100/45"].join(" ")}>·</span>
                          <span className={isReadingFairyTheme ? "text-[#7e22ce]" : "text-emerald-300"}>{card.name}</span>
                        </h3>
                        <p className={["mt-2 truncate text-xs leading-relaxed sm:text-sm md:text-xs lg:text-sm", isReadingFairyTheme ? "font-medium text-[#831843]" : "font-bold text-yellow-100/80"].join(" ")}>{card.keywords.join(" · ")}</p>
                      </div>
                    </div>
                    <p className={["tarot-line-clamp-2 mt-3 min-h-[48px] text-sm leading-relaxed", isReadingFairyTheme ? "font-medium text-[#3b082f]" : "text-emerald-50/90"].join(" ")}>{card.uprightMeaning}</p>
                  </article>
                ))}
              </div>

              {localTarotReading && (
                <div className="mt-4">
                  <LocalTarotReadingSection
                    reading={localTarotReading}
                    category={readingCategory}
                    isFairyTheme={isReadingFairyTheme}
                  />
                </div>
              )}
            </div>

            <div className={["relative z-10 mt-4 shrink-0 border-t pt-4", isReadingFairyTheme ? "border-pink-200/22" : "border-emerald-200/10"].join(" ")}>
              {saveStatus !== "idle" && (
                <p
                  className={[
                    "mb-3 text-center text-sm font-bold",
                    isReadingFairyTheme
                      ? saveStatus === "success" ? "text-pink-100" : "text-pink-200"
                      : saveStatus === "success" ? "text-emerald-200" : "text-yellow-100"
                  ].join(" ")}
                >
                  {saveStatus === "success" ? "자동 저장 완료" : "자동 저장 실패"}
                </p>
              )}
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setIsResultModalOpen(false);
                  setIsDeckModalOpen(false);
                  setIsTarotAnalyzing(false);
                }}
                className={[
                  "inline-flex h-12 items-center justify-center rounded-full border px-6 text-sm font-black transition hover:-translate-y-0.5",
                  isReadingFairyTheme
                    ? "border-pink-200/55 bg-white/12 text-pink-50 hover:border-pink-100 hover:bg-pink-200/18"
                    : "border-emerald-200/20 bg-black/35 text-emerald-50 hover:border-emerald-200/45 hover:bg-black/50"
                ].join(" ")}
              >
                AI 타로 홈
              </button>
              <div
                className={[
                  "inline-flex h-12 items-center justify-center rounded-full border px-6 text-sm font-black shadow-[0_0_24px_rgba(250,204,21,0.14)]",
                  isReadingFairyTheme
                    ? saveStatus === "error"
                      ? "border-pink-200/65 bg-fuchsia-950/18 text-pink-100"
                      : "border-pink-200/45 bg-pink-300/14 text-pink-50"
                    : saveStatus === "error"
                      ? "border-yellow-200/55 bg-yellow-300/12 text-yellow-100"
                      : "border-emerald-200/25 bg-emerald-300/10 text-emerald-100"
                ].join(" ")}
              >
                {isSavingReading
                  ? "자동 저장 중..."
                  : saveStatus === "success"
                    ? "자동 저장 완료"
                    : saveStatus === "error"
                      ? "자동 저장 실패"
                      : "자동 저장 대기"}
              </div>
              <button
                type="button"
                onClick={startReading}
                className={[
                  "inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-black transition hover:-translate-y-0.5",
                  isReadingFairyTheme
                    ? "bg-[linear-gradient(135deg,#db2777,#c026d3,#7c3aed)] text-white shadow-[0_0_28px_rgba(236,72,153,0.4)] hover:bg-[linear-gradient(135deg,#ec4899,#d946ef,#8b5cf6)]"
                    : "bg-emerald-300 text-[#042015] shadow-[0_0_28px_rgba(52,211,153,0.28)] hover:bg-emerald-200"
                ].join(" ")}
              >
                다시 뽑기
              </button>
              </div>
            </div>
          </section>
        </div>
      )}

      <style>{`
        html,
        body,
        .tarot-themed-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #d6b94f #041a12;
        }

        html::-webkit-scrollbar,
        body::-webkit-scrollbar,
        .tarot-themed-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        html::-webkit-scrollbar-track,
        body::-webkit-scrollbar-track,
        .tarot-themed-scrollbar::-webkit-scrollbar-track {
          background: #041a12;
          border-radius: 999px;
        }

        html::-webkit-scrollbar-thumb,
        body::-webkit-scrollbar-thumb,
        .tarot-themed-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #d6b94f 0%, #34d399 48%, #14532d 100%);
          border: 2px solid #041a12;
          border-radius: 999px;
        }

        html::-webkit-scrollbar-thumb:hover,
        body::-webkit-scrollbar-thumb:hover,
        .tarot-themed-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #fde68a 0%, #6ee7b7 48%, #166534 100%);
        }

        .tarot-fairy-scrollbar {
          scrollbar-color: #f9a8d4 #4a044e;
        }

        .tarot-fairy-scrollbar::-webkit-scrollbar-track {
          background: #4a044e;
        }

        .tarot-fairy-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #fde68a 0%, #f472b6 46%, #a855f7 100%);
          border: 2px solid #4a044e;
          border-radius: 999px;
        }

        .tarot-fairy-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #fef3c7 0%, #fb7185 44%, #c084fc 100%);
        }

        @keyframes fairyBubbleFloat {
          0% {
            opacity: 0;
            transform: translate3d(0, 22vh, 0) scale(0.74);
          }
          18% {
            opacity: 0.58;
          }
          72% {
            opacity: 0.42;
          }
          100% {
            opacity: 0;
            transform: translate3d(calc((var(--bubble-index) - 4) * 16px), -92vh, 0) scale(1.18);
          }
        }

        .tarot-fairy-bubble {
          position: absolute;
          left: calc(8% + var(--bubble-index) * 10.5%);
          bottom: -16vh;
          width: calc(34px + var(--bubble-index) * 3px);
          height: calc(34px + var(--bubble-index) * 3px);
          border-radius: 9999px;
          border: 1px solid rgba(253, 224, 71, 0.48);
          background:
            radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.72), transparent 18%),
            radial-gradient(circle at 62% 72%, rgba(244, 114, 182, 0.36), transparent 44%),
            rgba(216, 180, 254, 0.16);
          box-shadow:
            0 0 24px rgba(244, 114, 182, 0.28),
            inset 0 0 18px rgba(255, 255, 255, 0.24);
          animation: fairyBubbleFloat calc(10s + var(--bubble-index) * 900ms) ease-in-out infinite;
          animation-delay: calc(var(--bubble-index) * -1.1s);
        }

        @keyframes fairyButterflyFlight {
          0%, 100% {
            opacity: 0.2;
            transform: translate3d(0, 0, 0) rotate(-8deg) scale(0.88);
          }
          20% {
            opacity: 0.82;
            transform: translate3d(42px, -24px, 0) rotate(10deg) scale(1);
          }
          48% {
            opacity: 0.72;
            transform: translate3d(88px, 18px, 0) rotate(-12deg) scale(1.06);
          }
          76% {
            opacity: 0.86;
            transform: translate3d(34px, 52px, 0) rotate(12deg) scale(0.96);
          }
        }

        .tarot-fairy-butterfly {
          position: absolute;
          left: calc(6% + var(--butterfly-index) * 16%);
          top: calc(12% + var(--butterfly-index) * 7%);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: calc(20px + var(--butterfly-index) * 1px);
          filter:
            drop-shadow(0 0 10px rgba(250, 204, 21, 0.36))
            drop-shadow(0 0 16px rgba(244, 114, 182, 0.32));
          animation: fairyButterflyFlight calc(13s + var(--butterfly-index) * 1.2s) ease-in-out infinite;
          animation-delay: calc(var(--butterfly-index) * -1.6s);
        }

        @keyframes tarotFloat {
          0%, 100% {
            transform: translateY(0) rotate(-1deg);
          }
          50% {
            transform: translateY(-16px) rotate(1.5deg);
          }
        }

        @keyframes broomGlide {
          0%, 100% {
            transform: translateX(0) rotate(-10deg);
          }
          50% {
            transform: translateX(8px) rotate(-7deg);
          }
        }

        @keyframes shootingStar {
          0% {
            opacity: 0;
            transform: translate3d(0, 0, 0) rotate(-18deg) scaleX(0.4);
          }
          12% {
            opacity: 1;
          }
          45% {
            opacity: 0;
            transform: translate3d(210px, 70px, 0) rotate(-18deg) scaleX(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(210px, 70px, 0) rotate(-18deg) scaleX(1);
          }
        }

        @keyframes magicDustDrift {
          0%, 100% {
            opacity: 0.28;
            transform: translate3d(0, 0, 0) scale(0.92);
          }
          50% {
            opacity: 0.68;
            transform: translate3d(34px, -26px, 0) scale(1.08);
          }
        }

        .tarot-float {
          animation: tarotFloat 5.8s ease-in-out infinite;
        }

        .tarot-broom {
          animation: broomGlide 4.6s ease-in-out infinite;
        }

        @keyframes tarotCardReveal {
          0% {
            opacity: 0;
            transform: rotateY(90deg) scale(0.94);
          }
          100% {
            opacity: 1;
            transform: rotateY(0deg) scale(1);
          }
        }

        .tarot-card-flip {
          animation: tarotCardReveal 420ms ease both;
          transform-style: preserve-3d;
        }

        .tarot-line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @keyframes tarotSelectedCardFlip {
          0% {
            transform: rotateY(180deg) scale(0.98);
            filter: brightness(0.72);
          }
          55% {
            transform: rotateY(88deg) scale(1.04);
            filter: brightness(1.28);
          }
          100% {
            transform: rotateY(0deg) scale(1);
            filter: brightness(1);
          }
        }

        .tarot-selected-card-flip {
          animation: tarotSelectedCardFlip 640ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
          backface-visibility: hidden;
          transform-style: preserve-3d;
        }

        @keyframes tarotParticleSwirl {
          0% {
            opacity: 0;
            transform:
              rotate(calc(var(--particle-index) * 20deg))
              translateX(28px)
              scale(0.35);
          }
          20% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform:
              rotate(calc(var(--particle-index) * 20deg + 420deg))
              translateX(calc(108px + var(--particle-index) * 3px))
              scale(1);
          }
        }

        .tarot-particle-field {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .tarot-particle-field span {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 7px;
          height: 7px;
          border-radius: 9999px;
          background: radial-gradient(circle, rgba(250, 204, 21, 0.96), rgba(52, 211, 153, 0.75) 62%, transparent 72%);
          box-shadow:
            0 0 16px rgba(250, 204, 21, 0.48),
            0 0 24px rgba(52, 211, 153, 0.34);
          animation: tarotParticleSwirl 1.8s ease-in-out infinite;
          animation-delay: calc(var(--particle-index) * -90ms);
        }

        @keyframes tarotDeckShuffle {
          0%, 100% {
            transform: translateX(0) rotate(0deg);
            filter: drop-shadow(0 0 0 rgba(250, 204, 21, 0));
          }
          14% {
            transform: translateX(-14px) translateY(-4px) rotate(-1.8deg);
          }
          30% {
            transform: translateX(14px) translateY(5px) rotate(1.8deg);
            filter: drop-shadow(0 0 22px rgba(250, 204, 21, 0.3));
          }
          48% {
            transform: translateX(-10px) translateY(3px) rotate(-1.2deg);
          }
          68% {
            transform: translateX(10px) translateY(-3px) rotate(1.2deg);
            filter: drop-shadow(0 0 26px rgba(52, 211, 153, 0.34));
          }
          84% {
            transform: translateX(-5px) rotate(-0.6deg);
          }
        }

        .tarot-deck-shuffle {
          animation: tarotDeckShuffle 900ms ease-in-out both;
        }

        .tarot-magic-dust {
          position: absolute;
          z-index: -8;
          width: 120px;
          height: 72px;
          border-radius: 9999px;
          pointer-events: none;
          opacity: 0.45;
          background-image:
            radial-gradient(circle, rgba(250, 204, 21, 0.9) 0 2px, transparent 2.5px),
            radial-gradient(circle, rgba(187, 247, 208, 0.8) 0 1.5px, transparent 2px),
            radial-gradient(circle, rgba(253, 224, 71, 0.7) 0 1px, transparent 1.5px);
          background-position: 12px 24px, 76px 10px, 132px 62px;
          background-size: 52px 44px, 68px 58px, 38px 34px;
          filter: drop-shadow(0 0 12px rgba(250, 204, 21, 0.35));
          animation: magicDustDrift 8s ease-in-out infinite;
        }

        .tarot-magic-dust-one {
          left: 7vw;
          top: 10vh;
        }

        .tarot-magic-dust-two {
          right: 8vw;
          top: 14vh;
          animation-delay: 1.7s;
        }

        .tarot-magic-dust-three {
          left: 8vw;
          bottom: 16vh;
          animation-delay: 3.2s;
        }

        .tarot-shooting-star {
          position: absolute;
          z-index: -5;
          width: 140px;
          height: 2px;
          border-radius: 9999px;
          background: linear-gradient(90deg, transparent, rgba(250, 204, 21, 0.95), rgba(167, 243, 208, 0.85), transparent);
          box-shadow: 0 0 18px rgba(52, 211, 153, 0.5);
          opacity: 0;
          animation: shootingStar 7s ease-out infinite;
        }

        .tarot-shooting-star-delay {
          animation-delay: 2.8s;
        }

        @media (max-width: 640px) {
          .tarot-magic-dust {
            width: 78px;
            height: 50px;
            opacity: 0.2;
          }

          .tarot-magic-dust-one {
            left: 8vw;
            top: 10vh;
          }

          .tarot-magic-dust-two {
            left: auto;
            right: 8vw;
            top: 13vh;
          }

          .tarot-magic-dust-three {
            left: 8vw;
            top: auto;
            bottom: 14vh;
          }
        }
      `}</style>
    </main>
  );
}
