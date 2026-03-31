"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { apiUrl } from "@/lib/api/config";

export default function LoginPage() {
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
      const message = err instanceof Error ? err.message : "Login error";

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
                Inicia sesion en tu espacio de trabajo
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
                Accede a tus reportes, integraciones y flujos de analisis desde un solo lugar.
              </p>
            </div>

            <form
              onSubmit={handleLogin}
              className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-8 text-left shadow-sm"
            >
              <input
                type="email"
                placeholder="Email"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                type="password"
                placeholder="Password"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="submit"
                className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {loading ? "Logging in..." : "Login"}
              </button>

              {error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : null}
            </form>

            <div className="mt-5">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  o continua con
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <path
                      fill="#EA4335"
                      d="M12.24 10.285v3.821h5.445c-.239 1.228-.957 2.268-2.037 2.964l3.294 2.554c1.92-1.768 3.028-4.37 3.028-7.457 0-.707-.064-1.387-.183-2.05h-9.547Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 22c2.7 0 4.964-.896 6.618-2.431l-3.294-2.554c-.916.614-2.087.977-3.324.977-2.551 0-4.712-1.722-5.483-4.036H3.111v2.637A9.996 9.996 0 0 0 12 22Z"
                    />
                    <path
                      fill="#4A90E2"
                      d="M6.517 13.956A5.997 5.997 0 0 1 6.21 12c0-.679.117-1.338.307-1.956V7.407H3.111A9.996 9.996 0 0 0 2 12c0 1.611.386 3.135 1.111 4.593l3.406-2.637Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M12 6.008c1.468 0 2.785.505 3.821 1.496l2.865-2.865C16.959 3.027 14.695 2 12 2A9.996 9.996 0 0 0 3.111 7.407l3.406 2.637C7.288 7.73 9.449 6.008 12 6.008Z"
                    />
                  </svg>
                  Google
                </button>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#1877F2]" aria-hidden="true">
                    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.024 4.388 11.018 10.125 11.927v-8.437H7.078v-3.49h3.047V9.413c0-3.018 1.792-4.687 4.533-4.687 1.313 0 2.686.236 2.686.236v2.963H15.83c-1.491 0-1.956.931-1.956 1.887v2.261h3.328l-.532 3.49h-2.796V24C19.612 23.091 24 18.097 24 12.073Z" />
                  </svg>
                  Facebook
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="hidden border-l border-white/60 bg-[linear-gradient(135deg,#e0f2fe_0%,#f8fafc_48%,#ffffff_100%)] lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:px-16 lg:py-14 xl:px-20">
          <div className="max-w-lg">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
              Novedades de la plataforma
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              Espacio reservado para comunicar mejoras y lanzamientos
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Esta mitad queda libre para mostrar anuncios de producto, novedades del equipo o mensajes clave para los usuarios.
            </p>
          </div>

          <div className="rounded-[32px] border border-white/70 bg-white/70 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-sm font-semibold text-slate-950">
              Próximamente
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Aquí podrás colocar cards, highlights o un carrusel ligero con novedades relevantes de Measurable.
            </p>
          </div>
        </aside>
      </div>
    </AuthGuard>
  );
}
