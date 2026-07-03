"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Edit3,
  HelpCircle,
  MessageSquareText,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";

type ReviewType = "review" | "question";
type ReviewStatus = "open" | "answered" | "hidden";
type ReviewFilter = "all" | "review" | "question" | "answered";
type ReviewSort = "latest" | "rating" | "answered";

type AuthUser = {
  user_id?: string;
  email?: string;
  name?: string;
  role?: string;
  plan?: string;
};

type ReviewItem = {
  review_id: string;
  user_id?: string;
  user_email?: string;
  display_name: string;
  type: ReviewType;
  rating?: number | null;
  title: string;
  content: string;
  answer?: string;
  answer_by?: string;
  answer_at?: string | null;
  status: ReviewStatus;
  created_at: string;
  updated_at?: string;
  can_edit?: boolean;
  can_answer?: boolean;
};

type ReviewStats = {
  review_count: number;
  question_count: number;
  answered_count: number;
};

const TOKEN_KEY = "access_token";
const USER_KEY = "user";

const filters: Array<{ id: ReviewFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "review", label: "후기" },
  { id: "question", label: "문의" },
  { id: "answered", label: "답변완료" },
];

function formatDate(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function previewText(value: string, maxLength = 120) {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}...`;
}

function getStoredUser() {
  if (typeof window === "undefined") {
    return null;
  }
  const token = window.localStorage.getItem(TOKEN_KEY);
  const rawUser = window.localStorage.getItem(USER_KEY);
  if (!token || !rawUser) {
    return null;
  }
  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    return null;
  }
}

function isAdminUser(user: AuthUser | null) {
  const role = String(user?.role || "").toLowerCase();
  const plan = String(user?.plan || "").toLowerCase();
  const email = String(user?.email || "").toLowerCase();
  return role === "admin" || plan === "admin" || email === "ggug0125@gmail.com";
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ review_count: 0, question_count: 0, answered_count: 0 });
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<ReviewFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<ReviewSort>("latest");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [formType, setFormType] = useState<ReviewType>("review");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState<ReviewType>("review");
  const [editRating, setEditRating] = useState(5);
  const [isEditing, setIsEditing] = useState(false);
  const [answerText, setAnswerText] = useState("");

  const isAuthenticated = Boolean(currentUser);
  const isAdmin = isAdminUser(currentUser);

  async function loadReviews(nextFilter = activeFilter, nextSearchQuery = searchQuery) {
    setIsLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams({ limit: "80" });
      if (nextFilter === "review" || nextFilter === "question") {
        params.set("type", nextFilter);
      }
      if (nextSearchQuery.trim()) {
        params.set("q", nextSearchQuery.trim());
      }
      const headers = new Headers();
      const token = window.localStorage.getItem(TOKEN_KEY);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      const response = await fetch(`${API_BASE_URL}/reviews?${params.toString()}`, { headers });
      if (!response.ok) {
        throw new Error("후기 목록을 불러오지 못했습니다.");
      }
      const data = (await response.json()) as { reviews?: ReviewItem[] };
      const nextReviews = Array.isArray(data.reviews) ? data.reviews : [];
      setReviews(nextReviews);
      setSelectedReview((current) => {
        if (!current) {
          return nextReviews[0] || null;
        }
        return nextReviews.find((item) => item.review_id === current.review_id) || nextReviews[0] || null;
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "후기 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/reviews/stats`);
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as Partial<ReviewStats>;
      setStats({
        review_count: Number(data.review_count || 0),
        question_count: Number(data.question_count || 0),
        answered_count: Number(data.answered_count || 0),
      });
    } catch {
      // Stats are supportive; the board still works without them.
    }
  }

  useEffect(() => {
    setCurrentUser(getStoredUser());
    void loadReviews("all");
    void loadStats();
  }, []);

  const visibleReviews = useMemo(() => {
    const filteredReviews = activeFilter === "answered"
      ? reviews.filter((review) => review.status === "answered")
      : reviews;

    return [...filteredReviews].sort((a, b) => {
      if (sortOrder === "rating") {
        return Number(b.rating || 0) - Number(a.rating || 0);
      }
      if (sortOrder === "answered") {
        const answeredDelta = Number(b.status === "answered") - Number(a.status === "answered");
        if (answeredDelta !== 0) {
          return answeredDelta;
        }
      }
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });
  }, [activeFilter, reviews, sortOrder]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadReviews(activeFilter, searchQuery);
  }

  function clearSearch() {
    setSearchQuery("");
    void loadReviews(activeFilter, "");
  }

  function refreshBoard(nextReview?: ReviewItem) {
    void loadReviews(activeFilter, searchQuery);
    void loadStats();
    if (nextReview) {
      setSelectedReview(nextReview);
    }
  }

  function selectReview(review: ReviewItem) {
    setSelectedReview(review);
    setIsEditing(false);
    setAnswerText(review.answer || "");
  }

  function beginEdit(review: ReviewItem) {
    setEditTitle(review.title);
    setEditContent(review.content);
    setEditType(review.type);
    setEditRating(review.rating || 5);
    setIsEditing(true);
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formType,
          rating: formType === "review" ? rating : null,
          title,
          content,
        }),
      });
      if (!response.ok) {
        throw new Error("등록에 실패했습니다.");
      }
      const data = (await response.json()) as { review?: ReviewItem };
      setTitle("");
      setContent("");
      setRating(5);
      setFormType("review");
      setMessage("등록되었습니다.");
      refreshBoard(data.review);
      if (data.review) {
        setSelectedReview(data.review);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "등록에 실패했습니다.");
    }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedReview) {
      return;
    }
    setMessage("");
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/reviews/${selectedReview.review_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editType,
          rating: editType === "review" ? editRating : null,
          title: editTitle,
          content: editContent,
        }),
      });
      if (!response.ok) {
        throw new Error("수정에 실패했습니다.");
      }
      const data = (await response.json()) as { review?: ReviewItem };
      if (data.review) {
        setSelectedReview(data.review);
      }
      setIsEditing(false);
      setMessage("수정되었습니다.");
      refreshBoard(data.review);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "수정에 실패했습니다.");
    }
  }

  async function deleteReview() {
    if (!selectedReview) {
      return;
    }
    setMessage("");
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/reviews/${selectedReview.review_id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("삭제에 실패했습니다.");
      }
      setSelectedReview(null);
      setMessage("삭제되었습니다.");
      refreshBoard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    }
  }

  async function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedReview) {
      return;
    }
    setMessage("");
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/reviews/${selectedReview.review_id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: answerText }),
      });
      if (!response.ok) {
        throw new Error("답변 저장에 실패했습니다.");
      }
      const data = (await response.json()) as { review?: ReviewItem };
      if (data.review) {
        setSelectedReview(data.review);
        setAnswerText(data.review.answer || "");
      }
      setMessage("답변이 저장되었습니다.");
      refreshBoard(data.review);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "답변 저장에 실패했습니다.");
    }
  }

  function changeFilter(nextFilter: ReviewFilter) {
    setActiveFilter(nextFilter);
    if (nextFilter === "review" || nextFilter === "question" || activeFilter === "review" || activeFilter === "question") {
      void loadReviews(nextFilter, searchQuery);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--ai-color-background)] text-[var(--ai-color-text-primary)]">
      <SiteHeader />

      <section className="bg-[linear-gradient(145deg,rgb(var(--ai-bg))_0%,rgb(var(--ai-surface))_48%,rgb(var(--ai-panel))_100%)] px-4 pb-12 pt-24 md:px-8 md:pb-16 md:pt-28">
        <div className="mx-auto max-w-7xl">
          <span className="ai-badge ai-badge-primary w-fit">Reviews & Questions</span>
          <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">후기와 문의</h1>
          <p className="mt-5 max-w-2xl text-base font-bold leading-8 text-[var(--ai-color-text-secondary)] md:text-lg">
            AI Note를 사용하며 느낀 점이나 궁금한 점을 남겨주세요. 관리자가 문의에 답변할 수 있습니다.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <StatCard label="후기" value={stats.review_count} />
            <StatCard label="문의" value={stats.question_count} />
            <StatCard label="답변완료" value={stats.answered_count} />
          </div>
        </div>
      </section>

      <section className="px-4 py-10 md:px-8 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(22rem,0.55fr)]">
          <div className="space-y-5">
            <div className="rounded-[var(--ai-radius-card)] border border-border bg-card p-4 shadow-soft">
              <div className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => changeFilter(filter.id)}
                    className={[
                      "rounded-full border px-4 py-2 text-sm font-black transition",
                      activeFilter === filter.id
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-panel text-body hover:border-primary/40 hover:text-primary",
                    ].join(" ")}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem]">
                <form onSubmit={submitSearch} className="flex min-w-0 flex-col gap-2 sm:flex-row">
                  <label className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="제목, 본문, 답변, 작성자 검색"
                      className="min-h-12 w-full rounded-2xl border border-border bg-panel pl-11 pr-4 text-sm font-bold text-body outline-none transition focus:border-primary"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" className="ai-btn ai-btn-primary min-h-12 justify-center px-5">
                      검색
                    </button>
                    {searchQuery.trim() && (
                      <button type="button" onClick={clearSearch} className="ai-btn ai-btn-ghost min-h-12 justify-center px-4">
                        초기화
                      </button>
                    )}
                  </div>
                </form>
                <label className="relative">
                  <SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <select
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value as ReviewSort)}
                    className="min-h-12 w-full appearance-none rounded-2xl border border-border bg-panel pl-11 pr-4 text-sm font-black text-body outline-none transition focus:border-primary"
                  >
                    <option value="latest">최신순</option>
                    <option value="rating">별점순</option>
                    <option value="answered">답변순</option>
                  </select>
                </label>
              </div>
            </div>

            {message && (
              <p className="rounded-2xl border border-primary/25 bg-primary/10 p-4 text-sm font-black text-primary">
                {message}
              </p>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              {isLoading ? (
                <StateCard text="후기와 문의를 불러오는 중입니다." />
              ) : visibleReviews.length === 0 ? (
                <StateCard text={searchQuery.trim() ? "검색 결과가 없습니다." : "아직 등록된 글이 없습니다."} />
              ) : (
                visibleReviews.map((review) => (
                  <ReviewCard
                    key={review.review_id}
                    review={review}
                    isSelected={selectedReview?.review_id === review.review_id}
                    onSelect={() => selectReview(review)}
                  />
                ))
              )}
            </div>
          </div>

          <aside className="space-y-5">
            <WriteCard
              isAuthenticated={isAuthenticated}
              formType={formType}
              rating={rating}
              title={title}
              content={content}
              onTypeChange={setFormType}
              onRatingChange={setRating}
              onTitleChange={setTitle}
              onContentChange={setContent}
              onSubmit={submitReview}
            />

            <DetailPanel
              review={selectedReview}
              isAdmin={isAdmin}
              isEditing={isEditing}
              editType={editType}
              editRating={editRating}
              editTitle={editTitle}
              editContent={editContent}
              answerText={answerText}
              onBeginEdit={beginEdit}
              onCancelEdit={() => setIsEditing(false)}
              onEditTypeChange={setEditType}
              onEditRatingChange={setEditRating}
              onEditTitleChange={setEditTitle}
              onEditContentChange={setEditContent}
              onSubmitEdit={submitEdit}
              onDelete={deleteReview}
              onAnswerTextChange={setAnswerText}
              onSubmitAnswer={submitAnswer}
            />
          </aside>
        </div>
      </section>
    </main>
  );
}

