"use client";

import Link from "next/link";
import { ArrowLeft, CircleHelp, Heart, Moon, Sparkles, Star, Sun, WandSparkles, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";
import { tarotCards, type TarotCard } from "@/lib/tarotCards";

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

const cardPositions = ["과거", "현재", "미래"];
const TOKEN_KEY = "access_token";
const USER_KEY = "user";

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
};

type TarotReadingContext = {
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

function restoreSavedCards(cards: SavedTarotCard[]): TarotCard[] {
  return cards.map((savedCard, index) => {
    const matchedCard = tarotCards.find(
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
      image: "/images/tarot/cards/major-back.png",
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
    source: "openai"
  };
}

function LocalTarotReadingSection({
  reading,
  category
}: {
  reading: LocalTarotReading;
  category: string;
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
    <section className="rounded-2xl border border-yellow-300/20 bg-[linear-gradient(145deg,rgba(6,78,59,0.34),rgba(0,0,0,0.34))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.28),inset_0_0_0_1px_rgba(52,211,153,0.08)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black text-yellow-100 sm:text-sm">3장 조합 기반 종합 리딩</p>
          <h3 className="mt-1.5 text-xl font-black text-white sm:text-2xl">{category} 리딩</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-full border border-yellow-300/25 bg-yellow-300/10 px-4 py-2 text-xs font-bold text-yellow-100">
            {category}
          </div>
          <div className="rounded-full border border-emerald-200/20 bg-black/25 px-4 py-2 text-xs font-bold text-emerald-100">
            {reading.source === "openai" ? "OpenAI 해석" : "로컬 해석"}
          </div>
        </div>
      </div>
      <p className="mt-4 rounded-2xl border border-emerald-200/15 bg-black/25 p-3 text-sm leading-7 text-emerald-50/88 sm:p-4 sm:text-base sm:leading-8">
        {reading.overallSummary}
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {readingItems.map((item) => (
          <article key={item.label} className="rounded-2xl border border-emerald-200/14 bg-black/24 p-3 sm:p-4">
            <h4 className="text-sm font-black text-yellow-200">{item.label}</h4>
            <p className="mt-2 text-sm leading-7 text-emerald-50/84">{item.text}</p>
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
  const [selectedCategory, setSelectedCategory] = useState("오늘의 운세");
  const [question, setQuestion] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [calendarType, setCalendarType] = useState<CalendarType>("solar");
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
  const analysisTimerRef = useRef<number | null>(null);
  const shuffleTimerRef = useRef<number | null>(null);
  const autoSavedKeysRef = useRef<Set<string>>(new Set());
  const isReadingComplete = selectedCards.length === 3;
  const localTarotReading = isReadingComplete ? tarotReading ?? buildLocalTarotReading(selectedCards) : null;
  const currentQuestion = selectedCategory === "자유 질문" ? question.trim() : "";
  const currentBirthDate = birthDate.trim();
  const deckCopy = tarotDeckCopy[readingCategory] ?? tarotDeckCopy[selectedCategory] ?? tarotDeckCopy["오늘의 운세"];
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
          const user = JSON.parse(rawUser) as { name?: string; email?: string };
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
    }
  }, [authChecked, authStatus]);

  function openCategorySelection(defaultCategory = "오늘의 운세") {
    setSelectedCategory(defaultCategory);
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

    setDeck(shuffleCards(tarotCards));
    setSelectedCards([]);
    setTarotReading(null);
    setSaveStatus("idle");
    setIsSavingReading(false);
    setReadingCategory(category);
    setReadingQuestion(category === "자유 질문" ? nextQuestion.trim() || "자유 질문" : "");
    setReadingBirthDate(nextBirthDate.trim());
    setReadingCalendarType(nextCalendarType);
    setIsTarotAnalyzing(false);
    setIsDeckShuffling(false);
    setIsResultModalOpen(false);
    setIsCategoryModalOpen(false);
    setIsReadingStarted(true);
    setIsDeckModalOpen(true);
  }

  function startReading() {
    beginReadingWithCategory(
      readingCategory || selectedCategory,
      readingQuestion || currentQuestion,
      readingBirthDate || currentBirthDate,
      readingCalendarType
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
      setDeck(shuffleCards(tarotCards));
      setIsDeckShuffling(false);
      shuffleTimerRef.current = null;
    }, 900);
  }

  function handleCardSelect(card: TarotCard) {
    if (
      !isReadingStarted ||
      isTarotAnalyzing ||
      isReadingComplete ||
      selectedCards.some((selected) => selected.id === card.id)
    ) {
      return;
    }

    setSelectedCards((current) => {
      const nextCards = [...current, card];

      if (nextCards.length === 3) {
        void completeTarotReading(nextCards);
      }

      return nextCards;
    });
  }

  async function completeTarotReading(cards: TarotCard[]) {
    setIsTarotAnalyzing(true);
    const readingContext = {
      category: selectedCategory,
      question: currentQuestion,
      birthDate: currentBirthDate,
      calendarType
    };

    const minimumDelay = new Promise<void>((resolve) => {
      analysisTimerRef.current = window.setTimeout(() => {
        analysisTimerRef.current = null;
        resolve();
      }, 1800);
    });

    const fallbackReading = buildLocalTarotReading(cards);
    const readingPromise = fetchOpenAITarotReading(cards, readingContext).catch(() => fallbackReading);
    const [reading] = await Promise.all([readingPromise, minimumDelay]);

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
    setIsResultModalOpen(true);

    if (reading) {
      void saveReadingRecord(
        cards,
        reading,
        readingContext.category,
        readingContext.question,
        readingContext.birthDate,
        readingContext.calendarType
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
      readingCalendarType
    );
  }

  function buildSavedReadingKey(
    cards: TarotCard[],
    reading: LocalTarotReading,
    category: string,
    savedQuestion: string,
    savedBirthDate: string,
    savedCalendarType: CalendarType
  ) {
    return JSON.stringify({
      category,
      question: savedQuestion,
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
    savedCalendarType: CalendarType
  ) {
    const normalizedBirthDate = savedBirthDate.trim();
    const saveKey = buildSavedReadingKey(cards, reading, category, savedQuestion, normalizedBirthDate, savedCalendarType);
    if (autoSavedKeysRef.current.has(saveKey)) {
      setSaveStatus("success");
      return;
    }

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
        throw new Error("Failed to save tarot reading");
      }

      autoSavedKeysRef.current.add(saveKey);
      setSaveStatus("success");
      await loadSavedReadings();
    } catch {
      setSaveStatus("error");
    } finally {
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

  function openSavedReading(reading: SavedTarotReading) {
    const restoredCards = restoreSavedCards(reading.cards);
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
    <main className="min-h-screen overflow-hidden bg-[#020805] text-emerald-50">
      <section className="relative isolate min-h-screen px-4 py-6 sm:px-6 lg:px-10">
        <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_18%,rgba(52,211,153,0.22),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(250,204,21,0.16),transparent_22%),linear-gradient(135deg,#020805_0%,#062116_46%,#010403_100%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background-image:radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.75)_1px,transparent_1.5px),radial-gradient(circle_at_72%_22%,rgba(187,247,208,0.75)_1px,transparent_1.5px),radial-gradient(circle_at_48%_70%,rgba(250,204,21,0.55)_1px,transparent_1.5px)] [background-size:120px_120px,180px_180px,150px_150px]" />
        <div className="pointer-events-none tarot-magic-dust tarot-magic-dust-one" aria-hidden="true" />
        <div className="pointer-events-none tarot-magic-dust tarot-magic-dust-two" aria-hidden="true" />
        <div className="pointer-events-none tarot-magic-dust tarot-magic-dust-three" aria-hidden="true" />
        <div className="pointer-events-none tarot-shooting-star left-[12%] top-28" />
        <div className="pointer-events-none tarot-shooting-star tarot-shooting-star-delay left-[72%] top-40" />
        <img
          src={flyingWitchImages[0]}
          alt=""
          className="pointer-events-none absolute right-[-6rem] top-32 z-0 hidden w-[34rem] rotate-[-8deg] opacity-[0.12] blur-[0.5px] md:block xl:right-8 xl:w-[40rem]"
          aria-hidden="true"
        />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-200/20 bg-black/25 px-4 text-sm font-bold text-emerald-100 backdrop-blur transition hover:border-emerald-300/60 hover:bg-emerald-300/10"
          >
            <ArrowLeft size={16} />
            NoteFlow AI
          </Link>
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <div className="rounded-full border border-emerald-200/20 bg-black/25 px-4 py-2 text-xs font-extrabold text-emerald-100 backdrop-blur">
              {authLabel}
            </div>
            <div className="rounded-full border border-yellow-300/30 bg-yellow-300/10 px-4 py-2 text-sm font-extrabold text-yellow-200">
              AI 타로
            </div>
          </div>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-5 pb-6 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6 lg:pt-10">
          <section className="relative rounded-3xl border border-emerald-200/15 bg-black/25 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.32)] backdrop-blur sm:p-5">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-sm font-bold text-emerald-100">
              <Moon size={16} />
              AI가 읽어주는 카드 메시지
            </div>
            <h1 className="max-w-3xl text-3xl font-black leading-tight text-white sm:text-4xl">
              AI 타로가 전하는 오늘의 메시지
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-emerald-50/78 sm:text-base sm:leading-8">
              마음을 담아 카드를 펼쳐보세요. 과거 · 현재 · 미래의 이야기를 초록빛 마법으로 들려드릴게요.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => openCategorySelection("오늘의 운세")}
                className="pointer-events-auto inline-flex h-12 items-center justify-center rounded-full bg-emerald-300 px-6 text-sm font-black text-[#042015] shadow-[0_0_32px_rgba(52,211,153,0.35)] transition hover:-translate-y-0.5 hover:bg-emerald-200"
              >
                타로 시작하기
              </button>
              <button
                type="button"
                onClick={() => openCategorySelection("오늘의 운세")}
                className="inline-flex h-12 items-center justify-center rounded-full border border-yellow-300/45 bg-yellow-300/10 px-6 text-sm font-black text-yellow-100 transition hover:-translate-y-0.5 hover:bg-yellow-300/20"
              >
                오늘의 운세
              </button>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
              <div className="rounded-2xl border border-emerald-200/15 bg-emerald-950/35 p-4 backdrop-blur">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <h2 className="text-lg font-black text-white">운세 카테고리</h2>
                  <p className="text-xs font-bold text-emerald-100/65">다른 카테고리로 새로 시작</p>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    const isSelectedCategory = selectedCategory === category.title;
                    return (
                      <button
                        key={category.title}
                        type="button"
                        onClick={() => {
                          if (category.title === "자유 질문") {
                            openCategorySelection("자유 질문");
                            return;
                          }
                          beginReadingWithCategory(category.title);
                        }}
                        className={[
                          "flex min-h-14 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-extrabold text-emerald-50 transition hover:-translate-y-0.5 hover:border-yellow-300/45 hover:bg-emerald-300/10",
                          isSelectedCategory
                            ? "border-yellow-300/70 bg-emerald-300/12 shadow-[0_0_22px_rgba(52,211,153,0.2),0_0_14px_rgba(250,204,21,0.14)]"
                            : "border-emerald-200/15 bg-black/25"
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                            isSelectedCategory ? "bg-yellow-300/18 text-yellow-100" : "bg-emerald-300/15 text-emerald-200"
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

              <aside className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4 backdrop-blur">
                <h2 className="text-lg font-black text-yellow-100">안내</h2>
                <div className="mt-3 space-y-2 text-sm leading-6 text-emerald-50/82">
                  <p className="rounded-xl border border-emerald-200/15 bg-black/20 p-3">
                    원하는 운세를 선택하면 새 카테고리로 카드 뽑기가 시작됩니다.
                  </p>
                  <p className="rounded-xl border border-emerald-200/15 bg-black/20 p-3">
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
            <div className="overflow-x-hidden rounded-3xl border border-emerald-200/20 bg-black/30 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-emerald-200">
                    {selectedCards.length > 0 ? "방금 선택한 과거 · 현재 · 미래 카드" : "카드를 뽑으면 이곳에 기록됩니다."}
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">오늘의 카드 기록</h2>
                </div>
                <div className="flex h-12 w-12 overflow-hidden rounded-2xl border border-emerald-200/30 bg-emerald-300/15 shadow-[0_0_24px_rgba(16,185,129,0.24)]">
                  <FallbackImage
                    sources={mascotImages}
                    alt="AI 타로 마스코트"
                    className="h-full w-full object-cover"
                    fallback={<div className="flex h-full w-full items-center justify-center text-4xl">🧙‍♀️</div>}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 overflow-x-hidden sm:gap-2">
                {cardPositions.map((position, index) => {
                  const selectedCard = selectedCards[index];
                  return (
                  <article
                    key={position}
                    className="group flex aspect-[0.68] min-h-32 min-w-0 flex-col items-center justify-between overflow-hidden rounded-2xl border border-yellow-300/50 bg-[linear-gradient(155deg,rgba(5,46,22,0.95),rgba(2,8,5,0.95))] p-1.5 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.35),0_12px_26px_rgba(0,0,0,0.32)] transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_0_28px_rgba(52,211,153,0.24)] sm:min-h-40 sm:p-2"
                  >
                    <span className="relative z-10 text-xs font-black text-yellow-200">{position}</span>
                    {selectedCard ? (
                      <div className="tarot-card-flip relative my-2 h-full w-full overflow-hidden rounded-xl border border-yellow-200/35 bg-black/40">
                        <img src={selectedCard.image} alt={selectedCard.koreanName} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="relative my-2 h-full w-full overflow-hidden rounded-xl border border-emerald-200/20 bg-black/40">
                        <img src="/images/tarot/cards/major-back.png" alt="" className="h-full w-full object-cover opacity-90" />
                        <span className="absolute inset-0 flex items-center justify-center text-4xl text-emerald-100/80 transition group-hover:scale-110">
                          {cards[index].symbol}
                        </span>
                      </div>
                    )}
                  </article>
                  );
                })}
              </div>
              <div className="mt-4 border-t border-emerald-200/10 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-black text-white">저장된 타로 기록</h3>
                  <button
                    type="button"
                    onClick={loadSavedReadings}
                    disabled={isLoadingSavedReadings}
                    className="rounded-full border border-emerald-200/20 bg-black/25 px-3 py-1.5 text-xs font-black text-emerald-100 transition hover:border-yellow-300/45 hover:bg-yellow-300/10 disabled:cursor-not-allowed disabled:opacity-45"
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
                          isActiveFilter
                            ? "border-yellow-300/70 bg-yellow-300/15 text-yellow-100 shadow-[0_0_18px_rgba(250,204,21,0.18)]"
                            : "border-emerald-200/15 bg-black/20 text-emerald-100/78 hover:border-emerald-200/35"
                        ].join(" ")}
                      >
                        {filter}
                      </button>
                    );
                  })}
                </div>
                <div className="tarot-themed-scrollbar mt-3 max-h-[132px] space-y-2 overflow-y-auto overflow-x-hidden pr-1 sm:max-h-[140px]">
                  {isLoadingSavedReadings ? (
                    <p className="rounded-2xl border border-emerald-200/15 bg-black/20 p-3 text-sm font-bold text-emerald-100/78">
                      저장된 기록을 불러오는 중...
                    </p>
                  ) : savedReadingsError ? (
                    <p className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-3 text-sm font-bold text-yellow-100">
                      저장된 타로 기록을 불러오지 못했습니다.
                    </p>
                  ) : savedReadings.length === 0 ? (
                    <p className="rounded-2xl border border-emerald-200/15 bg-black/20 p-3 text-sm font-bold text-emerald-100/78">
                      아직 저장된 타로 기록이 없습니다.
                    </p>
                  ) : filteredSavedReadings.length === 0 ? (
                    <p className="rounded-2xl border border-emerald-200/15 bg-black/20 p-3 text-sm font-bold text-emerald-100/78">
                      해당 카테고리의 저장된 기록이 없습니다.
                    </p>
                  ) : (
                    filteredSavedReadings.map((reading) => (
                      <article key={reading.reading_id} className="min-w-0 rounded-2xl border border-emerald-200/15 bg-black/24 p-2.5">
                        <div className="flex min-w-0 items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-emerald-100/65">{formatSavedReadingDate(reading.created_at)}</p>
                            <h4 className="mt-1 truncate text-sm font-black text-yellow-100">{reading.category}</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => openSavedReading(reading)}
                            className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-emerald-300 px-3 text-xs font-black text-[#042015] transition hover:-translate-y-0.5 hover:bg-emerald-200"
                          >
                            다시 보기
                          </button>
                        </div>
                        {reading.question && (
                          <p className="mt-2 truncate text-xs font-bold leading-5 text-emerald-100/78">질문: {reading.question}</p>
                        )}
                        <p className="mt-1 truncate text-xs font-bold leading-5 text-emerald-50/80">
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
          <section className="relative z-10 mx-auto mb-10 max-w-7xl rounded-3xl border border-yellow-300/20 bg-yellow-300/10 p-5 backdrop-blur md:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-yellow-100">로컬 데이터 기반 해석</p>
                <h2 className="mt-2 text-2xl font-black text-white">과거 · 현재 · 미래 메시지</h2>
              </div>
              <button
                type="button"
                onClick={startReading}
                className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-300 px-5 text-sm font-black text-[#042015] transition hover:-translate-y-0.5 hover:bg-emerald-200"
              >
                다시 뽑기
              </button>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {selectedCards.map((card, index) => (
                <article key={card.id} className="rounded-2xl border border-emerald-200/15 bg-black/25 p-4">
                  <div className="flex gap-4">
                    <div className="h-36 w-24 shrink-0 overflow-hidden rounded-xl border border-yellow-300/35 bg-black/40">
                      <img src={card.image} alt={card.koreanName} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-yellow-200">{cardPositions[index]}</p>
                      <h3 className="mt-1 text-lg font-black text-white">
                        {card.koreanName}
                        <span className="block text-sm font-bold text-emerald-200">{card.name}</span>
                      </h3>
                      <p className="mt-3 text-xs font-bold leading-5 text-emerald-100/80">{card.keywords.join(" · ")}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-emerald-50/82">{card.uprightMeaning}</p>
                </article>
              ))}
            </div>

            {localTarotReading && (
              <div className="mt-6">
                <LocalTarotReadingSection
                  reading={localTarotReading}
                  category={readingCategory}
                />
              </div>
            )}
          </section>
        )}

      </section>

      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/86 px-3 py-5 backdrop-blur-xl sm:px-6">
          <section className="relative max-h-[90vh] w-[calc(100vw-24px)] max-w-3xl overflow-y-auto rounded-2xl border border-emerald-200/25 bg-[#03150e] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.82),0_0_42px_rgba(52,211,153,0.16)] sm:w-[calc(100vw-48px)] sm:p-5 md:p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(52,211,153,0.14),transparent_30%),radial-gradient(circle_at_84%_18%,rgba(250,204,21,0.12),transparent_26%)]" />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-yellow-100">카테고리 먼저 선택</p>
                <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">어떤 흐름을 읽어볼까요?</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-emerald-100/78">
                  선택한 카테고리를 기준으로 카드 3장을 뽑고 AI 해석을 생성합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-200/25 bg-black/70 text-emerald-50 transition hover:border-yellow-300/60 hover:bg-yellow-300/15"
                aria-label="카테고리 선택 닫기"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative z-10 mt-5 rounded-2xl border border-emerald-200/18 bg-black/72 p-4 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.08)]">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-sm font-black text-emerald-50">개인화 정보</h3>
                  <p className="mt-1 text-xs font-bold text-emerald-100/70">
                    선택사항입니다. 입력하면 생년월일 흐름을 참고한 해석으로 반영됩니다.
                  </p>
                </div>
                <span className="rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-1 text-[11px] font-black text-yellow-100">
                  선택 입력
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="block">
                  <span className="text-xs font-black text-yellow-100">생년월일</span>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(event) => setBirthDate(event.target.value)}
                    className="mt-2 h-11 w-full rounded-2xl border border-emerald-200/20 bg-black/75 px-4 text-sm font-bold text-emerald-50 outline-none transition [color-scheme:dark] focus:border-yellow-200/70 focus:shadow-[0_0_24px_rgba(250,204,21,0.16)]"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-emerald-200/15 bg-emerald-950/55 p-1">
                  {[
                    { label: "양력", value: "solar" as CalendarType },
                    { label: "음력", value: "lunar" as CalendarType }
                  ].map((option) => {
                    const isActive = calendarType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setCalendarType(option.value)}
                        className={[
                          "h-9 rounded-xl px-4 text-sm font-black transition",
                          isActive
                            ? "bg-yellow-300 text-[#042015] shadow-[0_0_18px_rgba(250,204,21,0.22)]"
                            : "text-emerald-100/75 hover:bg-emerald-300/10 hover:text-emerald-50"
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

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
                      if (category.title !== "자유 질문") {
                        beginReadingWithCategory(category.title);
                      }
                    }}
                    className={[
                      "relative flex min-h-20 items-center gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-1 sm:min-h-24 sm:p-4",
                      isSelectedCategory || isFeaturedCategory
                        ? "border-yellow-300/70 bg-emerald-950/85 shadow-[0_0_26px_rgba(52,211,153,0.22),0_0_18px_rgba(250,204,21,0.16)]"
                        : "border-emerald-200/18 bg-black/70 hover:border-yellow-300/45 hover:bg-emerald-950/80"
                    ].join(" ")}
                  >
                    {isFeaturedCategory && (
                      <span className="absolute right-3 top-3 rounded-full bg-yellow-300/18 px-2 py-1 text-[10px] font-black text-yellow-100">
                        추천
                      </span>
                    )}
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow-300/15 text-yellow-100">
                      <Icon size={20} />
                    </span>
                    <span>
                      <span className="block font-black text-white">{category.title}</span>
                      <span className="mt-1 block text-xs font-bold leading-5 text-emerald-100/70">
                        {category.title === "자유 질문" ? "질문을 적고 카드 흐름을 확인해요." : `${category.title} 흐름으로 바로 뽑기`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedCategory === "자유 질문" && (
              <div className="relative z-10 mt-6 rounded-2xl border border-yellow-300/25 bg-black/72 p-4 shadow-[inset_0_0_0_1px_rgba(250,204,21,0.08)]">
                <label htmlFor="tarot-category-question" className="text-sm font-black text-yellow-100">
                  자유 질문
                </label>
                <input
                  id="tarot-category-question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  maxLength={500}
                  placeholder="궁금한 내용을 짧게 적어주세요."
                  className="mt-3 h-12 w-full rounded-2xl border border-yellow-300/35 bg-black/75 px-4 text-sm font-bold text-emerald-50 outline-none transition placeholder:text-emerald-100/45 focus:border-yellow-200/70 focus:shadow-[0_0_24px_rgba(250,204,21,0.16)]"
                />
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => beginReadingWithCategory("자유 질문", question.trim() || "자유 질문", birthDate, calendarType)}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-300 px-5 text-sm font-black text-[#042015] transition hover:-translate-y-0.5 hover:bg-emerald-200"
                  >
                    카드 뽑기 시작
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {isReadingStarted && isDeckModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/78 px-3 py-5 backdrop-blur-sm sm:px-6">
          <section className="relative flex h-[88vh] w-[calc(100vw-24px)] max-w-5xl flex-col overflow-hidden rounded-2xl border border-emerald-200/20 bg-[#03150e]/95 p-4 pt-5 shadow-[0_30px_100px_rgba(0,0,0,0.72)] sm:w-[calc(100vw-48px)] sm:p-5 md:p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(52,211,153,0.16),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(250,204,21,0.12),transparent_24%)]" />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white sm:text-2xl">{deckCopy.title}</h2>
                <p className="mt-2 text-sm font-bold text-emerald-100/82 sm:text-base">
                  {deckCopy.description}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeckModalOpen(false)}
                  disabled={isTarotAnalyzing}
                  className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-emerald-200/25 bg-black/35 text-emerald-50 transition hover:border-yellow-300/60 hover:bg-yellow-300/15 disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label="카드 덱 닫기"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="relative z-10 flex flex-1 flex-col overflow-hidden pt-4 sm:pt-6">
              <div className="pointer-events-none absolute inset-x-6 bottom-10 h-28 rounded-full bg-emerald-300/12 blur-3xl" />
              <div className="relative mx-auto grid h-44 w-full max-w-4xl grid-cols-3 items-start gap-3 px-1 sm:h-52 sm:gap-7 sm:px-4 md:h-56 lg:gap-8">
                {cardPositions.map((position, index) => {
                  const selectedCard = selectedCards[index];

                  return (
                    <div key={position} className="flex min-w-0 flex-col items-center">
                      <p className="mb-2 text-xs font-black text-yellow-100 sm:mb-3 sm:text-sm">{position}</p>
                      {selectedCard ? (
                        <div
                          key={selectedCard.id}
                          className="tarot-selected-card-flip relative aspect-[0.68] w-16 overflow-hidden rounded-xl border border-yellow-300/90 bg-emerald-950/70 shadow-[0_0_30px_rgba(52,211,153,0.55),0_0_18px_rgba(250,204,21,0.42)] ring-4 ring-emerald-300/35 sm:w-24 md:w-28 lg:w-32"
                        >
                          <img src={selectedCard.image} alt={selectedCard.koreanName} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="flex aspect-[0.68] w-16 items-center justify-center rounded-xl border border-dashed border-emerald-200/25 bg-black/24 shadow-[inset_0_0_20px_rgba(52,211,153,0.08)] sm:w-24 md:w-28 lg:w-32">
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
                        "pointer-events-auto group absolute left-1/2 top-1/2 aspect-[0.68] w-16 origin-bottom overflow-hidden rounded-xl border bg-emerald-950/70 shadow-[0_18px_42px_rgba(0,0,0,0.42)] transition duration-500 sm:w-24 md:w-32 lg:w-36",
                        isSelected
                          ? "border-yellow-300/55 opacity-0"
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
                        src="/images/tarot/cards/major-back.png"
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
                  className="pointer-events-auto inline-flex items-center justify-center rounded-full border border-yellow-300/60 bg-yellow-300/12 px-6 py-2.5 text-sm font-black text-yellow-100 shadow-[0_0_26px_rgba(250,204,21,0.2),0_0_18px_rgba(52,211,153,0.12)] transition hover:scale-105 hover:border-yellow-200 hover:bg-yellow-300/22 hover:shadow-[0_0_34px_rgba(250,204,21,0.28),0_0_24px_rgba(52,211,153,0.18)] disabled:cursor-not-allowed disabled:opacity-35 sm:px-8 sm:py-3 sm:text-base"
                >
                  {isDeckShuffling ? "섞는 중..." : "카드 섞기"}
                </button>
              </div>

              {isTarotAnalyzing && (
                <div className="absolute inset-0 z-[200] flex items-center justify-center overflow-hidden bg-black/62 backdrop-blur-[3px]">
                  <div className="tarot-particle-field" aria-hidden="true">
                    {Array.from({ length: 18 }).map((_, index) => (
                      <span key={index} style={{ "--particle-index": index } as CSSProperties} />
                    ))}
                  </div>
                  <div className="relative overflow-hidden rounded-3xl border border-emerald-200/30 bg-[#03150e]/92 px-7 py-7 text-center shadow-[0_0_52px_rgba(52,211,153,0.32),0_0_34px_rgba(250,204,21,0.14)]">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(52,211,153,0.22),transparent_34%),radial-gradient(circle_at_50%_84%,rgba(250,204,21,0.15),transparent_38%)]" />
                    <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-yellow-200/35 bg-emerald-300/10 shadow-[0_0_28px_rgba(52,211,153,0.36)]">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/82 px-3 py-5 backdrop-blur-xl sm:px-6">
          <section className="relative flex h-[90vh] max-h-[90vh] w-[calc(100vw-24px)] max-w-6xl flex-col overflow-hidden rounded-2xl border border-yellow-300/25 bg-[#03150e] p-3 shadow-[0_30px_100px_rgba(0,0,0,0.8),0_0_42px_rgba(52,211,153,0.18)] sm:w-[calc(100vw-48px)] sm:p-4 md:h-[84vh] md:p-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(52,211,153,0.18),transparent_28%),radial-gradient(circle_at_86%_14%,rgba(250,204,21,0.14),transparent_24%)]" />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-yellow-100">선택한 카드 해석</p>
                <h2 className="mt-1.5 text-2xl font-black text-white sm:text-3xl">{readingCategory} 리딩</h2>
                {readingBirthDate && (
                  <p className="mt-2 text-xs font-bold text-emerald-100/75 sm:text-sm">
                    {formatBirthDateLabel(readingBirthDate)} · {getCalendarTypeLabel(readingCalendarType)} 기준 개인화 해석
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsResultModalOpen(false)}
                className="pointer-events-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-200/25 bg-black/35 text-emerald-50 transition hover:border-yellow-300/60 hover:bg-yellow-300/15"
                aria-label="결과 닫기"
              >
                <X size={20} />
              </button>
            </div>

            <div className="tarot-themed-scrollbar relative z-10 mt-4 flex-1 overflow-y-auto overflow-x-hidden pr-1 pb-3">
              <div className="grid items-start gap-3 md:grid-cols-3 lg:gap-4">
                {selectedCards.map((card, index) => (
                  <article
                    key={card.id}
                    className="group min-w-0 rounded-2xl border border-emerald-200/18 bg-black/32 p-3 shadow-[0_18px_44px_rgba(0,0,0,0.32)] transition hover:border-yellow-300/45 hover:shadow-[0_0_34px_rgba(250,204,21,0.18),0_18px_44px_rgba(0,0,0,0.34)] sm:p-4 md:p-3 lg:p-4"
                  >
                    <div className="flex min-w-0 flex-col items-center text-center">
                      <div className="aspect-[0.68] h-56 max-h-[58vh] w-36 shrink-0 overflow-hidden rounded-xl border border-yellow-300/45 bg-black/45 p-1 shadow-[0_0_28px_rgba(250,204,21,0.14)] transition duration-300 group-hover:scale-105 group-hover:shadow-[0_0_38px_rgba(250,204,21,0.28),0_0_24px_rgba(52,211,153,0.22)] sm:h-64 sm:w-40 md:h-56 md:w-36 lg:h-64 lg:w-40">
                        <img src={card.image} alt={card.koreanName} className="h-full w-full object-contain" />
                      </div>
                      <div className="mt-3 w-full min-w-0">
                        <h3 className="truncate text-sm font-black sm:text-base">
                          <span className="text-yellow-200">{cardPositions[index]}</span>
                          <span className="px-1.5 text-emerald-100/45">·</span>
                          <span className="text-emerald-50">{card.koreanName}</span>
                          <span className="px-1.5 text-emerald-100/45">·</span>
                          <span className="text-emerald-300">{card.name}</span>
                        </h3>
                        <p className="mt-2 truncate text-xs font-bold leading-5 text-yellow-100/80 sm:text-sm md:text-xs lg:text-sm">{card.keywords.join(" · ")}</p>
                      </div>
                    </div>
                    <p className="tarot-line-clamp-2 mt-3 text-sm leading-6 text-emerald-50/90">{card.uprightMeaning}</p>
                  </article>
                ))}
              </div>

              {localTarotReading && (
                <div className="mt-4">
                  <LocalTarotReadingSection
                    reading={localTarotReading}
                    category={readingCategory}
                  />
                </div>
              )}
            </div>

            <div className="relative z-10 mt-4 shrink-0 border-t border-emerald-200/10 pt-4">
              {saveStatus !== "idle" && (
                <p
                  className={[
                    "mb-3 text-center text-sm font-bold",
                    saveStatus === "success" ? "text-emerald-200" : "text-yellow-100"
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
                className="inline-flex h-12 items-center justify-center rounded-full border border-emerald-200/20 bg-black/35 px-6 text-sm font-black text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200/45 hover:bg-black/50"
              >
                AI 타로 홈
              </button>
              <div
                className={[
                  "inline-flex h-12 items-center justify-center rounded-full border px-6 text-sm font-black shadow-[0_0_24px_rgba(250,204,21,0.14)]",
                  saveStatus === "error"
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
                className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-300 px-6 text-sm font-black text-[#042015] shadow-[0_0_28px_rgba(52,211,153,0.28)] transition hover:-translate-y-0.5 hover:bg-emerald-200"
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
