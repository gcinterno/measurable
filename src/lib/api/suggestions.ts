import { apiFetch } from "@/lib/api";

export async function createSuggestion(message: string) {
  return apiFetch<Record<string, unknown>>("/suggestions", {
    method: "POST",
    body: JSON.stringify({
      message,
    }),
  });
}
