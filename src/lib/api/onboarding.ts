import { apiUrl } from "@/lib/api/config";
import { getToken } from "@/lib/auth/session";

export type OnboardingUserType =
  | "freelancer"
  | "agency"
  | "business"
  | "team";

export type OnboardingGoal =
  | "track_growth"
  | "client_reports"
  | "fast_insights"
  | "improve_performance"
  | "understand_data"
  | "export_reports"
  | "automate_reports";

export type OnboardingPlatform =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "google_analytics"
  | "shopify"
  | "meta_ads"
  | "google_ads"
  | "other";

export type OnboardingStatus = {
  onboarding_completed?: boolean;
  user_type?: string | null;
  goals?: string[];
  platforms?: string[];
};

let onboardingStatusCache: OnboardingStatus | null = null;
let onboardingStatusPromise: Promise<OnboardingStatus> | null = null;

type CompleteOnboardingInput = {
  user_type: OnboardingUserType;
  goals: OnboardingGoal[];
  platforms: OnboardingPlatform[];
};

function getAuthHeaders() {
  const token = getToken();

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

async function readOnboardingResponse(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function fetchOnboardingStatus() {
  if (onboardingStatusCache) {
    return onboardingStatusCache;
  }

  if (onboardingStatusPromise) {
    return onboardingStatusPromise;
  }

  onboardingStatusPromise = (async () => {
    const response = await fetch(apiUrl("/onboarding/me"), {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: {
        ...getAuthHeaders(),
      },
    });

    const payload = await readOnboardingResponse(response);

    if (!response.ok) {
      const message =
        (payload && typeof payload.detail === "string" && payload.detail) ||
        (payload && typeof payload.message === "string" && payload.message) ||
        "Could not load onboarding.";

      throw new Error(message);
    }

    const normalized = (payload || {}) as OnboardingStatus;
    onboardingStatusCache = normalized;
    return normalized;
  })();

  try {
    return await onboardingStatusPromise;
  } finally {
    onboardingStatusPromise = null;
  }
}

export async function completeOnboarding(input: CompleteOnboardingInput) {
  const response = await fetch(apiUrl("/onboarding/complete"), {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(input),
  });

  const payload = await readOnboardingResponse(response);

  if (!response.ok) {
    const message =
      (payload && typeof payload.detail === "string" && payload.detail) ||
      (payload && typeof payload.message === "string" && payload.message) ||
      "Could not complete onboarding.";

    throw new Error(message);
  }

  onboardingStatusCache = {
    onboarding_completed: true,
    user_type: input.user_type,
    goals: input.goals,
    platforms: input.platforms,
  };

  return payload;
}

export function clearOnboardingStatusCache() {
  onboardingStatusCache = null;
  onboardingStatusPromise = null;
}

export function primeOnboardingStatusCache(status: OnboardingStatus) {
  onboardingStatusCache = status;
}
