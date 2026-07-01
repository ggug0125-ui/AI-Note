"use client";

import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Logo } from "../../components/Logo";
import { ThemeToggle } from "../../components/ThemeToggle";
import { WaveBackground } from "../../components/WaveBackground";
import { API_BASE_URL } from "@/lib/api";

const TOKEN_KEY = "access_token";
const USER_KEY = "user";
const DEFAULT_LOGIN_ERROR_MESSAGE = "로그인에 실패했습니다.";
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_oauth_failed: "Google 로그인에 실패했습니다. 다시 시도해주세요.",
  oauth_failed: "소셜 로그인 처리 중 문제가 발생했습니다. 다시 시도해주세요."
};

const socialProviders = [
  { name: "Google", icon: "/icons/google.svg", message: "Google 로그인은 추후 연동 예정입니다." },
  { name: "Kakao", icon: "/icons/kakao.svg", message: "Kakao 로그인은 추후 연동 예정입니다." },
  { name: "Naver", icon: "/icons/naver.svg", message: "Naver 로그인은 현재 개발 중입니다." }
];

function getLoginErrorMessage(data: unknown) {
  if (!data || typeof data !== "object" || !("detail" in data)) {
    return DEFAULT_LOGIN_ERROR_MESSAGE;
  }

  const { detail } = data as { detail?: unknown };
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: unknown }).msg);
        }
        return String(item);
      })
      .join("\n");
  }

  return DEFAULT_LOGIN_ERROR_MESSAGE;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error && OAUTH_ERROR_MESSAGES[error]) {
      setErrorMessage(OAUTH_ERROR_MESSAGES[error]);
    }
  }, []);

  function handleSocialLogin(provider: (typeof socialProviders)[number]) {
    if (provider.name === "Google") {
      window.location.href = `${API_BASE_URL}/auth/google/login`;
      return;
    }

    if (provider.name === "Kakao") {
      window.location.href = `${API_BASE_URL}/auth/kakao/login`;
      return;
    }

    const { message } = provider;
    window.alert(message);
    console.log(message);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim()
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getLoginErrorMessage(data));
      }

      window.localStorage.setItem(TOKEN_KEY, data.access_token);
      window.localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      router.push("/");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : DEFAULT_LOGIN_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-app text-title">
      <div className="grid min-h-screen lg:grid-cols-[0.92fr_1.08fr]">
        <section className="flex items-center px-4 py-8 md:px-10 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            <div className="flex items-center justify-between gap-4">
              <Logo />
              <ThemeToggle />
            </div>
            <div className="mt-12 md:mt-16">
              <h1 className="text-3xl font-black leading-tight sm:text-4xl md:text-5xl">다시 만나 반가워요</h1>
              <p className="mt-4 text-base text-body sm:text-lg">로그인하고 문서 분석을 이어가세요.</p>
            </div>

            <form className="mt-8 space-y-5 md:mt-10" onSubmit={handleLogin}>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-body">이메일</span>
                <span className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm">
                  <Mail size={18} className="shrink-0 text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@noteflow.ai"
                    className="w-full min-w-0 bg-transparent text-base outline-none placeholder:text-muted"
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-body">비밀번호</span>
                <span className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm">
                  <LockKeyhole size={18} className="shrink-0 text-muted" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full min-w-0 bg-transparent text-base outline-none placeholder:text-muted"
                    required
                  />
                </span>
              </label>

              {errorMessage && (
                <p className="ai-alert ai-alert-danger px-4 py-3">
                  {errorMessage}
                </p>
              )}

              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="flex min-w-0 items-center gap-2 font-semibold text-body">
                  <input type="checkbox" className="h-4 w-4 shrink-0 rounded border-border accent-primary" />
                  <span className="whitespace-nowrap">로그인 상태 유지</span>
                </label>
                <Link href="/register" className="!hidden shrink-0 font-bold text-primary" aria-hidden="true" tabIndex={-1}>
                  회원가입
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex min-h-14 w-full items-center justify-center rounded-full bg-primary px-6 text-base font-black text-white shadow-soft transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "로그인 중..." : "로그인"}
                <ArrowRight className="ml-2" size={19} />
              </button>
            </form>

            <div className="mt-8">
              <div className="flex items-center gap-4 text-sm text-muted">
                <span className="h-px flex-1 bg-border" />
                <span className="shrink-0 whitespace-nowrap">소셜 계정으로 로그인</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {socialProviders.map((provider) => (
                  <button
                    key={provider.name}
                    type="button"
                    onClick={() => handleSocialLogin(provider)}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 text-sm font-black shadow-sm transition hover:bg-panel"
                  >
                    <Image src={provider.icon} alt="" width={22} height={22} aria-hidden="true" />
                    <span className="whitespace-nowrap">{provider.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative hidden min-h-screen overflow-hidden lg:block">
          <WaveBackground />
          <div className="absolute right-8 top-8 z-10">
            <ThemeToggle />
          </div>
          <div className="relative z-10 flex h-full items-end justify-center p-12">
            <article className="mb-10 max-w-xl rounded-3xl border border-border bg-card/70 p-8 shadow-soft backdrop-blur-xl">
              <p className="text-2xl font-black leading-10">
                긴 문서 분석 시간을 줄이고, AI와 대화하며 필요한 내용을 바로 찾아보세요.
              </p>
              <div className="mt-7 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gold to-primary" />
                <div>
                  <strong>정서윤</strong>
                  <span className="block text-sm text-muted">전략기획팀 리드</span>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
