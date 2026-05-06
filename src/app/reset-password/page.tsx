"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { VerificationCodeInput } from "@/components/auth/VerificationCodeInput";
import { RegisterApiError, resetPassword } from "@/lib/api/auth";

function getResetPasswordErrorMessage(error: RegisterApiError) {
  const normalizedCode = (error.code || "").toLowerCase();
  const normalizedMessage = error.message.toLowerCase();

  if (
    normalizedCode.includes("invalid") ||
    normalizedCode.includes("expired") ||
    normalizedCode.includes("code") ||
    normalizedMessage.includes("invalid") ||
    normalizedMessage.includes("expired") ||
    normalizedMessage.includes("code")
  ) {
    return "Invalid or expired code. Please request a new one.";
  }

  if (
    normalizedCode.includes("password") ||
    normalizedCode.includes("weak") ||
    normalizedCode.includes("strength") ||
    normalizedMessage.includes("password") ||
    normalizedMessage.includes("weak") ||
    normalizedMessage.includes("stronger") ||
    normalizedMessage.includes("strength")
  ) {
    return "Please enter a stronger password.";
  }

  return "We could not update your password. Try again.";
}

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (code.length !== 6) {
      setError("Enter the 6-digit reset code.");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await resetPassword({
        email: email.trim(),
        code,
        newPassword: password,
      });
      setSuccess("Your password was updated. You can sign in now.");
      router.replace(
        `/login?email=${encodeURIComponent(email.trim())}&reset=success`
      );
    } catch (err: unknown) {
      if (err instanceof RegisterApiError) {
        setError(getResetPasswordErrorMessage(err));
      } else {
        setError("We could not update your password. Try again.");
      }
    } finally {
      setLoading(false);
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
              Reset password
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Enter your email, the 6-digit code, and your new password.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                className="brand-input w-full px-4 py-3"
              />

              <VerificationCodeInput value={code} onChange={setCode} disabled={loading} />

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="New password"
                className="brand-input w-full px-4 py-3"
              />

              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                className="brand-input w-full px-4 py-3"
              />

              <button
                type="submit"
                disabled={loading}
                className="brand-button-primary w-full px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Updating..." : "Update password"}
              </button>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

              <div className="text-center text-sm text-[var(--text-secondary)]">
                <Link href="/login" className="font-semibold text-[var(--measurable-blue)] hover:text-[var(--measurable-blue-hover)]">
                  Back to login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
