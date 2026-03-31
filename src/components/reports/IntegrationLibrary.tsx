"use client";

import Image from "next/image";
import Link from "next/link";

import type { IntegrationCatalogItem } from "@/lib/integrations/catalog";

type IntegrationLibraryProps = {
  integrations: readonly IntegrationCatalogItem[];
  selectedIntegrationKey?: string;
  embedded?: boolean;
};

function getBadgeClasses(status: IntegrationCatalogItem["status"]) {
  switch (status) {
    case "Conectado":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
    case "Disponible":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
    case "Próximamente":
    default:
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  }
}

export function IntegrationLibrary({
  integrations,
  selectedIntegrationKey,
  embedded = false,
}: IntegrationLibraryProps) {
  return (
    <section
      className={
        embedded
          ? "mt-8"
          : "rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
            {embedded ? "Paso 1" : "All integrations"}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {embedded ? "Elige una integración" : "Todas las integraciones"}
          </h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-500">
          {embedded
            ? "Selecciona la fuente desde la que quieres empezar el reporte."
            : "La lista queda visible debajo del dropzone para que el usuario vea de inmediato todas las fuentes disponibles y futuras."}
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map((integration) => {
          const selected = integration.integrationKey === selectedIntegrationKey;

          return (
            <article
              key={integration.integrationKey}
              className={`rounded-[24px] border p-4 transition ${
                selected
                  ? "border-sky-300 bg-sky-50/60 shadow-[0_0_0_1px_rgba(125,211,252,0.45)]"
                  : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
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
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClasses(
                    integration.status
                  )}`}
                >
                  {selected ? "Seleccionada" : integration.status}
                </span>
              </div>

              <h3 className="mt-4 text-lg font-semibold text-slate-950">
                {integration.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {integration.description}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href={
                    embedded && integration.status === "Disponible"
                      ? `/reports/new/flow/sync?integration=${integration.integrationKey}`
                      : integration.detailHref || "/integrations"
                  }
                  className={`inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                    integration.status === "Disponible"
                      ? "bg-slate-950 !text-white hover:bg-slate-800"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {integration.status === "Disponible"
                    ? embedded
                      ? "Confirmar integración"
                      : "Usar integracion"
                    : "Ver integracion"}
                </Link>
                {selected ? (
                  <span className="text-sm font-medium text-sky-700">
                    Fuente detectada en este reporte
                  </span>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