function ReviewCard({ review, isSelected, onSelect }: { review: ReviewItem; isSelected: boolean; onSelect: () => void }) {
  return (
    <article
      className={[
        "rounded-[var(--ai-radius-card)] border bg-card p-5 shadow-soft transition duration-200 hover:-translate-y-1.5 hover:scale-[1.01] hover:border-primary/35 hover:shadow-[var(--ai-shadow-hover)]",
        isSelected ? "border-primary/60 ring-2 ring-primary/10" : "border-border",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TypeBadge type={review.type} />
          <StatusBadge status={review.status} />
        </div>
        {review.type === "review" && <RatingStars rating={review.rating || 0} size={19} />}
      </div>
      <h2 className="mt-4 line-clamp-2 text-xl font-black text-title">{review.title}</h2>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[var(--ai-color-text-secondary)]">
        <span className="inline-flex items-center gap-1">
          <UserRound size={14} />
          {review.display_name}
        </span>
        <span>{formatDate(review.created_at)}</span>
      </div>
      <p className="mt-4 text-sm font-bold leading-7 text-body">{previewText(review.content)}</p>
      <button type="button" onClick={onSelect} className="ai-btn ai-btn-ghost mt-5 min-h-11 px-4">
        상세 보기
        <ArrowRight size={16} />
      </button>
    </article>
  );
}

function WriteCard({
  isAuthenticated,
  formType,
  rating,
  title,
  content,
  onTypeChange,
  onRatingChange,
  onTitleChange,
  onContentChange,
  onSubmit,
}: {
  isAuthenticated: boolean;
  formType: ReviewType;
  rating: number;
  title: string;
  content: string;
  onTypeChange: (value: ReviewType) => void;
  onRatingChange: (value: number) => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-[var(--ai-radius-card)] border border-border bg-card p-5 shadow-soft">
      <h2 className="flex items-center gap-2 text-xl font-black text-title">
        <MessageSquareText size={20} className="text-primary" />
        글 남기기
      </h2>
      {!isAuthenticated ? (
        <div className="mt-5 rounded-2xl border border-border bg-panel p-4">
          <p className="text-sm font-bold leading-7 text-body">후기와 문의 작성은 로그인 후 가능합니다.</p>
          <Link href="/login" className="ai-btn ai-btn-primary mt-4 min-h-11 justify-center px-4">
            로그인하기
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 grid gap-4">
          <div className="grid grid-cols-2 gap-2">
            {(["review", "question"] as ReviewType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onTypeChange(type)}
                className={[
                  "rounded-2xl border px-4 py-3 text-sm font-black transition",
                  formType === type ? "border-primary bg-primary text-white" : "border-border bg-panel text-body",
                ].join(" ")}
              >
                {type === "review" ? "후기" : "문의"}
              </button>
            ))}
          </div>
          {formType === "review" && <RatingInput rating={rating} onChange={onRatingChange} />}
          <TextInput label="제목" value={title} onChange={onTitleChange} maxLength={120} />
          <TextArea label="내용" value={content} onChange={onContentChange} rows={6} />
          <button type="submit" className="ai-btn ai-btn-primary min-h-12 justify-center px-5">
            등록
            <Send size={16} />
          </button>
        </form>
      )}
    </section>
  );
}

