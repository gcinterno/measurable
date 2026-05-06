"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { VerificationCodeInput } from "@/components/auth/VerificationCodeInput";
import {
  fetchAuthMe,
  loginUser,
  RegisterApiError,
  resendVerificationCode,
  verifyEmail,
} from "@/lib/api/auth";
import { fetchOnboardingStatus } from "@/lib/api/onboarding";
import {
  clearOnboardingDismissed,
  clearPendingRegistrationCredentials,
  clearPendingVerificationEmail,
  clearLogoutInProgress,
  getPendingRegistrationCredentials,
  getPendingVerificationEmail,
} from "@/lib/auth/session";
import { useAuthStore } from "@/lib/store/auth-store";

const RESEND_SECONDS = 30;

function VerifyEmailPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState(searchParams.get("email") || getPendingVerificationEmail());
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCountdown((current) => current - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [countdown]);

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (code.length !== 6) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      clearLogoutInProgress();

      const verificationResult = await verifyEmail({
        email: email.trim(),
        code,
      });
      let accessToken = verificationResult.accessToken || "";

      async function finalizeAuthenticatedRedirect(currentAccessToken?: string) {
        const user = await fetchAuthMe(currentAccessToken || undefined);
        login(currentAccessToken || null, user);
        clearPendingVerificationEmail();
        clearPendingRegistrationCredentials();
        clearOnboardingDismissed();

        try {
          const onboarding = await fetchOnboardingStatus();
          router.replace(
            onboarding.onboarding_completed ? "/dashboard" : "/onboarding"
          );
        } catch {
          router.replace("/onboarding");
        }
      }

      try {
        await finalizeAuthenticatedRedirect(accessToken);
        return;
      } catch {
        const pendingRegistration = getPendingRegistrationCredentials();

        if (!pendingRegistration || pendingRegistration.email !== email.trim()) {
          setError(
            "Your email was verified, but we could not start your session automatically. Backend should return a session or token from /auth/verify-email."
          );
          return;
        }

        const loginResult = await loginUser({
          email: pendingRegistration.email,
          password: pendingRegistration.password,
        });
        accessToken = loginResult.accessToken || "";
        await finalizeAuthenticatedRedirect(accessToken);
      }
    } catch (err: unknown) {
      if (err instanceof RegisterApiError) {
        setError("We could not verify your email. Check the code and try again.");
      } else if (err instanceof Error && err.message) {
        setError("We could not verify your email. Check the code and try again.");
      } else {
        setError("We could not verify your email.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email.trim() || countdown > 0) {
      return;
    }

    setResending(true);
    setError("");
    setSuccess("");

    try {
      await resendVerificationCode({ email: email.trim() });
      setSuccess("A new verification code was sent.");
      setCountdown(RESEND_SECONDS);
    } catch (err: unknown) {
      if (err instanceof RegisterApiError) {
        setError(err.message || "We could not resend the verification code.");
      } else if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError("We could not resend the verification code.");
      }
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthGuard requireAuth={false} redirectTo="/dashboard">
      <div className="min-h-screen bg-[var(--background)]">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10 sm:px-10">
          <div className="brand-card w-full max-w-xl p-8 sm:p-10">
            <p className="brand-wordmark text-sm font-semibold uppercase tracking-[0.18em]">
              Measurable
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
              Verify your email
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Enter the 6-digit code we sent to your inbox to activate your workspace access.
            </p>

            <form onSubmit={handleVerify} className="mt-8 space-y-5">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                className="brand-input w-full px-4 py-3"
              />

              <VerificationCodeInput
                value={code}
                onChange={setCode}
                disabled={loading}
              />

              <button
                type="submit"
                disabled={loading}
                className="brand-button-primary w-full px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Verifying..." : "Verify email"}
              </button>

              <div className="flex items-center justify-between gap-4 text-sm">
                <button
                  type="button"
                  onClick={() => void handleResend()}
                  disabled={resending || countdown > 0}
                  className="font-semibold text-[var(--measurable-blue)] hover:text-[var(--measurable-blue-hover)] disabled:text-[var(--text-muted)]"
                >
                  {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
                </button>
                <Link href="/login" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  Back to login
                </Link>
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
            </form>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageContent />
    </Suspense>
  );
}
