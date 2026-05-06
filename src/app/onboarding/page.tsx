"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { OnboardingOptionCard } from "@/components/onboarding/OnboardingOptionCard";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import {
  completeOnboarding,
  fetchOnboardingStatus,
  type OnboardingGoal,
  type OnboardingPlatform,
  type OnboardingUserType,
} from "@/lib/api/onboarding";
import {
  clearOnboardingDismissed,
  dismissOnboarding,
  isOnboardingDismissed,
} from "@/lib/auth/session";

const USER_TYPE_OPTIONS: Array<{ label: string; value: OnboardingUserType }> = [
  { label: "Freelancer / Consultant", value: "freelancer" },
  { label: "Agency (manage clients)", value: "agency" },
  { label: "Brand / Business", value: "business" },
  { label: "Team / Internal marketing", value: "team" },
];

const GOAL_OPTIONS: Array<{ label: string; value: OnboardingGoal }> = [
  { label: "Track growth across social accounts", value: "track_growth" },
  { label: "Generate reports for clients", value: "client_reports" },
  { label: "Turn data into insights faster", value: "fast_insights" },
  { label: "Improve marketing performance", value: "improve_performance" },
  { label: "Understand what’s working", value: "understand_data" },
  { label: "Export ready-to-share reports", value: "export_reports" },
  { label: "Automate recurring reports", value: "automate_reports" },
];

const PLATFORM_OPTIONS: Array<{ label: string; value: OnboardingPlatform }> = [
  { label: "Facebook Pages", value: "facebook" },
  { label: "Instagram", value: "instagram" },
  { label: "TikTok", value: "tiktok" },
  { label: "Google Analytics", value: "google_analytics" },
  { label: "Shopify", value: "shopify" },
  { label: "Meta Ads", value: "meta_ads" },
  { label: "Google Ads", value: "google_ads" },
  { label: "Other", value: "other" },
];

function getNextRoute(goals: OnboardingGoal[], platforms: OnboardingPlatform[]) {
  if (goals.includes("client_reports")) {
    return "/new";
  }

  if (platforms.length > 0) {
    return "/integrations";
  }

  return "/dashboard";
}

export default function OnboardingPage() {
  return (
    <AuthGuard requireAuth redirectTo="/login" allowIncompleteOnboarding>
      <OnboardingPageContent />
    </AuthGuard>
  );
}

