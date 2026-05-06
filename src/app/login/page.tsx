"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AuthSocialPlaceholders } from "@/components/auth/AuthSocialPlaceholders";
import { useI18n } from "@/components/providers/LanguageProvider";
import { FEATURES } from "@/config/features";
import {
  fetchAuthMe,
  loginUser,
  RegisterApiError,
} from "@/lib/api/auth";
import {
  clearLogoutInProgress,
  clearSession,
  setPendingVerificationEmail,
} from "@/lib/auth/session";
import { useAuthStore } from "@/lib/store/auth-store";

function getLoginErrorMessage(error: RegisterApiError, fallback: string) {
  if (
    error.code === "email_not_verified" ||
    error.code === "verification_required" ||
    error.code === "unverified_user"
  ) {
    return "Your email is not verified yet.";
  }

  return error.message || fallback;
}

function LoginPageContent() {
  const { messages } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const oauthToken =
    searchParams.get("token") || searchParams.get("access_token") || "";
  const oauthErrorCode =
    searchParams.get("oauth_error") || searchParams.get("error") || "";
  const oauthErrorMessage =
    searchParams.get("message") || searchParams.get("error_description") || "";
  const sessionExpired = searchParams.get("session") === "expired";
  const accountDeleted = searchParams.get("accountDeleted") === "1";
  const pageTitle = useMemo(() => messages.login.title, [messages.login.title]);

  useEffect(() => {
    let active = true;

    async function completeOauthLogin() {
      if (oauthToken) {
        setLoading(true);
        setError("");
        setSuccess("");

        try {
          const user = await fetchAuthMe(oauthToken);

          if (!active) {
            return;
          }

          login(oauthToken, user);
          router.replace("/dashboard");
          return;
        } catch {
          if (!active) {
            return;
          }

          clearSession();
          setError("Google sign-in could not be completed. Please try again.");
        } finally {
          if (active) {
            setLoading(false);
          }
        }

        return;
      }

      if (oauthErrorCode || oauthErrorMessage) {
        const normalizedCode = oauthErrorCode.toLowerCase();
        const normalizedMessage = oauthErrorMessage.toLowerCase();

        if (
          normalizedCode.includes("access_denied") ||
          normalizedMessage.includes("access denied") ||
          normalizedMessage.includes("cancel")
        ) {
          setError("Google sign-in was cancelled before completion.");
          return;
        }

        setError("Google sign-in could not be completed. Please try again.");
        return;
      }

      if (sessionExpired) {
        setError("Your session expired. Sign in again.");
        return;
      }

      if (accountDeleted) {
        setSuccess("Your account has been deleted.");
      }
    }

    void completeOauthLogin();

    return () => {
      active = false;
    };
  }, [
    login,
    oauthErrorCode,
    oauthErrorMessage,
    oauthToken,
    router,
    accountDeleted,
    sessionExpired,
  ]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    clearLogoutInProgress();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await loginUser({
        email: email.trim(),
        password,
      });
      const user = await fetchAuthMe(response.accessToken || undefined);
      login(response.accessToken || null, user);
      router.replace("/dashboard");
    } catch (err: unknown) {
      if (err instanceof RegisterApiError) {
        if (
          err.code === "email_not_verified" ||
          err.code === "verification_required" ||
          err.code === "unverified_user" ||
          err.message.toLowerCase().includes("verify")
        ) {
          setPendingVerificationEmail(email.trim());
          router.replace(`/verify-email?email=${encodeURIComponent(email.trim())}`);
          return;
        }

        setError(getLoginErrorMessage(err, messages.login.loginError));
      } else if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError(messages.login.loginError);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard requireAuth={false} redirectTo="/dashboard">
      <div className="min-h-screen bg-[var(--background)] lg:grid lg:grid-cols-2">
        <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-16 xl:px-20">
          <div className="w-full max-w-md text-center">
            <div className="mb-8">
              <p className="brand-wordmark text-sm font-semibold uppercase tracking-[0.18em]">
                Measurable
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                {pageTitle}
              </h1>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                {messages.login.description}
              </p>
            </div>

            <form
              onSubmit={handleLogin}
              className="brand-card space-y-4 p-8 text-left"
            >
              <input
                type="email"
                placeholder={messages.login.email}
                className="brand-input w-full px-4 py-3"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />

              <input
                type="password"
                placeholder={messages.login.password}
                className="brand-input w-full px-4 py-3"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />

              <div className="flex items-center justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-[var(--measurable-blue)] hover:text-[var(--measurable-blue-hover)]"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="brand-button-primary w-full px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? messages.login.loggingIn : messages.login.login}
              </button>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

              <AuthSocialPlaceholders />

              {!FEATURES.ENABLE_APP_REVIEW_MODE ? (
                <div className="pt-2 text-center">
                  <p className="text-sm text-[var(--text-secondary)]">
                    {messages.login.noAccountYet}{" "}
                    <Link
                      href="/register"
                      className="font-semibold text-[var(--measurable-blue)] hover:text-[var(--measurable-blue-hover)]"
                    >
                      {messages.login.createAccount}
                    </Link>
                  </p>
                </div>
              ) : null}
            </form>
          </div>
        </section>

        <aside className="hidden border-l border-[var(--border-soft)] bg-[var(--surface)] lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:px-16 lg:py-14 xl:px-20">
          <div className="max-w-lg">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--measurable-blue)]">
              {messages.login.platformUpdates}
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
              {messages.login.updatesTitle}
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">
              {messages.login.updatesDescription}
            </p>
          </div>

          <div className="brand-card p-8">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {messages.login.comingSoon}
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {messages.login.comingSoonDescription}
            </p>
          </div>
        </aside>
      </div>
    </AuthGuard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