function DetailPanel({
  review,
  isAdmin,
  isEditing,
  editType,
  editRating,
  editTitle,
  editContent,
  answerText,
  onBeginEdit,
  onCancelEdit,
  onEditTypeChange,
  onEditRatingChange,
  onEditTitleChange,
  onEditContentChange,
  onSubmitEdit,
  onDelete,
  onAnswerTextChange,
  onSubmitAnswer,
}: {
  review: ReviewItem | null;
  isAdmin: boolean;
  isEditing: boolean;
  editType: ReviewType;
  editRating: number;
  editTitle: string;
  editContent: string;
  answerText: string;
  onBeginEdit: (review: ReviewItem) => void;
  onCancelEdit: () => void;
  onEditTypeChange: (value: ReviewType) => void;
  onEditRatingChange: (value: number) => void;
  onEditTitleChange: (value: string) => void;
  onEditContentChange: (value: string) => void;
  onSubmitEdit: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: () => void;
  onAnswerTextChange: (value: string) => void;
  onSubmitAnswer: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!review) {
    return <StateCard text="글을 선택하면 상세 내용이 표시됩니다." />;
  }

  return (
    <section className="rounded-[var(--ai-radius-card)] border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TypeBadge type={review.type} />
          <StatusBadge status={review.status} />
        </div>
        {review.type === "review" && <RatingStars rating={review.rating || 0} size={19} />}
      </div>

      {isEditing ? (
        <form onSubmit={onSubmitEdit} className="mt-5 grid gap-4">
          <div className="grid grid-cols-2 gap-2">
            {(["review", "question"] as ReviewType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onEditTypeChange(type)}
                className={[
                  "rounded-2xl border px-4 py-3 text-sm font-black transition",
                  editType === type ? "border-primary bg-primary text-white" : "border-border bg-panel text-body",
                ].join(" ")}
              >
                {type === "review" ? "후기" : "문의"}
              </button>
            ))}
          </div>
          {editType === "review" && <RatingInput rating={editRating} onChange={onEditRatingChange} />}
          <TextInput label="제목" value={editTitle} onChange={onEditTitleChange} maxLength={120} />
          <TextArea label="내용" value={editContent} onChange={onEditContentChange} rows={7} />
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="submit" className="ai-btn ai-btn-primary min-h-11 justify-center px-4">수정 저장</button>
            <button type="button" onClick={onCancelEdit} className="ai-btn ai-btn-ghost min-h-11 justify-center px-4">취소</button>
          </div>
        </form>
      ) : (
        <>
          <h2 className="mt-5 text-2xl font-black text-title">{review.title}</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[var(--ai-color-text-secondary)]">
            <span>{review.display_name}</span>
            <span>{formatDate(review.created_at)}</span>
          </div>
          <p className="mt-5 whitespace-pre-wrap text-sm font-bold leading-7 text-body">{review.content}</p>

          {review.answer ? (
            <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-[linear-gradient(145deg,rgba(16,185,129,0.12),rgba(255,255,255,0.04))] p-4 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-emerald-200">
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1">
                    <ShieldCheck size={15} />
                    관리자
                  </span>
                  답변
                </p>
                <span className="text-xs font-black text-[var(--ai-color-text-secondary)]">
                  {formatDate(review.answer_at)}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm font-bold leading-7 text-body">{review.answer}</p>
              <p className="mt-3 text-xs font-bold text-[var(--ai-color-text-secondary)]">
                답변자: {review.answer_by || "관리자"}
              </p>
            </div>
          ) : (
            <p className="mt-6 rounded-2xl border border-border bg-panel p-4 text-sm font-bold text-body">
              아직 답변이 등록되지 않았습니다.
            </p>
          )}

          {review.can_edit && (
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => onBeginEdit(review)} className="ai-btn ai-btn-ghost min-h-11 justify-center px-4">
                <Edit3 size={16} />
                수정
              </button>
              <button type="button" onClick={onDelete} className="ai-btn min-h-11 justify-center border border-primary/30 bg-primary/10 px-4 text-primary">
                <Trash2 size={16} />
                삭제
              </button>
            </div>
          )}
        </>
      )}

      {isAdmin && (
        <form onSubmit={onSubmitAnswer} className="mt-6 border-t border-border pt-5">
          <h3 className="flex items-center gap-2 text-base font-black text-title">
            <ShieldCheck size={18} className="text-primary" />
            관리자 답변
          </h3>
          <TextArea label="답변 내용" value={answerText} onChange={onAnswerTextChange} rows={5} />
          <button type="submit" className="ai-btn ai-btn-primary mt-4 min-h-11 justify-center px-4">
            답변 저장
            <CheckCircle2 size={16} />
          </button>
        </form>
      )}
    </section>
  );
}

