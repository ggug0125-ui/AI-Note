"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  CreditCard,
  FileText,
  HelpCircle,
  KeyRound,
  LogOut,
  ReceiptText,
  Shield,
  Sparkles,
  Trash2,
  UserRound
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";

const TOKEN_KEY = "access_token";
const USER_KEY = "user";

type AuthUser = {
  user_id?: string;
  email?: string;
  name?: string;
  role?: string;
  plan?: string;
};

type CalendarType = "solar" | "lunar";

type SavedTarotCard = {
  position: string;
  name: string;
  englishName: string;
  keywords: string[];
  uprightMeaning: string;
};

type SavedTarotReading = {
  reading_id?: string;
  category: string;
  question: string;
  birth_date?: string | null;
  calendar_type?: CalendarType | null;
  cards: SavedTarotCard[];
  created_at: string;
};

type UploadedDocument = {
  file_id: string;
  filename: string;
  display_name?: string;
  memo?: string;
  chunk_count?: number;
  text_length?: number;
  created_at?: string;
  uploaded_at?: string;
};

type SummaryRecord = {
  file_id?: string;
  filename?: string;
  display_title?: string;
  memo?: string;
  summary_type?: string;
  summary?: string;
  created_at?: string;
  uploaded_at?: string;
};

type KeywordRecord = {
  file_id?: string;
  filename?: string;
  display_title?: string;
  memo?: string;
  scope?: string;
  keywords?: string[];
  created_at?: string;
  uploaded_at?: string;
};

type QuestionRecord = {
  file_id?: string;
  filename?: string;
  display_title?: string;
  memo?: string;
  question?: string;
  answer?: string;
  created_at?: string;
  uploaded_at?: string;
};

type AssistantRecords = {
  uploads: UploadedDocument[];
  summaries: SummaryRecord[];
  keywords: KeywordRecord[];
  questions: QuestionRecord[];
};

type CreditProduct = {
  product_id: string;
  name: string;
  product_type: string;
  credits: number;
  base_credits?: number;
  bonus_credits?: number;
  price: number;
  amount_cents: number;
  currency: string;
  status: string;
  badge?: string;
};

type PreparedPayment = {
  payment_id: string;
  product_id: string;
  product_name: string;
  plan_name?: string;
  base_credits?: number;
  bonus_credits?: number;
  credits: number;
  amount: number;
  amount_cents: number;
  currency: string;
  status: string;
  provider: string;
  checkout_url?: string | null;
};

type PaymentRecord = {
  payment_id: string;
  product_id?: string;
  product_name: string;
  plan_name?: string;
  base_credits?: number;
  bonus_credits?: number;
  credits: number;
  amount: number;
  amount_cents?: number;
  currency: string;
  status: string;
  provider: string;
  created_at: string;
  paid_at?: string | null;
};

type MockPaymentSuccessResponse = {
  payment?: PreparedPayment;
  credit_usage?: {
    credits_added?: number;
    credits_before?: number | null;
    credits_after?: number | null;
    already_paid?: boolean;
  } | null;
};

type MyPageTab = "assistant" | "tarot" | "profile" | "billing" | "payments";
type AssistantDetailType = "uploads" | "summaries" | "keywords" | "questions";
type ConfirmationModalType = "logout" | "withdrawal" | null;
type DeleteTarget =
  | { type: "tarot"; readingId: string; title: string }
  | { type: "upload"; fileId: string; title: string }
  | { type: "record"; detail: Exclude<AssistantDetailType, "uploads">; recordId: string; title: string }
  | null;
type EditTarget =
  | { type: "upload"; file: UploadedDocument }
  | { type: "record"; detail: Exclude<AssistantDetailType, "uploads">; record: SummaryRecord | KeywordRecord | QuestionRecord }
  | null;
type ActionMessage = { tone: "success" | "error"; text: string } | null;

const tarotReadingFilters = ["전체", "오늘의 운세", "연애운", "재물운", "취업/진로", "학업운", "자유질문"];

const menuItems: Array<{ id: MyPageTab; label: string; icon: ReactNode }> = [
  { id: "assistant", label: "AI 어시스턴트", icon: <Bot size={18} /> },
  { id: "tarot", label: "AI 타로", icon: <Sparkles size={18} /> },
  { id: "profile", label: "내정보 관리", icon: <UserRound size={18} /> },
  { id: "billing", label: "결제 정보", icon: <CreditCard size={18} /> },
  { id: "payments", label: "결제 내역", icon: <ReceiptText size={18} /> }
];

const assistantStats = [
  { id: "uploads", label: "업로드 문서", description: "저장된 문서", icon: <FileText size={20} /> },
  { id: "summaries", label: "요약 기록", description: "생성된 요약", icon: <Sparkles size={20} /> },
  { id: "keywords", label: "키워드 기록", description: "추출 결과", icon: <KeyRound size={20} /> },
  { id: "questions", label: "질문 기록", description: "문서 Q&A", icon: <HelpCircle size={20} /> }
] satisfies Array<{
  id: AssistantDetailType;
  label: string;
  description: string;
  icon: ReactNode;
}>;

const assistantDetailTitles: Record<AssistantDetailType, string> = {
  uploads: "업로드 문서 상세",
  summaries: "요약 기록 상세",
  keywords: "키워드 기록 상세",
  questions: "질문 기록 상세"
};

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

function getRecordTimestamp(record: { created_at?: string; uploaded_at?: string }) {
  return record.created_at || record.uploaded_at || "";
}

function sortByLatest<T extends { created_at?: string; uploaded_at?: string }>(items: T[]) {
  return [...items].sort((a, b) => getRecordTimestamp(b).localeCompare(getRecordTimestamp(a)));
}

function formatRecordDate(record: { created_at?: string; uploaded_at?: string }) {
  const timestamp = getRecordTimestamp(record);
  if (!timestamp) {
    return "날짜 없음";
  }

  return formatSavedReadingDate(timestamp);
}

function previewText(text: string | undefined, fallback = "내용 없음") {
  const normalized = text?.trim();
  if (!normalized) {
    return fallback;
  }

  return normalized.length > 160 ? `${normalized.slice(0, 160)}...` : normalized;
}

function getRecordApiType(detail: Exclude<AssistantDetailType, "uploads">) {
  return detail === "questions" ? "chats" : detail;
}

function getRoleLabel(role: string | undefined) {
  return role === "admin" ? "관리자" : "일반 회원";
}

function getPlanLabel(plan: string | undefined) {
  return plan?.trim() || "Free";
}

function formatPaymentAmount(amount: number | undefined, currency = "USD") {
  const safeAmount = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  if (currency === "USD") {
    return `$${safeAmount.toLocaleString("en-US")}`;
  }

  return `${safeAmount.toLocaleString("en-US")} ${currency}`;
}

function formatCreditCount(value: number | undefined) {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return safeValue.toLocaleString("en-US");
}

function getCreditBreakdown(item: { base_credits?: number; bonus_credits?: number; credits?: number }) {
  const credits = Number(item.credits || 0);
  const bonusCredits = Number(item.bonus_credits || 0);
  const baseCredits = Number(item.base_credits ?? Math.max(credits - bonusCredits, 0));

  return { baseCredits, bonusCredits, credits };
}

function getExtraPercent(baseCredits: number, bonusCredits: number) {
  if (baseCredits <= 0 || bonusCredits <= 0) {
    return 0;
  }

  return Math.round((bonusCredits / baseCredits) * 100);
}

function isFeaturedCreditProduct(productId: string) {
  return productId === "credit_150" || productId === "credit_1000" || productId === "credit_2200";
}

function getFeaturedLabel(productId: string, fallback = "") {
  const labels: Record<string, string> = {
    credit_150: "BEST VALUE",
    credit_1000: "DOUBLE CREDIT",
    credit_2200: "ULTIMATE"
  };

  return labels[productId] || fallback;
}