function OnboardingPageContent() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<OnboardingUserType | null>(null);
  const [goals, setGoals] = useState<OnboardingGoal[]>([]);
  const [platforms, setPlatforms] = useState<OnboardingPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOnboarding() {
      try {
        if (isOnboardingDismissed()) {
          router.replace("/dashboard");
          return;
        }

        const status = await fetchOnboardingStatus();

        if (!active) {
          return;
        }

        if (status.onboarding_completed) {
          clearOnboardingDismissed();
          router.replace("/dashboard");
          return;
        }
      } catch (nextError) {
        if (!active) {
          return;
        }

        setError(
          nextError instanceof Error
            ? nextError.message
            : "We could not load onboarding right now."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadOnboarding();

    return () => {
      active = false;
    };
  }, [router]);

  const canContinue = useMemo(() => {
    if (step === 1) {
      return Boolean(userType);
    }

    if (step === 2) {
      return goals.length > 0;
    }

    return platforms.length > 0;
  }, [goals.length, platforms.length, step, userType]);

  function toggleMultiValue<T extends string>(values: T[], nextValue: T) {
    return values.includes(nextValue)
      ? values.filter((value) => value !== nextValue)
      : [...values, nextValue];
  }

  function handleSkip() {
    dismissOnboarding();
    router.replace("/dashboard");
  }

  function handleContinue() {
    if (!canContinue) {
      return;
    }

    setError("");

    if (step < 3) {
      setStep((current) => current + 1);
      return;
    }

    void handleSubmit();
  }

  async function handleSubmit() {
    if (!userType) {
      setError("Choose what best describes you to continue.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await completeOnboarding({
        user_type: userType,
        goals,
        platforms,
      });

      clearOnboardingDismissed();
      router.replace(getNextRoute(goals, platforms));
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "We could not save your onboarding right now."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const currentTitle =
    step === 1
      ? "What best describes you?"
      : step === 2
        ? "What do you want to achieve with Measurable?"
        : "Which platforms do you want to connect?";

  const currentSubtitle =
    step === 1
      ? ""
      : step === 2
        ? "Select all that apply"
        : "Select all that apply";

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] px-6 py-10">
        <div className="mx-auto max-w-[480px] rounded-[16px] border border-[var(--border-soft)] bg-white p-8 shadow-[0_12px_28px_rgba(7,17,31,0.06)] sm:max-w-[560px] sm:p-10">
          <div className="h-4 w-28 animate-pulse rounded-full bg-[var(--surface-soft)]" />
          <div className="mt-6 h-10 animate-pulse rounded-[16px] bg-[var(--surface-soft)] sm:h-12" />
          <div className="mt-3 h-4 w-44 animate-pulse rounded-full bg-[var(--surface-soft)] sm:w-52" />
          <div className="mt-8 space-y-3">
            <div className="h-16 animate-pulse rounded-[16px] bg-[var(--surface-soft)] sm:h-[72px]" />
            <div className="h-16 animate-pulse rounded-[16px] bg-[var(--surface-soft)] sm:h-[72px]" />
            <div className="h-16 animate-pulse rounded-[16px] bg-[var(--surface-soft)] sm:h-[72px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto max-w-[480px] sm:max-w-[560px]">
        <div className="rounded-[16px] border border-[var(--border-soft)] bg-white p-8 shadow-[0_12px_28px_rgba(7,17,31,0.06)] sm:p-10">
          <div className="flex items-start justify-between gap-4">
            <OnboardingProgress step={step} totalSteps={3} />
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Skip for now
            </button>
          </div>

          <div className="mt-8 transition-all duration-200">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-[2.15rem]">
              {currentTitle}
            </h1>
            {currentSubtitle ? (
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-[0.95rem]">
                {currentSubtitle}
              </p>
            ) : null}

            <div className="mt-8 space-y-3">
              {step === 1
                ? USER_TYPE_OPTIONS.map((option) => (
                    <OnboardingOptionCard
                      key={option.value}
                      label={option.label}
                      value={option.value}
                      selected={userType === option.value}
                      onClick={(value) => setUserType(value as OnboardingUserType)}
                    />
                  ))
                : null}

              {step === 2
                ? GOAL_OPTIONS.map((option) => (
                    <OnboardingOptionCard
                      key={option.value}
                      label={option.label}
                      value={option.value}
                      selected={goals.includes(option.value)}
                      onClick={(value) =>
                        setGoals((current) =>
                          toggleMultiValue(current, value as OnboardingGoal)
                        )
                      }
                    />
                  ))
                : null}

              {step === 3
                ? PLATFORM_OPTIONS.map((option) => (
                    <OnboardingOptionCard
                      key={option.value}
                      label={option.label}
                      value={option.value}
                      selected={platforms.includes(option.value)}
                      onClick={(value) =>
                        setPlatforms((current) =>
                          toggleMultiValue(current, value as OnboardingPlatform)
                        )
                      }
                    />
                  ))
                : null}
            </div>
          </div>

          {error ? (
            <p className="mt-6 text-sm text-red-600">{error}</p>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(1, current - 1))}
              disabled={step === 1 || submitting}
              className="rounded-[16px] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm font-semibold text-[var(--navy-900)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>

            <button
              type="button"
              onClick={handleContinue}
              disabled={!canContinue || submitting}
              className="brand-button-primary px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving..." : step === 3 ? "Finish" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
