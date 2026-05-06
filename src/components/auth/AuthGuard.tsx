"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchAuthMe, RegisterApiError } from "@/lib/api/auth";
import {
  fetchOnboardingStatus,
  primeOnboardingStatusCache,
} from "@/lib/api/onboarding";
import {
  isAuthenticated,
  isLogoutInProgress,
  isOnboardingDismissed,
} from "@/lib/auth/session";
import { useAuthStore } from "@/lib/store/auth-store";

type AuthGuardProps = {
  requireAuth: boolean;
  redirectTo: string;
  children: React.ReactNode;
  allowIncompleteOnboarding?: boolean;
};

export function AuthGuard({
  requireAuth,
  redirectTo,
  children,
  allowIncompleteOnboarding = false,
}: AuthGuardProps) {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function resolveOnboardingRedirect() {
      const onboarding = await fetchOnboardingStatus();

      if (!active) {
        return { allow: false };
      }

      primeOnboardingStatusCache(onboarding);

      const onboardingCompleted = Boolean(onboarding.onboarding_completed);

      if (!onboardingCompleted && !allowIncompleteOnboarding) {
        router.replace("/onboarding");
        return { allow: false };
      }

      return { allow: true };
    }

    async function bootstrapAuth() {
      if (isLogoutInProgress()) {
        if (requireAuth) {
          router.replace(redirectTo);
          return;
        }

        setReady(true);
        return;
      }

      const authenticated = isAuthenticated();

      if (authenticated) {
        try {
          const onboardingDismissed = isOnboardingDismissed();
          const onboardingResult = onboardingDismissed
            ? { allow: true }
            : await resolveOnboardingRedirect();

          if (!active || !onboardingResult.allow) {
            return;
          }

          if (!requireAuth) {
            router.replace(redirectTo);
            return;
          }

          setReady(true);
          return;
        } catch (error: unknown) {
          if (!active) {
            return;
          }

          if (!(error instanceof RegisterApiError) || error.status !== 401) {
            console.warn("onboarding bootstrap failed", {
              requireAuth,
              redirectTo,
              message: error instanceof Error ? error.message : "Unknown onboarding bootstrap error",
            });
          }
        }

        if (!requireAuth) {
          router.replace(redirectTo);
          return;
        }

        setReady(true);
        return;
      }

      try {
        const user = await fetchAuthMe();

        if (!active) {
          return;
        }

        login(null, user);

        try {
          const onboardingDismissed = isOnboardingDismissed();
          const onboardingResult = onboardingDismissed
            ? { allow: true }
            : await resolveOnboardingRedirect();

          if (!active || !onboardingResult.allow) {
            return;
          }
        } catch (nextError: unknown) {
          if (
            active &&
            (!(nextError instanceof RegisterApiError) || nextError.status !== 401)
          ) {
            console.warn("onboarding fetch after auth bootstrap failed", {
              requireAuth,
              redirectTo,
              message:
                nextError instanceof Error
                  ? nextError.message
                  : "Unknown onboarding fetch error",
            });
          }
        }

        if (requireAuth) {
          setReady(true);
          return;
        }

        router.replace(redirectTo);
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        if (requireAuth) {
          router.replace(redirectTo);
          return;
        }

        if (!(error instanceof RegisterApiError) || error.status !== 401) {
          console.warn("auth bootstrap failed", {
            requireAuth,
            redirectTo,
            message: error instanceof Error ? error.message : "Unknown auth bootstrap error",
          });
        }

        setReady(true);
      }
    }

    void bootstrapAuth();

    return () => {
      active = false;
    };
  }, [allowIncompleteOnboarding, login, redirectTo, requireAuth, router]);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}