function getCreditProductTone(productId: string) {
  if (productId === "credit_2200") {
    return {
      card: "border-[#C99A3C] bg-[linear-gradient(135deg,#FFF8EE_0%,#FFF4DE_100%)] shadow-[0_16px_36px_rgba(124,82,27,0.12)] hover:border-[#B88322]",
      badge: "border-[#B88322]/70 bg-[#E3B456] text-[#3B260D]",
      badgePrefix: "♛ ",
      accent: "text-[#6E4614]",
      amount: "text-[#2F2418]",
      panel: "border-[#E4C889] bg-[#FFF8EA]",
      extra: "border-[#D9B86B]/75 bg-[#FFF1C4] text-[#6E4614]",
      button: "bg-[linear-gradient(135deg,#D79B34_0%,#EFC36B_100%)]"
    };
  }

  if (productId === "credit_1000") {
    return {
      card: "border-[#D1A847] bg-[#FFF7E2] shadow-[0_14px_32px_rgba(124,82,27,0.10)] hover:border-[#BF9232] hover:shadow-[0_22px_48px_rgba(124,82,27,0.16)]",
      badge: "border-[#C89A35]/70 bg-[#FFE7A8] text-[#604019]",
      badgePrefix: "",
      accent: "text-[#7A4F16]",
      amount: "text-[#2F2418]",
      panel: "border-[#E4C889] bg-[#FFF9EA]",
      extra: "border-[#D9B86B]/70 bg-[#FFF2C9] text-[#7A4F16]",
      button: "bg-[linear-gradient(135deg,#DFA84A_0%,#F1C875_100%)]"
    };
  }

  if (productId === "credit_360") {
    return {
      card: "border-[#DEBD6A] bg-[#FFF9EC] hover:border-[#CEA64B]",
      badge: "border-[#D3A84F]/70 bg-[#FFEBC0] text-[#73501C]",
      badgePrefix: "",
      accent: "text-[#875D1F]",
      amount: "text-[#2F2418]",
      panel: "border-[#EAD8AA] bg-[#FFFBF0]",
      extra: "border-[#E2C985]/70 bg-[#FFF6D9] text-[#7A551D]",
      button: "bg-[linear-gradient(135deg,#E5AE54_0%,#F2CC82_100%)]"
    };
  }

  if (productId === "credit_150") {
    return {
      card: "border-[#E5A979] bg-[#FFF1E5] hover:border-[#D99561]",
      badge: "border-[#D9A23A]/70 bg-[#F4C96F] text-[#4D3212]",
      badgePrefix: "★ ",
      accent: "text-[#8A5B1C]",
      amount: "text-[#2F2418]",
      panel: "border-[#EABF9D] bg-[#FFF7EF]",
      extra: "border-[#E5C575]/70 bg-[#FFF4CE] text-[#7B551A]",
      button: "bg-[linear-gradient(135deg,#E7A15F_0%,#EFC66F_100%)]"
    };
  }

  if (productId === "credit_65") {
    return {
      card: "border-[#ECC09D] bg-[#FFF5EC] hover:border-[#E3A978]",
      badge: "border-[#E7A875]/70 bg-[#FFDDBF] text-[#7B4D22]",
      badgePrefix: "",
      accent: "text-[#9A6230]",
      amount: "text-[#2F2418]",
      panel: "border-[#F1D3B8] bg-[#FFF9F2]",
      extra: "border-[#E8C77A]/65 bg-[#FFF6D9] text-[#80591D]",
      button: "bg-[linear-gradient(135deg,#E9A86B_0%,#EFC77E_100%)]"
    };
  }

  if (productId === "credit_25") {
    return {
      card: "border-[#EBCDB4] bg-[#FFFDF8] hover:border-[#E7B98F]",
      badge: "border-[#E9BD98]/70 bg-[#FFF0E2] text-[#7A4E2B]",
      badgePrefix: "",
      accent: "text-[#5F4128]",
      amount: "text-[#2F2418]",
      panel: "border-[#EAD8C1] bg-white/70",
      extra: "border-[#EAD8C1] bg-[#FFF8EE] text-[#7A6245]",
      button: "bg-[linear-gradient(135deg,#E8AA73_0%,#EBCB8A_100%)]"
    };
  }

  return {
    card: "border-[#EAD8C1] bg-[#FFFDF8] hover:border-[#EBC8A8]",
    badge: "border-[#EAD8C1] bg-white/75 text-[#7A6245]",
    badgePrefix: "",
    accent: "text-[#7A6245]",
    amount: "text-[#2F2418]",
    panel: "border-[#EAD8C1] bg-white/70",
    extra: "border-[#EAD8C1] bg-[#FFF8EE] text-[#7A6245]",
    button: "bg-[linear-gradient(135deg,#E6A970_0%,#E9CA8A_100%)]"
  };
}

