const FALLBACK_API_URL = "http://localhost:8001";

function normalizeApiUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export const API_URL = normalizeApiUrl(
  process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    FALLBACK_API_URL
);

export function apiUrl(path: string) {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
