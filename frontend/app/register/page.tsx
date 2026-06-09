"use client";

import { ArrowRight, LockKeyhole, Mail, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Logo } from "../../components/Logo";
import { ThemeToggle } from "../../components/ThemeToggle";
import { WaveBackground } from "../../components/WaveBackground";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail ?? "회원가입에 실패했습니다.");
      }

      setSuccessMessage("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.");
      window.setTimeout(() => router.push("/login"), 700);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "회원가입에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-ivory text-ink dark:bg-[#11100D] dark:text-neutral-100">
      <div className="grid min-h-screen lg:grid-cols-[0.92fr_1.08fr]">
        <section className="flex items-center px-4 py-8 md:px-10 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            <div className="flex items-center justify-between gap-4">
              <Logo />
              <ThemeToggle />
            </div>

            <div className="mt-12 md:mt-16">
              <h1 className="text-3xl font-black leading-tight sm:text-4xl md:text-5xl">계정을 만들어볼까요</h1>
              <p className="mt-4 text-base text-neutral-600 dark:text-neutral-300 sm:text-lg">NoteFlow AI에서 문서 분석 작업을 이어가세요.</p>
            </div>

            <form className="mt-8 space-y-5 md:mt-10" onSubmit={handleRegister}>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-neutral-700 dark:text-neutral-300">이름</span>
                <span className="flex w-full items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                  <User size={18} className="shrink-0 text-neutral-400" />
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="홍길동"
                    className="w-full min-w-0 bg-transparent text-base outline-none placeholder:text-neutral-400"
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-neutral-700 dark:text-neutral-300">이메일</span>
                <span className="flex w-full items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                  <Mail size={18} className="shrink-0 text-neutral-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@noteflow.ai"
                    className="w-full min-w-0 bg-transparent text-base outline-none placeholder:text-neutral-400"
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-neutral-700 dark:text-neutral-300">비밀번호</span>
                <span className="flex w-full items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                  <LockKeyhole size={18} className="shrink-0 text-neutral-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="8자 이상 입력하세요"
                    className="w-full min-w-0 bg-transparent text-base outline-none placeholder:text-neutral-400"
                    minLength={8}
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-neutral-700 dark:text-neutral-300">비밀번호 확인</span>
                <span className="flex w-full items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                  <LockKeyhole size={18} className="shrink-0 text-neutral-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="비밀번호를 다시 입력하세요"
                    className="w-full min-w-0 bg-transparent text-base outline-none placeholder:text-neutral-400"
                    minLength={8}
                    required
                  />
                </span>
              </label>

              {errorMessage && (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">
                  {errorMessage}
                </p>
              )}
              {successMessage && (
                <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
                  {successMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex min-h-14 w-full items-center justify-center rounded-full bg-coral px-6 text-base font-black text-white shadow-soft transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "가입 중..." : "회원가입"}
                <ArrowRight className="ml-2" size={19} />
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-neutral-600 dark:text-neutral-300">
              이미 계정이 있나요?{" "}
              <Link href="/login" className="font-black text-coral">
                로그인
              </Link>
            </p>
          </div>
        </section>

        <section className="relative hidden min-h-screen overflow-hidden lg:block">
          <WaveBackground />
          <div className="absolute right-8 top-8 z-10">
            <ThemeToggle />
          </div>
          <div className="relative z-10 flex h-full items-end justify-center p-12">
            <article className="mb-10 max-w-xl rounded-3xl border border-white/60 bg-white/70 p-8 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-[#1A1814]/75">
              <p className="text-2xl font-black leading-10">
                계정을 만들면 문서 분석, 요약, 키워드, 질문 기록을 더 안정적으로 이어갈 수 있습니다.
              </p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