function TypeBadge({ type }: { type: ReviewType }) {
  return (
    <span className="rounded-full border border-border bg-panel px-3 py-1 text-xs font-black text-primary">
      {type === "review" ? "후기" : "문의"}
    </span>
  );
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const answered = status === "answered";
  return (
    <span
      className={[
        "rounded-full border px-3 py-1 text-xs font-black shadow-sm",
        answered
          ? "border-emerald-400/55 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
          : "border-amber-400/60 bg-amber-400/15 text-amber-700 dark:text-amber-200",
      ].join(" ")}
    >
      {answered ? "답변완료" : "답변대기"}
    </span>
  );
}

function RatingStars({ rating, size = 18 }: { rating: number; size?: number }) {
  return (
    <span className="flex shrink-0 items-center gap-0.5 text-gold drop-shadow-sm" aria-label={`${rating}점`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={size} fill={star <= rating ? "currentColor" : "none"} strokeWidth={2.4} />
      ))}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-[var(--ai-radius-card)] border border-border bg-card/85 p-5 shadow-soft backdrop-blur">
      <p className="text-sm font-black text-[var(--ai-color-text-secondary)]">{label}</p>
      <strong className="mt-2 block text-3xl font-black text-title">{value.toLocaleString("ko-KR")}</strong>
    </article>
  );
}

