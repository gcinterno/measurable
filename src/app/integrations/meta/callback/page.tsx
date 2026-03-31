"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { completeMetaIntegrationCallback } from "@/lib/api/integrations";

export const dynamic = "force-dynamic";

function CallbackStatusCard({ error }: { error: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
          Meta callback
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Cerrando conexion con Facebook Pages
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Estamos validando el callback con el backend y te regresaremos a la plataforma automaticamente.
        </p>

        {error ? (
          <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            Procesando autorizacion...
          </div>
        )}
      </section>
    </main>
  );
}

function MetaIntegrationCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function finishCallback() {
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (errorParam) {
        if (!active) {
          return;
        }

        setError(
          errorDescription ||
            "Facebook no completo la autorizacion. Intenta nuevamente."
        );
        return;
      }

      try {
        const callbackParams = new URLSearchParams(searchParams.toString());
        callbackParams.set(
          "redirect_uri",
          `${window.location.origin}/integrations/meta/callback`
        );

        const result = await completeMetaIntegrationCallback(callbackParams);

        if (!active) {
          return;
        }

        const nextParams = new URLSearchParams();
        nextParams.set("status", result.connected ? "connected" : "pending");

        if (result.integrationId) {
          nextParams.set("integration_id", result.integrationId);
        }

        if (result.message) {
          nextParams.set("message", result.message);
        }

        router.replace(`/integrations?${nextParams.toString()}`);
      } catch (err: unknown) {
        console.error("meta callback completion error:", err);

        if (!active) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "No pudimos completar la conexion con Meta."
        );
      }
    }

    finishCallback();

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return <CallbackStatusCard error={error} />;
}

export default function MetaIntegrationCallbackPage() {
  return (
    <Suspense fallback={<CallbackStatusCard error="" />}>
      <MetaIntegrationCallbackContent />
    </Suspense>
  );
}
