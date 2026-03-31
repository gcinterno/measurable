"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { DashboardHeroCarousel } from "@/components/dashboard/DashboardHeroCarousel";
import { AppShell } from "@/components/layout/AppShell";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { RecentReportCard } from "@/components/dashboard/RecentReportCard";
import { IntegrationDropzoneCard } from "@/components/reports/IntegrationDropzoneCard";
import { fetchCurrentUser } from "@/lib/api/me";
import { fetchReports } from "@/lib/api/reports";
import { integrationCatalog } from "@/lib/integrations/catalog";
import type { User } from "@/types/auth";
import type { Report } from "@/types/report";

const quickActions = [
  {
    title: "Nuevo reporte",
    description: "Empieza un reporte nuevo desde el flujo principal.",
    href: "/reports/new/flow",
    icon: "plus" as const,
  },
  {
    title: "Ver reportes",
    description: "Retoma reportes existentes y revisa resultados.",
    href: "/reports",
    icon: "reports" as const,
  },
  {
    title: "Integraciones",
    description: "Conecta fuentes y prepara nuevos flujos.",
    href: "/integrations",
    icon: "integrations" as const,
  },
];

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportsAvailable, setReportsAvailable] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const [userData, reportResult] = await Promise.all([
          fetchCurrentUser().catch(() => null),
          fetchReports()
            .then((data) => ({ data, available: true }))
            .catch(() => ({ data: [] as Report[], available: false })),
        ]);

        if (!active) {
          return;
        }

        setUser(userData);
        setReports(reportResult.data.slice(0, 5));
        setReportsAvailable(reportResult.available);
      } catch (err: unknown) {
        if (!active) {
          return;
        }

        console.error("dashboard load error:", err);
        setError(
          "No pudimos cargar tu dashboard en este momento. Intenta de nuevo en unos segundos."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <AppShell>
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="space-y-3">
            <div className="h-6 w-52 animate-pulse rounded-full bg-slate-200" />
            <div className="h-28 animate-pulse rounded-[24px] bg-slate-100" />
            <div className="h-28 animate-pulse rounded-[24px] bg-slate-100" />
          </div>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <section className="rounded-[28px] border border-red-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">
            Error
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            No fue posible cargar el dashboard
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
            {error}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Si el problema persiste, revisa tu sesion o vuelve a entrar en unos minutos.
          </p>
        </section>
      </AppShell>
    );
  }

  const userName = user?.name || "equipo";

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <DashboardHeroCarousel userName={userName} />

        <IntegrationDropzoneCard />

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Reportes recientes</h3>
              <p className="mt-1 text-sm text-slate-500">Retoma el trabajo pendiente sin buscar en toda la libreria.</p>
            </div>
            <Link href="/reports" className="text-sm font-medium text-sky-700">
              Ver todos
            </Link>
          </div>

          {reports.length > 0 ? (
            <div className="mt-6 space-y-3">
              {reports.map((report) => (
                <RecentReportCard key={report.id} report={report} />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6">
              <p className="font-medium text-slate-950">
                {reportsAvailable
                  ? "Aun no hay reportes recientes."
                  : "Todavia no podemos mostrar reportes recientes."}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {reportsAvailable
                  ? "Crea tu primer reporte para que aparezca aqui en cuanto este listo."
                  : "Tu dashboard sigue disponible aunque la libreria de reportes todavia no responda."}
              </p>
              <Link
                href="/reports/new/flow"
                className="mt-4 inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Nuevo reporte
              </Link>
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Integraciones</h3>
              <p className="mt-1 text-sm text-slate-500">Conectores visibles en una sola fila con acceso directo.</p>
            </div>
            <Link
              href="/integrations"
              className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Ver todas las integraciones
            </Link>
          </div>
          <div className="mt-6 flex gap-3 overflow-x-auto pb-1">
            {integrationCatalog.map((integration) => (
              <div
                key={integration.integrationKey}
                className="flex min-w-[148px] shrink-0 flex-col items-center justify-center rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200">
                  <Image
                    src={integration.logoUrl}
                    alt={integration.logoAlt}
                    width={24}
                    height={24}
                    className="h-6 w-6"
                    unoptimized
                  />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-950">
                  {integration.name}
                </p>
                <Link
                  href={integration.detailHref || "/integrations"}
                  className="mt-4 inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Conectar
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-lg font-semibold text-slate-950">Acciones rapidas</h3>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {quickActions.map((action) => (
              <QuickActionCard
                key={action.title}
                title={action.title}
                description={action.description}
                href={action.href}
                icon={action.icon}
              />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
