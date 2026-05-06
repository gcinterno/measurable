"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AuthSocialPlaceholders } from "@/components/auth/AuthSocialPlaceholders";
import { useI18n } from "@/components/providers/LanguageProvider";
import {
  registerUser,
  RegisterApiError,
} from "@/lib/api/auth";
import {
  setPendingRegistrationCredentials,
  setPendingVerificationEmail,
} from "@/lib/auth/session";

export default function RegisterPage() {
  const { messages } = useI18n();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
  }, []);

  function validateForm() {
    if (!fullName.trim()) {
      return "Full name is required.";
    }

    if (!email.trim()) {
      return messages.register.emailRequired;
    }

    if (!password) {
      return messages.register.passwordRequired;
    }

    if (password.length < 8) {
      return messages.register.passwordMin;
    }

    if (!confirmPassword) {
      return messages.register.confirmPasswordRequired;
    }

    if (password !== confirmPassword) {
      return messages.register.passwordMismatch;
    }

    return "";
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      await registerUser({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
      });

      setPendingVerificationEmail(email.trim());
      setPendingRegistrationCredentials({
        email: email.trim(),
        password,
      });
      router.replace(`/verify-email?email=${encodeURIComponent(email.trim())}`);
    } catch (err: unknown) {
      if (err instanceof RegisterApiError) {
        if (err.status === 409) {
          setError(messages.register.emailAlreadyRegistered);
        } else if (err.status === 400) {
          setError(err.message || messages.register.validationError);
        } else {
          setError(err.message || messages.register.genericError);
        }
      } else if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError(messages.register.genericError);
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
                {messages.register.title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                {messages.register.description}
              </p>
            </div>

            <form
              onSubmit={handleRegister}
              className="brand-card space-y-4 p-8 text-left"
            >
              <input
                type="text"
                placeholder={messages.register.fullName}
                className="brand-input w-full px-4 py-3"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />

              <input
                type="email"
                placeholder={messages.register.email}
                className="brand-input w-full px-4 py-3"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />

              <input
                type="password"
                placeholder={messages.register.password}
                className="brand-input w-full px-4 py-3"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />

              <input
                type="password"
                placeholder={messages.register.confirmPassword}
                className="brand-input w-full px-4 py-3"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />

              <button
                type="submit"
                disabled={loading}
                className="brand-button-primary w-full px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? messages.register.creatingAccount : messages.register.createAccount}
              </button>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <AuthSocialPlaceholders />

              <div className="pt-2 text-center">
                <p className="text-sm text-[var(--text-secondary)]">
                  {messages.register.alreadyHaveAccount}{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-[var(--measurable-blue)] hover:text-[var(--measurable-blue-hover)]"
                  >
                    {messages.register.signIn}
                  </Link>
                </p>
              </div>
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
