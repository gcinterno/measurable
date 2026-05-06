"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthGuard } from "@/components/auth/AuthGuard";
import {
  requestPasswordReset,
  RegisterApiError,
} from "@/lib/api/auth";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await requestPasswordReset({ email: email.trim() });
      setSuccess("We sent a reset code to your email.");
      window.setTimeout(() => {
        router.replace(`/reset-password?email=${encodeURIComponent(email.trim())}`);
      }, 900);
    } catch (err: unknown) {
      if (err instanceof RegisterApiError) {
        setError(err.message || "We could not send the reset instructions.");
      } else if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError("We could not send the reset instructions.");
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
              Forgot your password?
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Enter your email and we will send you a verification code to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                className="brand-input w-full px-4 py-3"
              />

              <button
                type="submit"
                disabled={loading}
                className="brand-button-primary w-full px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Sending..." : "Send reset code"}
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