function RatingInput({ rating, onChange }: { rating: number; onChange: (value: number) => void }) {
  return (
    <div>
      <label className="text-sm font-black text-title">별점</label>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button key={value} type="button" onClick={() => onChange(value)} className="rounded-full p-1 text-gold">
            <Star size={22} fill={value <= rating ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange, maxLength }: { label: string; value: string; onChange: (value: string) => void; maxLength?: number }) {
  return (
    <label className="grid gap-2 text-sm font-black text-title">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        required
        className="min-h-12 rounded-2xl border border-border bg-panel px-4 text-sm font-bold text-body outline-none transition focus:border-primary"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, rows }: { label: string; value: string; onChange: (value: string) => void; rows: number }) {
  return (
    <label className="grid gap-2 text-sm font-black text-title">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        required
        className="resize-none rounded-2xl border border-border bg-panel px-4 py-3 text-sm font-bold leading-6 text-body outline-none transition focus:border-primary"
      />
    </label>
  );
}

function StateCard({ text }: { text: string }) {
  return (
    <div className="rounded-[var(--ai-radius-card)] border border-border bg-card p-5 text-sm font-black text-body shadow-soft">
      <span className="flex items-center gap-2">
        <HelpCircle size={18} className="text-primary" />
        {text}
      </span>
    </div>
  );
}
