const rawApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://127.0.0.1:8000";

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");

const TOKEN_KEY = "access_token";
const LOGIN_REQUIRED_MESSAGE = "로그인이 필요합니다.";

export function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) {
    throw new Error(LOGIN_REQUIRED_MESSAGE);
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, {
    ...init,
    headers
  });
}
