"use client";

import { API_BASE_URL } from "@/lib/api";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const TOKEN_KEY = "access_token";
const USER_KEY = "user";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function completeOAuthLogin() {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const error = params.get("error");

      if (!token || error) {
        router.replace("/login?error=oauth_failed");
        return;
      }

      try {
        window.localStorage.setItem(TOKEN_KEY, token);

        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.user) {
          throw new Error("OAuth user verification failed");
        }

        window.localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        if (isMounted) {
          router.replace("/");
        }
      } catch {
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(USER_KEY);
        if (isMounted) {
          router.replace("/login?error=oauth_failed");
        }
      }
    }

    completeOAuthLogin();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-app px-6 text-title">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card/80 p-8 text-center shadow-soft backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-2xl font-black">AI Note 로그인 연결 중</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-body">
          Google 계정을 확인하고 AI Note 작업 공간으로 이동하고 있습니다.
        </p>
        <div className="mt-7 flex items-center justify-center gap-2 text-sm font-black text-primary">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>잠시만 기다려주세요</span>
        </div>
      </section>
    </main>
  );
}
