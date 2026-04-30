"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { useI18n } from "@/components/providers/LanguageProvider";
import { FEATURES } from "@/config/features";
import { apiUrl } from "@/lib/api/config";

export default function LoginPage() {
  const { messages } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    setError("");
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const body = new URLSearchParams();
      body.append("username", email);
      body.append("password", password);
      const loginUrl = apiUrl("/auth/login");

      console.log("API URL:", loginUrl);
      console.log("LOGIN FORM BODY:", body.toString());

      const res = await fetch(loginUrl, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      const text = await res.text();
      console.log("LOGIN STATUS:", res.status);
      console.log("LOGIN RESPONSE TEXT:", text);

      if (!res.ok) {
        setError(text || `Login failed: ${res.status}`);
        return;
      }

      const data = JSON.parse(text);
      localStorage.setItem("token", data.access_token);
      router.replace("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : messages.login.loginError;

      console.error(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard requireAuth={false} redirectTo="/dashboard">
      <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-2">
        <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-16 xl:px-20">
          <div className="w-full max-w-md text-center">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                Measurable
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {messages.login.title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
                {messages.login.description}
              </p>
            </div>

            <form
              onSubmit={handleLogin}
              className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-8 text-left shadow-sm"
            >
              <input
                type="email"
                placeholder={messages.login.email}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                type="password"
                placeholder={messages.login.password}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="submit"
                className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {loading ? messages.login.loggingIn : messages.login.login}
              </button>

              {error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : null}

              {!FEATURES.ENABLE_APP_REVIEW_MODE ? (
                <div className="pt-2 text-center">
                  <p className="text-sm text-slate-500">
                    {messages.login.noAccountYet}{" "}
                    <Link
                      href="/register"
                      className="font-semibold text-sky-700 transition hover:text-sky-800"
                    >
                      {messages.login.createAccount}
                    </Link>
                  </p>
                </div>
              ) : null}
            </form>

          </div>
        </section>

        <aside className="hidden border-l border-white/60 bg-[linear-gradient(135deg,#e0f2fe_0%,#f8fafc_48%,#ffffff_100%)] lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:px-16 lg:py-14 xl:px-20">
          <div className="max-w-lg">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
              {messages.login.platformUpdates}
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              {messages.login.updatesTitle}
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              {messages.login.updatesDescription}
            </p>
          </div>

          <div className="rounded-[32px] border border-white/70 bg-white/70 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-sm font-semibold text-slate-950">
              {messages.login.comingSoon}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {messages.login.comingSoonDescription}
            </p>
          </div>
        </aside>
      </div>
    </AuthGuard>
  );
}