function clearAuthStorage() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export default function MyPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<MyPageTab>("assistant");
  const [paymentResult, setPaymentResult] = useState<string | null>(null);
  const [savedReadings, setSavedReadings] = useState<SavedTarotReading[]>([]);
  const [isLoadingReadings, setIsLoadingReadings] = useState(false);
  const [readingsError, setReadingsError] = useState(false);
  const [assistantRecords, setAssistantRecords] = useState<AssistantRecords>({
    uploads: [],
    summaries: [],
    keywords: [],
    questions: []
  });
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState(false);
  const [assistantDetail, setAssistantDetail] = useState<AssistantDetailType | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModalType>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [deletingTarotReadingId, setDeletingTarotReadingId] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [tarotActionMessage, setTarotActionMessage] = useState<ActionMessage>(null);
  const [assistantActionMessage, setAssistantActionMessage] = useState<ActionMessage>(null);
  const [withdrawalMessage, setWithdrawalMessage] = useState<ActionMessage>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") as MyPageTab | null;
    if (tab && menuItems.some((item) => item.id === tab)) {
      setActiveTab(tab);
    }
    setPaymentResult(params.get("payment"));
  }, []);

  useEffect(() => {
    if (paymentResult !== "success") {
      return;
    }

    authenticatedFetch(`${API_BASE_URL}/credits/me`)
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as { user?: AuthUser };
        if (data.user) {
          window.localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          setUser((current) => current ? { ...current, ...data.user } : data.user ?? current);
        }
      })
      .catch(() => {
        // Payment return refresh should not block the page.
      });
  }, [paymentResult]);
  const [tarotReadingFilter, setTarotReadingFilter] = useState("전체");

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_KEY)?.trim();
    const hasToken = Boolean(token && token !== "undefined" && token !== "null");

    if (!hasToken) {
      setUser(null);
      setAuthChecked(true);
      return;
    }

    const rawUser = window.localStorage.getItem(USER_KEY);
    if (rawUser) {
      try {
        setUser(JSON.parse(rawUser) as AuthUser);
      } catch {
        setUser({ name: "로그인됨", plan: "Free", role: "user" });
      }
    } else {
      setUser({ name: "로그인됨", plan: "Free", role: "user" });
    }

    setAuthChecked(true);
  }, []);

  useEffect(() => {
    if (!authChecked || !user || activeTab !== "tarot") {
      return;
    }

    void loadSavedReadings();
  }, [activeTab, authChecked, user]);

  useEffect(() => {
    if (!authChecked || !user) {
      return;
    }

    void loadAssistantRecords();
  }, [authChecked, user]);

  async function loadSavedReadings() {
    setIsLoadingReadings(true);
    setReadingsError(false);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/tarot/readings?limit=20`);
      if (!response.ok) {
        throw new Error("Failed to load tarot readings");
      }

      const data = (await response.json()) as { readings: SavedTarotReading[] };
      setSavedReadings(data.readings ?? []);
    } catch {
      setReadingsError(true);
    } finally {
      setIsLoadingReadings(false);
    }
  }

  async function loadAssistantRecords() {
    setIsAssistantLoading(true);
    setAssistantError(false);

    try {
      const [filesResponse, historyResponse, resultsResponse] = await Promise.all([
        authenticatedFetch(`${API_BASE_URL}/files`),
        authenticatedFetch(`${API_BASE_URL}/history?limit=50`),
        authenticatedFetch(`${API_BASE_URL}/results`)
      ]);

      if (!filesResponse.ok || !historyResponse.ok || !resultsResponse.ok) {
        throw new Error("Failed to load assistant records");
      }

      const filesData = (await filesResponse.json()) as { files?: UploadedDocument[] };
      const historyData = (await historyResponse.json()) as { history?: QuestionRecord[] };
      const resultsData = (await resultsResponse.json()) as {
        summaries?: SummaryRecord[];
        summary_results?: SummaryRecord[];
        keywords?: KeywordRecord[];
        keyword_results?: KeywordRecord[];
      };

      setAssistantRecords({
        uploads: sortByLatest(filesData.files ?? []),
        summaries: sortByLatest(resultsData.summaries ?? resultsData.summary_results ?? []),
        keywords: sortByLatest(resultsData.keywords ?? resultsData.keyword_results ?? []),
        questions: sortByLatest(historyData.history ?? [])
      });
    } catch {
      setAssistantError(true);
    } finally {
      setIsAssistantLoading(false);
    }
  }

  function handleLogout() {
    clearAuthStorage();
    router.replace("/login");
  }

  async function handleWithdrawal() {
    setIsWithdrawing(true);
    setWithdrawalMessage(null);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/auth/me`, {
        method: "DELETE"
      });

      if (!response.ok) {
        let message = "회원탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요.";
        try {
          const error = await response.json();
          message = String(error.detail || error.message || message);
        } catch {
          // Keep the generic message if the response body is not JSON.
        }
        throw new Error(message);
      }

      clearAuthStorage();
      router.replace("/login");
    } catch (error) {
      setWithdrawalMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "회원탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요."
      });
    } finally {
      setIsWithdrawing(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }

    if (deleteTarget.type === "tarot") {
      const readingId = deleteTarget.readingId;
      if (!readingId) {
        setTarotActionMessage({ tone: "error", text: "삭제할 기록 ID를 찾지 못했습니다." });
        setDeleteTarget(null);
        return;
      }

      setDeletingTarotReadingId(readingId);
      setTarotActionMessage(null);

      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/tarot/readings/${readingId}`, {
          method: "DELETE"
        });

        if (!response.ok) {
          try {
            const error = await response.json();
            console.error("타로 기록 삭제 실패:", error.detail || error.message || error);
          } catch {
            console.error("타로 기록 삭제 실패:", response.status, response.statusText);
          }
          throw new Error("Failed to delete tarot reading");
        }

        setSavedReadings((current) => current.filter((item) => item.reading_id !== readingId));
        await loadSavedReadings();
        setTarotActionMessage({ tone: "success", text: "타로 기록이 삭제되었습니다." });
        setDeleteTarget(null);
      } catch {
        setTarotActionMessage({ tone: "error", text: "타로 기록 삭제에 실패했습니다." });
      } finally {
        setDeletingTarotReadingId(null);
      }
      return;
    }

    if (deleteTarget.type === "record") {
      const recordId = deleteTarget.recordId;
      const recordDetail = deleteTarget.detail;
      if (!recordId) {
        setAssistantActionMessage({ tone: "error", text: "삭제할 기록 ID를 찾지 못했습니다." });
        setDeleteTarget(null);
        return;
      }

      setDeletingRecordId(recordId);
      setAssistantActionMessage(null);

      try {
        const response = await authenticatedFetch(
          `${API_BASE_URL}/records/${getRecordApiType(recordDetail)}/${encodeURIComponent(recordId)}`,
          {
            method: "DELETE"
          }
        );

        if (!response.ok) {
          throw new Error("Failed to delete assistant record");
        }

        setAssistantRecords((current) => {
          const targetRecord = current[recordDetail].find((item) => getRecordTimestamp(item) === recordId);
          const targetFileId = targetRecord?.file_id;

          if (!targetFileId) {
            return {
              ...current,
              [recordDetail]: current[recordDetail].filter((item) => getRecordTimestamp(item) !== recordId)
            };
          }

          return {
            ...current,
            summaries: current.summaries.filter((item) => item.file_id !== targetFileId),
            keywords: current.keywords.filter((item) => item.file_id !== targetFileId),
            questions: current.questions.filter((item) => item.file_id !== targetFileId)
          };
        });
        await loadAssistantRecords();
        setAssistantActionMessage({ tone: "success", text: "문서 및 관련 AI 기록이 삭제되었습니다." });
        setDeleteTarget(null);
      } catch {
        setAssistantActionMessage({ tone: "error", text: "기록 삭제에 실패했습니다. 잠시 후 다시 시도해주세요." });
      } finally {
        setDeletingRecordId(null);
      }
      return;
    }

    const fileId = deleteTarget.fileId;
    setDeletingFileId(fileId);
    setAssistantActionMessage(null);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/files/${fileId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Failed to delete uploaded file");
      }

      await loadAssistantRecords();
      setAssistantActionMessage({ tone: "success", text: "업로드 문서가 삭제되었습니다." });
      setDeleteTarget(null);
    } catch {
      setAssistantActionMessage({ tone: "error", text: "업로드 문서를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요." });
    } finally {
      setDeletingFileId(null);
    }
  }

  async function handleSaveEdit(primaryValue: string, memo: string) {
    if (!editTarget) {
      return;
    }

    setIsSavingEdit(true);
    setAssistantActionMessage(null);

    try {
      if (editTarget.type === "upload") {
        const fileId = editTarget.file.file_id;
        if (!fileId) {
          throw new Error("Missing file_id");
        }

        const response = await authenticatedFetch(`${API_BASE_URL}/files/${fileId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            display_name: primaryValue,
            memo
          })
        });

        if (!response.ok) {
          throw new Error("Failed to update file metadata");
        }
      } else {
        const recordId = getRecordTimestamp(editTarget.record);
        if (!recordId) {
          throw new Error("Missing record id");
        }

        const response = await authenticatedFetch(
          `${API_BASE_URL}/records/${getRecordApiType(editTarget.detail)}/${encodeURIComponent(recordId)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              display_title: primaryValue,
              memo
            })
          }
        );

        if (!response.ok) {
          throw new Error("Failed to update record metadata");
        }
      }

      await loadAssistantRecords();
      setAssistantActionMessage({ tone: "success", text: "표시 정보가 저장되었습니다." });
      setEditTarget(null);
    } catch {
      setAssistantActionMessage({ tone: "error", text: "표시 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요." });
    } finally {
      setIsSavingEdit(false);
    }
  }

  function handleTabChange(tab: MyPageTab) {
    setActiveTab(tab);
    setAssistantDetail(null);
  }

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F2EC] px-5 text-ink">
        <div className="rounded-3xl border border-black/10 bg-white px-6 py-5 text-center shadow-sm">
          <p className="text-base font-black text-neutral-800">내정보를 불러오는 중...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#F5F2EC] px-5 py-8 text-ink sm:px-8 lg:px-10">
        <Header />
        <section className="mx-auto mt-24 w-full max-w-xl rounded-3xl border border-black/10 bg-white p-6 text-center shadow-soft md:p-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-coral/10 text-coral">
            <UserRound size={28} />
          </div>
          <h1 className="text-2xl font-black text-ink sm:text-3xl">내정보는 로그인 후 확인할 수 있습니다.</h1>
          <p className="mt-4 text-sm font-bold leading-7 text-neutral-600 sm:text-base">
            로그인하고 계정 정보와 개인 서비스 이용 현황을 관리해보세요.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-full bg-coral px-6 text-sm font-black text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-red-500"
            >
              로그인하러 가기
            </Link>
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-6 text-sm font-black text-neutral-700 transition hover:-translate-y-0.5 hover:border-coral/40 hover:text-coral"
            >
              NoteFlow AI 홈
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F2EC] px-4 py-6 text-ink sm:px-6 lg:px-10">
      <Header />

      {paymentResult === "success" && (
        <div className="mx-auto mt-6 max-w-7xl rounded-2xl border border-[#E2C985]/70 bg-[#FFF8EE] p-4 text-sm font-bold text-[#7A551D]">
          결제가 완료되었습니다. Stripe Webhook 확인 후 크레딧이 반영됩니다.
        </div>
      )}
      {paymentResult === "cancel" && (
        <div className="mx-auto mt-6 max-w-7xl rounded-2xl border border-[#EAD8C1] bg-white/75 p-4 text-sm font-bold text-[#7A6245]">
          결제가 취소되었습니다. 크레딧은 반영되지 않았습니다.
        </div>
      )}

      <section className="mx-auto mt-8 grid max-w-7xl gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="rounded-2xl bg-gradient-to-br from-coral/12 to-red-100/50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-coral">Service Portal</p>
            <h1 className="mt-2 text-2xl font-black text-ink">내정보</h1>
            <p className="mt-2 truncate text-sm font-bold text-neutral-600">{user.name || "로그인됨"}</p>
          </div>

          <nav className="mt-4 grid gap-2" aria-label="내정보 메뉴">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabChange(item.id)}
                  className={[
                    "flex h-12 items-center gap-3 rounded-2xl px-4 text-left text-sm font-black transition",
                    isActive
                      ? "bg-coral text-white shadow-soft"
                      : "bg-neutral-50 text-neutral-700 hover:bg-red-50 hover:text-coral"
                  ].join(" ")}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-black/10 pt-4">
            <button
              type="button"
              onClick={() => setConfirmationModal("logout")}
              className="flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-black text-neutral-700 transition hover:bg-neutral-100 hover:text-coral"
            >
              <LogOut size={18} />
              로그아웃
            </button>
            <button
              type="button"
              onClick={() => {
                setWithdrawalMessage(null);
                setConfirmationModal("withdrawal");
              }}
              className="mt-2 flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-black text-red-600 transition hover:bg-red-50"
            >
              <Trash2 size={18} />
              회원탈퇴
            </button>
          </div>
        </aside>

        <section className="min-w-0">
          {activeTab === "assistant" && (
            <AssistantPanel
              activeDetail={assistantDetail}
              onOpenDetail={setAssistantDetail}
              onCloseDetail={() => setAssistantDetail(null)}
              records={assistantRecords}
              isLoading={isAssistantLoading}
              hasError={assistantError}
              actionMessage={assistantActionMessage}
              deletingFileId={deletingFileId}
              deletingRecordId={deletingRecordId}
              onRequestEdit={(target) => {
                setAssistantActionMessage(null);
                setEditTarget(target);
              }}
              onRequestDeleteUpload={(file) => {
                setAssistantActionMessage(null);
                setDeleteTarget({
                  type: "upload",
                  fileId: file.file_id,
                  title: file.filename || "업로드 문서"
                });
              }}
              onRequestDeleteRecord={(detail, record, title) => {
                const recordId = getRecordTimestamp(record);
                if (!recordId) {
                  setAssistantActionMessage({ tone: "error", text: "삭제할 기록 ID를 찾지 못했습니다." });
                  return;
                }

                setAssistantActionMessage(null);
                setDeleteTarget({
                  type: "record",
                  detail,
                  recordId,
                  title
                });
              }}
            />
          )}
          {activeTab === "tarot" && (
            <TarotPanel
              readings={savedReadings}
              isLoading={isLoadingReadings}
              hasError={readingsError}
              onRefresh={loadSavedReadings}
              activeFilter={tarotReadingFilter}
              onFilterChange={setTarotReadingFilter}
              actionMessage={tarotActionMessage}
              deletingReadingId={deletingTarotReadingId}
              onRequestDelete={(reading) => {
                if (!reading.reading_id) {
                  setTarotActionMessage({ tone: "error", text: "삭제할 기록 ID를 찾지 못했습니다." });
                  return;
                }

                setTarotActionMessage(null);
                setDeleteTarget({
                  type: "tarot",
                  readingId: reading.reading_id,
                  title: reading.category || "타로 기록"
                });
              }}
            />
          )}
          {activeTab === "profile" && <ProfilePanel user={user} />}
          {activeTab === "billing" && <BillingPanel user={user} />}
          {activeTab === "payments" && <PaymentsPanel />}
        </section>
      </section>

      {confirmationModal && (
        <ConfirmationModal
          type={confirmationModal}
          onCancel={() => setConfirmationModal(null)}
          onConfirm={confirmationModal === "logout" ? handleLogout : handleWithdrawal}
          isProcessing={confirmationModal === "withdrawal" ? isWithdrawing : false}
          message={confirmationModal === "withdrawal" ? withdrawalMessage : null}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmationModal
          target={deleteTarget}
          isDeleting={
            deleteTarget.type === "tarot"
              ? deletingTarotReadingId === deleteTarget.readingId
              : deleteTarget.type === "record"
              ? deletingRecordId === deleteTarget.recordId
              : deletingFileId === deleteTarget.fileId
          }
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void handleConfirmDelete()}
        />
      )}
      {editTarget && (
        <EditMetadataModal
          target={editTarget}
          isSaving={isSavingEdit}
          onCancel={() => setEditTarget(null)}
          onSave={(primaryValue, memo) => void handleSaveEdit(primaryValue, memo)}
        />
      )}
      <style>{`
        .tarot-archive-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #d6b94f #06180f;
        }

        .tarot-archive-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .tarot-archive-scrollbar::-webkit-scrollbar-track {
          background: #06180f;
          border-radius: 999px;
        }

        .tarot-archive-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #d6b94f 0%, #34d399 52%, #14532d 100%);
          border: 2px solid #06180f;
          border-radius: 999px;
        }

        .tarot-archive-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #fde68a 0%, #6ee7b7 52%, #166534 100%);
        }
      `}</style>
    </main>
  );
}

function Header() {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between gap-4">
      <Link
        href="/"
        className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-bold text-neutral-700 shadow-sm transition hover:border-coral/40 hover:text-coral"
      >
        <ArrowLeft size={16} />
        NoteFlow AI
      </Link>
      <div className="rounded-full bg-coral/10 px-4 py-2 text-sm font-extrabold text-coral">
        내정보
      </div>
    </header>
  );
}

function PanelHeader({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm md:p-7">
      <p className="text-xs font-black uppercase tracking-wide text-coral">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-black text-ink sm:text-4xl">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-neutral-600 sm:text-base">{description}</p>
    </div>
  );
}

function AssistantPanel({
  activeDetail,
  onOpenDetail,
  onCloseDetail,
  records,
  isLoading,
  hasError,
  actionMessage,
  deletingFileId,
  deletingRecordId,
  onRequestEdit,
  onRequestDeleteUpload,
  onRequestDeleteRecord
}: {
  activeDetail: AssistantDetailType | null;
  onOpenDetail: (detail: AssistantDetailType) => void;
  onCloseDetail: () => void;
  records: AssistantRecords;
  isLoading: boolean;
  hasError: boolean;
  actionMessage: ActionMessage;
  deletingFileId: string | null;
  deletingRecordId: string | null;
  onRequestEdit: (target: Exclude<EditTarget, null>) => void;
  onRequestDeleteUpload: (file: UploadedDocument) => void;
  onRequestDeleteRecord: (
    detail: Exclude<AssistantDetailType, "uploads">,
    record: SummaryRecord | KeywordRecord | QuestionRecord,
    title: string
  ) => void;
}) {
  if (activeDetail) {
    return (
      <AssistantDetailPanel
        detail={activeDetail}
        onBack={onCloseDetail}
        records={records}
        isLoading={isLoading}
        hasError={hasError}
        actionMessage={actionMessage}
        deletingFileId={deletingFileId}
        deletingRecordId={deletingRecordId}
        onRequestEdit={onRequestEdit}
        onRequestDeleteUpload={onRequestDeleteUpload}
        onRequestDeleteRecord={onRequestDeleteRecord}
      />
    );
  }

  return (
    <div className="space-y-5">
      <PanelHeader
        eyebrow="AI Document Assistant"
        title="AI 문서 어시스턴트"
        description="NoteFlow AI의 핵심 기능인 문서 업로드, 요약, 키워드, 질문 기록을 관리하는 공간입니다."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {assistantStats.map((stat) => (
          <article key={stat.label} className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coral/10 text-coral">
              {stat.icon}
            </div>
            <p className="mt-5 text-sm font-black text-neutral-500">{stat.label}</p>
            <strong className="mt-2 block text-4xl font-black text-ink">
              {isLoading ? "..." : records[stat.id].length}
            </strong>
            <p className="mt-2 text-sm font-bold text-neutral-500">{stat.description}</p>
            <button
              type="button"
              onClick={() => onOpenDetail(stat.id)}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-xs font-black text-neutral-700 transition hover:border-coral/40 hover:text-coral"
            >
              자세히 보기
            </button>
          </article>
        ))}
      </div>

      <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-2xl font-black text-ink">문서 분석 작업을 계속하세요</h3>
            <p className="mt-2 text-sm font-bold leading-7 text-neutral-600">
              실제 문서 업로드와 분석 기록은 AI 어시스턴트 화면에서 확인할 수 있습니다.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-full bg-coral px-6 text-sm font-black text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-red-500"
          >
            AI 어시스턴트로 이동
          </Link>
        </div>
      </section>
    </div>
  );
}

function AssistantDetailPanel({
  detail,
  onBack,
  records,
  isLoading,
  hasError,
  actionMessage,
  deletingFileId,
  deletingRecordId,
  onRequestEdit,
  onRequestDeleteUpload,
  onRequestDeleteRecord
}: {
  detail: AssistantDetailType;
  onBack: () => void;
  records: AssistantRecords;
  isLoading: boolean;
  hasError: boolean;
  actionMessage: ActionMessage;
  deletingFileId: string | null;
  deletingRecordId: string | null;
  onRequestEdit: (target: Exclude<EditTarget, null>) => void;
  onRequestDeleteUpload: (file: UploadedDocument) => void;
  onRequestDeleteRecord: (
    detail: Exclude<AssistantDetailType, "uploads">,
    record: SummaryRecord | KeywordRecord | QuestionRecord,
    title: string
  ) => void;
}) {
  const detailRecords = records[detail];

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm md:p-7">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-black text-neutral-700 transition hover:border-coral/40 hover:text-coral"
        >
          <ArrowLeft size={16} />
          뒤로가기
        </button>
        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-coral">Assistant Detail</p>
            <h2 className="mt-2 text-3xl font-black text-ink sm:text-4xl">{assistantDetailTitles[detail]}</h2>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-neutral-600">
              실제 저장된 기록을 최신순으로 표시합니다.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-full bg-coral px-6 text-sm font-black text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-red-500"
          >
            AI 문서 어시스턴트로 바로가기
          </Link>
        </div>
      </section>

      {actionMessage && (
        <StateMessage
          text={actionMessage.text}
          tone={actionMessage.tone === "error" ? "warning" : "success"}
        />
      )}

      <div className="grid gap-4">
        {isLoading ? (
          <StateMessage text="기록을 불러오는 중입니다..." />
        ) : hasError ? (
          <StateMessage text="기록을 불러오지 못했습니다." tone="warning" />
        ) : detailRecords.length === 0 ? (
          <StateMessage text="아직 저장된 기록이 없습니다." />
        ) : (
          detailRecords.map((record, index) => (
            <AssistantRecordCard
              key={`${detail}-${getRecordTimestamp(record) || index}`}
              detail={detail}
              record={record}
              deletingFileId={deletingFileId}
              deletingRecordId={deletingRecordId}
              onRequestEdit={onRequestEdit}
              onRequestDeleteUpload={onRequestDeleteUpload}
              onRequestDeleteRecord={onRequestDeleteRecord}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AssistantRecordCard({
  detail,
  record,
  deletingFileId,
  deletingRecordId,
  onRequestEdit,
  onRequestDeleteUpload,
  onRequestDeleteRecord
}: {
  detail: AssistantDetailType;
  record: UploadedDocument | SummaryRecord | KeywordRecord | QuestionRecord;
  deletingFileId: string | null;
  deletingRecordId: string | null;
  onRequestEdit: (target: Exclude<EditTarget, null>) => void;
  onRequestDeleteUpload: (file: UploadedDocument) => void;
  onRequestDeleteRecord: (
    detail: Exclude<AssistantDetailType, "uploads">,
    record: SummaryRecord | KeywordRecord | QuestionRecord,
    title: string
  ) => void;
}) {
  let title = "기록";
  let meta = formatRecordDate(record);
  let description = "";
  let extra: ReactNode = null;

  if (detail === "uploads") {
    const item = record as UploadedDocument;
    title = item.display_name?.trim() || item.filename || "파일명 없음";
    meta = `업로드 날짜: ${formatRecordDate(item)}`;
    description = `원본 파일: ${item.filename || "-"}\nfile_id: ${item.file_id || "-"} · chunks: ${item.chunk_count ?? "-"} · chars: ${item.text_length ?? "-"}`;
    if (item.memo?.trim()) {
      extra = (
        <p className="mt-3 rounded-2xl border border-black/10 bg-neutral-50 p-3 text-sm font-bold leading-6 text-neutral-600">
          메모: {item.memo.trim()}
        </p>
      );
    }
  }

  const uploadRecord = detail === "uploads" ? (record as UploadedDocument) : null;
  const isDeletingUpload = Boolean(uploadRecord?.file_id && deletingFileId === uploadRecord.file_id);
  const recordId = uploadRecord ? "" : getRecordTimestamp(record);
  const isDeletingRecord = Boolean(recordId && deletingRecordId === recordId);

  if (detail === "summaries") {
    const item = record as SummaryRecord;
    title = item.display_title?.trim() || item.filename || "파일명 없음";
    meta = `${item.summary_type || "요약"} · ${formatRecordDate(item)}`;
    description = previewText(item.summary, "요약 내용 없음");
    if (item.memo?.trim()) {
      extra = (
        <p className="mt-3 rounded-2xl border border-black/10 bg-neutral-50 p-3 text-sm font-bold leading-6 text-neutral-600">
          메모: {item.memo.trim()}
        </p>
      );
    }
  }

  if (detail === "keywords") {
    const item = record as KeywordRecord;
    title = item.display_title?.trim() || item.filename || "파일명 없음";
    meta = `${item.scope || "전체 문서"} · ${formatRecordDate(item)}`;
    description = item.keywords?.length ? "추출된 키워드" : "키워드 없음";
    extra = (
      <>
        {item.keywords?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.keywords.map((keyword) => (
              <span key={`${getRecordTimestamp(item)}-${keyword}`} className="rounded-full bg-coral/10 px-3 py-1 text-xs font-black text-coral">
                {keyword}
              </span>
            ))}
          </div>
        ) : null}
        {item.memo?.trim() && (
          <p className="mt-3 rounded-2xl border border-black/10 bg-neutral-50 p-3 text-sm font-bold leading-6 text-neutral-600">
            메모: {item.memo.trim()}
          </p>
        )}
      </>
    );
  }

  if (detail === "questions") {
    const item = record as QuestionRecord;
    title = item.display_title?.trim() || item.filename || "파일명 없음";
    meta = formatRecordDate(item);
    description = `질문: ${item.question || "질문 없음"}\n답변: ${previewText(item.answer, "답변 없음")}`;
    if (item.memo?.trim()) {
      extra = (
        <p className="mt-3 rounded-2xl border border-black/10 bg-neutral-50 p-3 text-sm font-bold leading-6 text-neutral-600">
          메모: {item.memo.trim()}
        </p>
      );
    }
  }

  return (
    <article className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black text-coral">{meta}</p>
          <h3 className="mt-2 truncate text-xl font-black text-ink">{title}</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-7 text-neutral-600">{description}</p>
          {extra}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => {
              if (uploadRecord) {
                onRequestEdit({ type: "upload", file: uploadRecord });
                return;
              }

              onRequestEdit({
                type: "record",
                detail: detail as Exclude<AssistantDetailType, "uploads">,
                record: record as SummaryRecord | KeywordRecord | QuestionRecord
              });
            }}
            className="inline-flex h-9 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-xs font-black text-neutral-700 transition hover:-translate-y-0.5 hover:border-coral/40 hover:text-coral"
          >
            수정
          </button>
          <button
            type="button"
            disabled={uploadRecord ? !uploadRecord.file_id || isDeletingUpload : !recordId || isDeletingRecord}
            onClick={() => {
              if (uploadRecord?.file_id) {
                onRequestDeleteUpload(uploadRecord);
                return;
              }

              if (recordId) {
                onRequestDeleteRecord(
                  detail as Exclude<AssistantDetailType, "uploads">,
                  record as SummaryRecord | KeywordRecord | QuestionRecord,
                  title
                );
              }
            }}
            className={[
              "inline-flex h-9 items-center justify-center rounded-full border px-4 text-xs font-black transition",
              uploadRecord?.file_id || recordId
                ? "border-red-200 bg-red-50 text-red-600 hover:-translate-y-0.5 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                : "cursor-not-allowed border-black/10 bg-neutral-100 text-neutral-400"
            ].join(" ")}
          >
            {uploadRecord
              ? isDeletingUpload
                ? "삭제 중..."
                : "삭제"
              : isDeletingRecord
              ? "삭제 중..."
              : "전체 기록 삭제"}
          </button>
        </div>
      </div>
    </article>
  );
}

function TarotPanel({
  readings,
  isLoading,
  hasError,
  onRefresh,
  activeFilter,
  onFilterChange,
  actionMessage,
  deletingReadingId,
  onRequestDelete
}: {
  readings: SavedTarotReading[];
  isLoading: boolean;
  hasError: boolean;
  onRefresh: () => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  actionMessage: ActionMessage;
  deletingReadingId: string | null;
  onRequestDelete: (reading: SavedTarotReading) => void;
}) {
  const filteredReadings = readings.filter((reading) => {
    if (activeFilter === "전체") {
      return true;
    }

    if (activeFilter === "취업/진로") {
      return reading.category === "취업/진로" || reading.category === "취업/진로운";
    }

    if (activeFilter === "자유질문") {
      return reading.category === "자유질문" || reading.category === "자유 질문";
    }

    return reading.category === activeFilter;
  });

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#020805] p-5 text-emerald-50 shadow-[0_24px_70px_rgba(0,0,0,0.25)] md:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(52,211,153,0.22),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(250,204,21,0.16),transparent_22%),linear-gradient(135deg,#020805_0%,#062116_46%,#010403_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.75)_1px,transparent_1.5px),radial-gradient(circle_at_72%_22%,rgba(187,247,208,0.75)_1px,transparent_1.5px),radial-gradient(circle_at_48%_70%,rgba(250,204,21,0.55)_1px,transparent_1.5px)] [background-size:120px_120px,180px_180px,150px_150px]" />

      <div className="relative z-10 space-y-5">
        <section className="rounded-3xl border border-emerald-200/15 bg-black/25 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.32)] backdrop-blur md:p-7">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-sm font-bold text-emerald-100">
            <Sparkles size={16} />
            Sub Service
          </p>
          <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-black text-white sm:text-4xl">AI 타로</h2>
              <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-emerald-50/78 sm:text-base">
                저장된 타로 리딩을 가볍게 확인하는 부가 서비스 공간입니다.
              </p>
            </div>
            <Link
              href="/tarot"
              className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-300 px-6 text-sm font-black text-[#042015] shadow-[0_0_28px_rgba(52,211,153,0.28)] transition hover:-translate-y-0.5 hover:bg-emerald-200"
            >
              AI 타로로 이동
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-yellow-300/20 bg-yellow-300/10 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-yellow-100">Tarot Archive</p>
            <h3 className="mt-2 text-2xl font-black text-white">저장된 타로 기록</h3>
          </div>
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center rounded-full border border-yellow-300/45 bg-yellow-300/10 px-4 text-xs font-black text-yellow-100 transition hover:-translate-y-0.5 hover:bg-yellow-300/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            새로고침
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {tarotReadingFilters.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => onFilterChange(filter)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-black transition hover:-translate-y-0.5",
                  isActive
                    ? "border-yellow-300/70 bg-yellow-300/15 text-yellow-100 shadow-[0_0_18px_rgba(250,204,21,0.18)]"
                    : "border-emerald-200/15 bg-black/20 text-emerald-100/78 hover:border-emerald-200/35"
                ].join(" ")}
              >
                {filter}
              </button>
            );
          })}
        </div>

        {actionMessage && (
          <div className="mt-4">
            <TarotStateMessage
              text={actionMessage.text}
              tone={actionMessage.tone === "error" ? "warning" : "success"}
            />
          </div>
        )}

        <div className="tarot-archive-scrollbar mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
          {isLoading ? (
            <TarotStateMessage text="저장된 타로 기록을 불러오는 중..." />
          ) : hasError ? (
            <TarotStateMessage text="저장된 타로 기록을 불러오지 못했습니다." tone="warning" />
          ) : readings.length === 0 ? (
            <TarotStateMessage text="아직 저장된 타로 기록이 없습니다." />
          ) : filteredReadings.length === 0 ? (
            <TarotStateMessage text="해당 카테고리의 저장된 타로 기록이 없습니다." />
          ) : (
            filteredReadings.map((reading, index) => (
              <article key={reading.reading_id || `${reading.created_at}-${index}`} className="rounded-2xl border border-emerald-200/15 bg-black/28 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-100/65">
                      <CalendarDays size={14} />
                      {formatSavedReadingDate(reading.created_at)}
                    </p>
                    <h4 className="mt-1.5 truncate text-lg font-black text-yellow-100">{reading.category}</h4>
                    <p className="mt-2 truncate text-sm font-bold text-emerald-100/78">
                      질문: {reading.question || "특정 질문 없음"}
                    </p>
                    <p className="mt-1 truncate text-xs font-bold leading-5 text-emerald-50/80">
                      {reading.cards.map((card) => `${card.position} ${card.name}`).join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                    <Link
                      href="/tarot"
                      className="inline-flex h-9 items-center justify-center rounded-full bg-emerald-300 px-4 text-xs font-black text-[#042015] transition hover:-translate-y-0.5 hover:bg-emerald-200"
                    >
                      다시 보기
                    </Link>
                    <button
                      type="button"
                      onClick={() => onRequestDelete(reading)}
                      disabled={!reading.reading_id || deletingReadingId === reading.reading_id}
                      className="inline-flex h-9 items-center justify-center rounded-full border border-yellow-300/35 bg-yellow-300/10 px-4 text-xs font-black text-yellow-100 transition hover:-translate-y-0.5 hover:border-yellow-200 hover:bg-yellow-300/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingReadingId === reading.reading_id ? "삭제 중..." : "삭제"}
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
      </div>
    </div>
  );
}

function ProfilePanel({ user }: { user: AuthUser }) {
  return (
    <div className="space-y-5">
      <PanelHeader
        eyebrow="Profile"
        title="내정보 관리"
        description="로그인된 계정 정보를 기준으로 표시합니다."
      />
      <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <InfoTile label="이름" value={user.name || "로그인됨"} icon={<UserRound size={18} />} />
          <InfoTile label="이메일" value={user.email || "이메일 없음"} icon={<Sparkles size={18} />} />
          <InfoTile label="등급" value={getPlanLabel(user.plan)} icon={<Shield size={18} />} />
          <InfoTile label="권한" value={getRoleLabel(user.role)} icon={<UserRound size={18} />} />
        </div>
      </section>
    </div>
  );
}

function BillingPanel({ user }: { user: AuthUser }) {
  const searchParams = useSearchParams();
  const [credits, setCredits] = useState(0);
  const [products, setProducts] = useState<CreditProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreparingProductId, setIsPreparingProductId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [preparedPayment, setPreparedPayment] = useState<PreparedPayment | null>(null);
  const paymentResult = searchParams.get("payment");
  const isPaymentEnabled = user.role === "admin";

  useEffect(() => {
    let isMounted = true;

    async function loadBillingData() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [creditsResponse, productsResponse] = await Promise.all([
          authenticatedFetch(`${API_BASE_URL}/credits/me`),
          authenticatedFetch(`${API_BASE_URL}/payments/products`)
        ]);

        if (!creditsResponse.ok || !productsResponse.ok) {
          throw new Error("결제 정보를 불러오지 못했습니다.");
        }

        const creditsData = (await creditsResponse.json()) as { credits?: number; user?: { credits?: number } };
        const productsData = (await productsResponse.json()) as CreditProduct[];

        if (!isMounted) {
          return;
        }

        setCredits(Number(creditsData.credits ?? creditsData.user?.credits ?? 0));
        setProducts(Array.isArray(productsData) ? productsData : []);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "결제 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadBillingData();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleCheckoutPayment(productId: string) {
    if (!isPaymentEnabled) {
      setErrorMessage("결제 기능은 준비 중입니다.");
      return;
    }

    setIsPreparingProductId(productId);
    setPreparedPayment(null);
    setErrorMessage("");

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/payments/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ product_id: productId })
      });

      if (!response.ok) {
        throw new Error("결제 준비에 실패했습니다.");
      }

      const data = (await response.json()) as PreparedPayment;
      setPreparedPayment(data);

      if (data.provider === "stripe" && data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }

      if (data.provider !== "mock") {
        throw new Error("지원하지 않는 결제 provider입니다.");
      }

      const successResponse = await authenticatedFetch(`${API_BASE_URL}/payments/mock/success`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ payment_id: data.payment_id })
      });

      if (!successResponse.ok) {
        throw new Error("Mock 결제 성공 처리에 실패했습니다.");
      }

      const successData = (await successResponse.json()) as MockPaymentSuccessResponse;
      const paidPayment = successData.payment ?? data;
      setPreparedPayment(paidPayment);

      if (successData.credit_usage?.credits_after !== undefined && successData.credit_usage.credits_after !== null) {
        setCredits(Number(successData.credit_usage.credits_after));
      } else {
        const creditsResponse = await authenticatedFetch(`${API_BASE_URL}/credits/me`);
        if (creditsResponse.ok) {
          const creditsData = (await creditsResponse.json()) as { credits?: number; user?: { credits?: number } };
          setCredits(Number(creditsData.credits ?? creditsData.user?.credits ?? credits));
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "결제 준비에 실패했습니다.");
    } finally {
      setIsPreparingProductId(null);
    }
  }

  return (
    <div className="space-y-5">
      <PanelHeader
        eyebrow="Billing"
        title="결제 정보"
        description="AI 어시스턴트와 AI 타로에서 사용할 크레딧을 USD 기준으로 충전합니다."
      />

      <section className="rounded-3xl border border-[#E9D8BD] bg-[#FFFDF7] p-5 shadow-[0_18px_45px_rgba(124,82,27,0.08)] md:p-6">
        <div className="rounded-3xl border border-[#E9D8C1] bg-[linear-gradient(135deg,#FFFDF8_0%,#FFF8EE_100%)] p-5 shadow-[0_14px_34px_rgba(124,82,27,0.08)] md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#8A6A35]">Current Balance</p>
              <h3 className="mt-2 text-5xl font-black text-[#2F2418] sm:text-6xl">
                {credits.toLocaleString("en-US")}
                <span className="ml-2 text-2xl text-[#8A6A35] sm:text-3xl">Credits</span>
              </h3>
              <p className="mt-3 text-sm font-bold leading-6 text-[#6F5A40]">
                Available for AI Assistant & AI Tarot
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E2C985]/70 bg-white/70 px-4 py-2 text-sm font-black text-[#7A551D]">
              <CreditCard size={16} />
              Ready for USD payment
            </div>
          </div>
        </div>
        {paymentResult === "success" && (
          <div className="mt-4 rounded-2xl border border-[#E2C985]/70 bg-[#FFF8EE] p-4 text-sm font-bold text-[#7A551D]">
            결제가 완료되었습니다. 결제 확인 후 크레딧이 반영됩니다.
          </div>
        )}
        {paymentResult === "cancel" && (
          <div className="mt-4 rounded-2xl border border-[#EAD8C1] bg-white/75 p-4 text-sm font-bold text-[#7A6245]">
            결제가 취소되었습니다. 크레딧은 아직 반영되지 않았습니다.
          </div>
        )}
        {errorMessage && (
          <div className="mt-4">
            <StateMessage text={errorMessage} tone="warning" />
          </div>
        )}

        {preparedPayment && (
          <div className="mt-4 rounded-3xl border border-[#E8C77A]/55 bg-[#FFF8EE] p-5">
            <p className="text-sm font-black text-[#8A5A14]">
              결제 준비가 완료되었습니다. 실제 결제 연동은 다음 단계에서 진행됩니다.
            </p>
            <div className="mt-4 grid gap-3 text-sm font-bold text-neutral-700 sm:grid-cols-2 lg:grid-cols-5">
              <span>payment_id: {preparedPayment.payment_id}</span>
              <span>상품명: {preparedPayment.product_name}</span>
              <span>금액: {formatPaymentAmount(preparedPayment.amount, preparedPayment.currency)}</span>
              <span>Base: {formatCreditCount(getCreditBreakdown(preparedPayment).baseCredits)}</span>
              <span>Bonus: {formatCreditCount(getCreditBreakdown(preparedPayment).bonusCredits)}</span>
              <span>크레딧: {formatCreditCount(preparedPayment.credits)}</span>
              <span>상태: {preparedPayment.status}</span>
            </div>
            {preparedPayment.provider === "mock" && (
              <p className="mt-3 text-xs font-bold text-[#8A5A14]/80">
                Mock 결제가 완료되어 크레딧이 즉시 반영되었습니다.
              </p>
            )}
            {preparedPayment.provider !== "mock" && !preparedPayment.checkout_url && (
              <p className="mt-3 text-xs font-bold text-[#8A5A14]/80">
                checkout_url이 아직 생성되지 않아 Stripe Checkout 이동은 진행하지 않습니다.
              </p>
            )}
          </div>
        )}

        <div className="mt-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#A66A1F]">Credit Products</p>
              <h3 className="mt-1 text-2xl font-black text-ink">크레딧 충전 상품</h3>
            </div>
          </div>

          {!isPaymentEnabled && (
            <div className="mt-4 rounded-2xl border border-[#E8C77A]/60 bg-[#FFF8EE] p-4 text-sm font-bold leading-6 text-[#7A551D]">
              <p className="text-base font-black">🚧 결제 기능 준비 중</p>
              <p className="mt-2">현재 결제 시스템을 개발 및 테스트 중입니다.</p>
              <p>정식 서비스 오픈 후 이용 가능합니다.</p>
            </div>
          )}

          {isLoading ? (
            <div className="mt-4">
              <StateMessage text="크레딧 상품을 불러오는 중입니다." />
            </div>
          ) : products.length === 0 ? (
            <div className="mt-4">
              <StateMessage text="표시할 크레딧 상품이 없습니다." />
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              {products.map((product) => {
                const { baseCredits, bonusCredits, credits: totalCredits } = getCreditBreakdown(product);
                const extraPercent = getExtraPercent(baseCredits, bonusCredits);
                const featuredLabel = getFeaturedLabel(product.product_id, product.badge);
                const isUltimate = product.product_id === "credit_2200";
                const tone = getCreditProductTone(product.product_id);

                return (
                  <article
                    key={product.product_id}
                    className={[
                      "rounded-2xl border p-5 transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(124,82,27,0.13)]",
                      tone.card,
                      isUltimate ? "md:col-span-2 xl:col-span-6" : "xl:col-span-2"
                    ].join(" ")}
                  >
                    <div className="flex h-full flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <span className={["inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide", tone.badge].join(" ")}>
                          {tone.badgePrefix}{featuredLabel || "Standard"}
                        </span>
                        <span className="text-xs font-bold text-[#8A7354]">{product.currency}</span>
                      </div>

                      <h4 className="mt-4 text-xl font-black text-[#2F2418]">{product.name}</h4>

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-[#8A7354]">Pay</p>
                          <p className={["mt-1 text-3xl font-black", tone.amount].join(" ")}>
                            {formatPaymentAmount(product.price, product.currency)}
                            <span className="ml-2 text-sm font-bold text-[#8A7354]">USD</span>
                          </p>
                        </div>
                        <div>
                          <p className={['text-xs font-black uppercase tracking-wide', tone.accent].join(' ')}>Receive</p>
                          <p className={["mt-1 text-3xl font-black", tone.accent].join(" ")}>
                            {formatCreditCount(totalCredits)}
                            <span className="ml-2 text-sm font-bold text-[#8A7354]">Credits</span>
                          </p>
                        </div>
                      </div>

                      <div className={["mt-5 rounded-2xl border p-4", tone.panel].join(" ")}>
                        <p className="text-xs font-black uppercase tracking-wide text-[#8A7354]">Breakdown</p>
                        <div className="mt-3 grid gap-3 text-sm font-bold text-[#5F4B32] sm:grid-cols-2">
                          <div>
                            <span className="block text-xs font-black uppercase tracking-wide text-[#8A7354]">Base Credits</span>
                            {formatCreditCount(baseCredits)} Base
                          </div>
                          <div>
                            <span className="block text-xs font-black uppercase tracking-wide text-[#8A7354]">Bonus Credits</span>
                            {bonusCredits > 0 ? `+${formatCreditCount(bonusCredits)} Bonus` : "기본 충전"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <span className={["inline-flex rounded-full border px-3 py-1.5 text-xs font-black", tone.extra].join(" ")}>
                          {bonusCredits > 0 ? `${extraPercent}% Extra` : "No Bonus / Standard Charge"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleCheckoutPayment(product.product_id)}
                        disabled={!isPaymentEnabled || isPreparingProductId === product.product_id}
                        className={[
                          "mt-5 inline-flex h-12 w-full items-center justify-center rounded-full px-5 text-sm font-black text-[#34220F] shadow-[0_10px_22px_rgba(124,82,27,0.13)] transition hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_14px_28px_rgba(124,82,27,0.16)] disabled:cursor-not-allowed disabled:opacity-50",
                          tone.button
                        ].join(" ")}
                      >
                        {isPreparingProductId === product.product_id ? "준비 중..." : "Charge Credits"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PaymentsPanel() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPayments() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/payments/history`);
        if (!response.ok) {
          throw new Error("결제 내역을 불러오지 못했습니다.");
        }

        const data = (await response.json()) as PaymentRecord[];
        if (isMounted) {
          setPayments(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "결제 내역을 불러오지 못했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPayments();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-5">
      <PanelHeader
        eyebrow="Payment History"
        title="결제 내역"
        description="크레딧 충전을 위해 준비된 결제 내역을 최신순으로 확인합니다."
      />
      <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm md:p-6">
        {errorMessage ? (
          <StateMessage text={errorMessage} tone="warning" />
        ) : isLoading ? (
          <StateMessage text="결제 내역을 불러오는 중입니다." />
        ) : payments.length === 0 ? (
          <StateMessage text="아직 결제 내역이 없습니다." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {payments.map((payment) => {
              const { baseCredits, bonusCredits, credits: totalCredits } = getCreditBreakdown(payment);

              return (
                <article key={payment.payment_id} className="rounded-2xl border border-black/10 bg-neutral-50 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-xs font-black text-coral">
                        <CalendarDays size={14} />
                        {formatSavedReadingDate(payment.created_at)}
                      </p>
                      <h3 className="mt-2 truncate text-xl font-black text-ink">{payment.product_name}</h3>
                    </div>
                    <span className="w-fit rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-black uppercase text-neutral-700">
                      {payment.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm font-bold text-neutral-700 sm:grid-cols-2">
                    <span>Amount: {formatPaymentAmount(payment.amount, payment.currency)} {payment.currency}</span>
                    <span>{formatCreditCount(baseCredits)} 기본 + {formatCreditCount(bonusCredits)} 보너스 = {formatCreditCount(totalCredits)} Credits</span>
                    <span>provider: {payment.provider}</span>
                    <span>payment_id: {payment.payment_id}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoTile({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <article className="min-w-0 rounded-2xl border border-black/10 bg-neutral-50 p-4">
      <p className="flex items-center gap-2 text-xs font-black text-coral">
        {icon}
        {label}
      </p>
      <strong className="mt-2 block truncate text-lg font-black text-ink">{value}</strong>
    </article>
  );
}

function ConfirmationModal({
  type,
  onCancel,
  onConfirm,
  isProcessing = false,
  message = null
}: {
  type: Exclude<ConfirmationModalType, null>;
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
  message?: ActionMessage;
}) {
  const isLogout = type === "logout";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 text-center shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-coral/10 text-coral">
          {isLogout ? <LogOut size={26} /> : <Trash2 size={26} />}
        </div>
        <h2 className="mt-5 whitespace-pre-line text-2xl font-black text-ink">
          {isLogout ? "로그아웃하시겠습니까?" : "회원탈퇴를 진행하시겠습니까?"}
        </h2>
        <p className="mt-3 text-sm font-bold leading-7 text-neutral-600">
          {isLogout
            ? "현재 계정에서 로그아웃됩니다."
            : "계정, 문서, 질문 기록, 요약 기록, 키워드 기록, 타로 기록이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다."}
        </p>
        {message && (
          <p
            className={[
              "mt-4 rounded-2xl border p-3 text-sm font-bold",
              message.tone === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            ].join(" ")}
          >
            {message.text}
          </p>
        )}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white text-sm font-black text-neutral-700 transition hover:border-coral/40 hover:text-coral disabled:cursor-not-allowed disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={[
              "inline-flex h-11 items-center justify-center rounded-full text-sm font-black text-white shadow-soft transition disabled:cursor-not-allowed disabled:opacity-50",
              isLogout ? "bg-coral hover:bg-red-500" : "bg-red-600 hover:bg-red-500"
            ].join(" ")}
          >
            {isProcessing ? "처리 중..." : isLogout ? "로그아웃" : "탈퇴하기"}
          </button>
        </div>
      </section>
    </div>
  );
}

function EditMetadataModal({
  target,
  isSaving,
  onCancel,
  onSave
}: {
  target: Exclude<EditTarget, null>;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (primaryValue: string, memo: string) => void;
}) {
  const isUpload = target.type === "upload";
  const initialPrimaryValue = isUpload
    ? target.file.display_name || target.file.filename || ""
    : target.record.display_title || target.record.filename || "";
  const initialMemo = isUpload ? target.file.memo || "" : target.record.memo || "";
  const [primaryValue, setPrimaryValue] = useState(initialPrimaryValue);
  const [memo, setMemo] = useState(initialMemo);

  useEffect(() => {
    setPrimaryValue(initialPrimaryValue);
    setMemo(initialMemo);
  }, [initialPrimaryValue, initialMemo]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <section className="w-full max-w-lg rounded-3xl border border-black/10 bg-white p-6 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-coral/10 text-coral">
          <FileText size={26} />
        </div>
        <div className="mt-5 text-center">
          <h2 className="text-2xl font-black text-ink">표시 정보 수정</h2>
          <p className="mt-3 text-sm font-bold leading-7 text-neutral-600">
            원본 문서와 AI 결과 내용은 수정하지 않고, 내정보 페이지에서 보이는 관리용 정보만 저장합니다.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="block">
            <span className="text-xs font-black text-coral">{isUpload ? "표시 이름" : "표시 제목"}</span>
            <input
              value={primaryValue}
              onChange={(event) => setPrimaryValue(event.target.value)}
              maxLength={isUpload ? 120 : 160}
              className="mt-2 h-11 w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 text-sm font-bold text-ink outline-none transition focus:border-coral/50 focus:bg-white"
              placeholder={isUpload ? "표시 이름을 입력하세요." : "표시 제목을 입력하세요."}
            />
          </label>

          <label className="block">
            <span className="text-xs font-black text-coral">메모</span>
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              maxLength={1000}
              rows={5}
              className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm font-bold leading-6 text-ink outline-none transition focus:border-coral/50 focus:bg-white"
              placeholder="관리용 메모를 입력하세요."
            />
          </label>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white text-sm font-black text-neutral-700 transition hover:border-coral/40 hover:text-coral disabled:cursor-not-allowed disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onSave(primaryValue.trim(), memo.trim())}
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center rounded-full bg-coral text-sm font-black text-white shadow-soft transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </section>
    </div>
  );
}

function DeleteConfirmationModal({
  target,
  isDeleting,
  onCancel,
  onConfirm
}: {
  target: Exclude<DeleteTarget, null>;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isTarotDelete = target.type === "tarot";
  const isRecordDelete = target.type === "record";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 text-center shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <Trash2 size={26} />
        </div>
        <h2 className="mt-5 whitespace-pre-line text-2xl font-black text-ink">
          {isTarotDelete
            ? "타로 기록을 삭제하시겠습니까?"
            : isRecordDelete
            ? "이 문서와 연결된 요약, 키워드, 질문 기록이 모두 삭제됩니다.\n\n계속하시겠습니까?"
            : "업로드 문서를 삭제하시겠습니까?"}
        </h2>
        <p className="mt-3 text-sm font-bold leading-7 text-neutral-600">
          {isRecordDelete
            ? "이 기록은 내정보 페이지에서 삭제되며 되돌릴 수 없습니다."
            : `${target.title} 항목이 삭제됩니다. 삭제 후에는 목록을 다시 불러옵니다.`}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white text-sm font-black text-neutral-700 transition hover:border-coral/40 hover:text-coral disabled:cursor-not-allowed disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex h-11 items-center justify-center rounded-full bg-red-600 text-sm font-black text-white shadow-soft transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </section>
    </div>
  );
}

function TarotStateMessage({ text, tone = "default" }: { text: string; tone?: "default" | "warning" | "success" }) {
  return (
    <p
      className={[
        "rounded-2xl border p-4 text-sm font-bold",
        tone === "success"
          ? "border-emerald-200/20 bg-emerald-300/10 text-emerald-100"
          : tone === "warning"
          ? "border-yellow-300/20 bg-yellow-300/10 text-yellow-100"
          : "border-emerald-200/15 bg-black/20 text-emerald-100/78"
      ].join(" ")}
    >
      {text}
    </p>
  );
}

function StateMessage({ text, tone = "default" }: { text: string; tone?: "default" | "warning" | "success" }) {
  return (
    <p
      className={[
        "rounded-2xl border p-4 text-sm font-bold",
        tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : tone === "warning"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-black/10 bg-neutral-50 text-neutral-600"
      ].join(" ")}
    >
      {text}
    </p>
  );
}
