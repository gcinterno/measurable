"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/components/providers/LanguageProvider";
import { DesktopFlowSteps } from "@/components/reports/flow/DesktopFlowSteps";
import { MobileFlowHeader } from "@/components/reports/flow/MobileFlowHeader";
import { FEATURES } from "@/config/features";
import {
  getIntegrationReportContext,
  setIntegrationReportContext,
} from "@/lib/integrations/session";
import { integrationCatalog } from "@/lib/integrations/catalog";
import {
  formatMetaTimeframeLabel,
  normalizeMetaTimeframeSelection,
} from "@/lib/integrations/timeframes";
import {
  canSelectSlideCount,
  getPlanCapabilities,
  shouldShowUpgradeCta,
} from "@/lib/workspace/plan-limits";
import { useActiveWorkspace } from "@/lib/workspace/use-active-workspace";

type TemplateType = "modern";

const templateOptions: {
  id: TemplateType;
  name: string;
  description: string;
  previewClass: string;
}[] = [
  {
    id: "modern",
    name: "Modern",
    description: "More visual contrast and highlighted blocks.",
    previewClass:
      "bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] border-slate-800",
  },
];

function NewReportFlowGeneratePageContent() {
  const { messages } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showSlideCountLimit = false;
  const storedIntegrationContext = getIntegrationReportContext();
  const integrationSource =
    searchParams.get("integration") || storedIntegrationContext?.source || "";
  const selectedIntegration = integrationCatalog.find(
    (integration) => integration.integrationKey === integrationSource
  );
  const datasetId = storedIntegrationContext?.datasetId || "";
  const currentStep = 3;
  const stepHrefMap: Record<number, string> = {
    1: integrationSource
      ? `/reports/new/flow?integration=${integrationSource}`
      : "/reports/new/flow",
    2: integrationSource
      ? `/reports/new/flow/sync?integration=${integrationSource}`
      : "/reports/new/flow/sync",
  };
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateType>("modern");
  const [selectedSlides, setSelectedSlides] = useState(5);
  const [aiMode, setAiMode] = useState<"standard" | "agents">(
    storedIntegrationContext?.aiMode || "standard"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { workspace, reportsUsedThisMonth } = useActiveWorkspace({
    includeReportsUsage: true,
  });
  const planCapabilities = getPlanCapabilities(workspace);
  const slideCountOptions = [{ value: 5, available: true }];
  const showUpgradeCta =
    !FEATURES.ENABLE_APP_REVIEW_MODE &&
    shouldShowUpgradeCta({
      workspace,
      reportsUsedThisMonth,
      estimatedSlides: selectedSlides,
    });
  const timeframeLabel = formatMetaTimeframeLabel({
    timeframe: storedIntegrationContext?.timeframe,
    startDate: storedIntegrationContext?.startDate,
    endDate: storedIntegrationContext?.endDate,
  });
  const flowSteps = [
    {
      id: 1,
      title: messages.reports.chooseSource,
      description: messages.reports.chooseSourceDescription,
    },
    {
      id: 2,
      title: messages.reports.syncData,
      description: messages.reports.syncDataDescription,
    },
    {
      id: 3,
      title: messages.reports.generateReport,
      description: messages.reports.generateReportDescription,
    },
    {
      id: 4,
      title: messages.reports.reviewResult,
      description: messages.reports.reviewResultDescription,
    },
  ] as const;

  function persistGenerateOptions(
    nextSlides: number,
    nextAiMode: "standard" | "agents"
  ) {
    const latestContext = getIntegrationReportContext();

    if (!latestContext) {
      return;
    }

    setIntegrationReportContext({
      ...latestContext,
      requestedSlides: nextSlides,
      aiMode: nextAiMode,
    });
  }

  function handleSelectSlides(nextSlides: number) {
    console.info("[PlanLimits][ui]", {
      currentPlan: planCapabilities.plan,
      maxSlides: planCapabilities.maxSlides,
      selectedSlides: nextSlides,
    });

    if (!canSelectSlideCount(planCapabilities, nextSlides)) {
      setError(
        `Your current plan supports up to ${planCapabilities.maxSlides} slides. Upgrade to select ${nextSlides}.`
      );
      return;
    }

    setError("");
    setSelectedSlides(nextSlides);
    persistGenerateOptions(nextSlides, aiMode);
  }

  function handleSelectAiMode(nextAiMode: "standard" | "agents") {
    const allowed =
      nextAiMode === "standard" || planCapabilities.canUseAiAgents;

    console.info("[AIAgents][ui]", {
      currentPlan: planCapabilities.plan,
      selectedAiMode: nextAiMode,
      allowed,
    });

    if (!allowed) {
      setError("AI Agents is available in Core and Advanced plans.");
      return;
    }

    setError("");
    setAiMode(nextAiMode);
    persistGenerateOptions(selectedSlides, nextAiMode);
  }

  useEffect(() => {
    if (selectedSlides <= planCapabilities.maxSlides) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSelectedSlides(planCapabilities.maxSlides);
      persistGenerateOptions(planCapabilities.maxSlides, aiMode);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [aiMode, planCapabilities.maxSlides, selectedSlides]);

  async function handleGenerateReport() {
    if (!datasetId || !storedIntegrationContext?.synced) {
      setError(
        messages.reports.noDatasetYet
      );
      return;
    }

    if (!canSelectSlideCount(planCapabilities, selectedSlides)) {
      setError(
        `Your current plan supports up to ${planCapabilities.maxSlides} slides. Choose a smaller report or upgrade.`
      );
      return;
    }

    setLoading(true);
    setError("");
    const requestedAiMode =
      aiMode === "agents" && planCapabilities.canUseAiAgents
        ? "agents"
        : "standard";
    const normalizedSelection = normalizeMetaTimeframeSelection({
      preset: storedIntegrationContext.timeframe,
      startDate: storedIntegrationContext.startDate,
      endDate: storedIntegrationContext.endDate,
    });

    persistGenerateOptions(selectedSlides, requestedAiMode);
    console.info("[MetaTimeframe][flow.generate.before]", {
      datasetId,
      synced: storedIntegrationContext.synced,
      persistedTimeframe: storedIntegrationContext.timeframe,
      persistedContext: storedIntegrationContext,
      timeframeSelection: normalizedSelection,
      createReportPayload: {
        dataset_id: Number(datasetId),
        timeframe: normalizedSelection.key,
        start_date: normalizedSelection.startDate,
        end_date: normalizedSelection.endDate,
        requested_slides: selectedSlides,
        ai_mode: requestedAiMode,
      },
    });
    console.info("[PlanLimits][generate.request]", {
      currentPlan: planCapabilities.plan,
      plan: planCapabilities.plan,
      requestedSlides: selectedSlides,
      datasetId,
    });
    console.info("[AIAgents][generate.request]", {
      datasetId,
      requestedSlides: selectedSlides,
      aiMode: requestedAiMode,
    });

    router.replace(
      `/reports/new/flow/review?integration=${integrationSource}&template=${selectedTemplate}&generate=1`
    );
  }

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <MobileFlowHeader
          currentStep={currentStep}
          totalSteps={flowSteps.length}
          title={messages.reports.generateReport}
          description={messages.reports.generateReportDescription}
          backHref={stepHrefMap[2]}
        />
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="hidden max-w-3xl md:block">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
              {messages.review.guidedFlow}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {messages.reports.generateReport}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              {messages.reports.generateReportDescription}
            </p>
          </div>

          <DesktopFlowSteps
            steps={flowSteps}
            currentStep={currentStep}
            stepLabel={messages.common.step}
            clickableHrefMap={stepHrefMap}
          />

          <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
              {messages.reports.preparedData}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">
              {selectedIntegration?.name || messages.reports.integrationReady}
            </h2>
            <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <section className="rounded-[20px] border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                  {messages.reports.timeframe}
                </p>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-950">{timeframeLabel}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    This period was selected during the sync step.
                  </p>
                  <Link
                    href={`/reports/new/flow/sync?integration=${integrationSource}`}
                    className="mt-3 inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Change period
                  </Link>
                </div>
              </section>

              <section className="rounded-[20px] border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                  Slides
                </p>
                {showSlideCountLimit && !FEATURES.ENABLE_APP_REVIEW_MODE ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Max slides: {planCapabilities.maxSlides}
                  </p>
                ) : null}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {slideCountOptions.map((option) => {
                    const active = option.value === selectedSlides;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelectSlides(option.value)}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          active
                            ? "border-slate-950 bg-slate-950 text-white"
                            : option.available
                              ? "border-slate-200 bg-slate-50 text-slate-950 hover:bg-slate-100"
                              : "border-slate-200 bg-white text-slate-400 hover:border-amber-200 hover:bg-amber-50"
                        }`}
                      >
                        <span className="block text-lg font-semibold">{option.value} slides</span>
                      </button>
                    );
                  })}
                </div>
                {showUpgradeCta ? (
                  <Link
                    href="/plans"
                    className="mt-4 inline-flex rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-800"
                  >
                    Upgrade plan
                  </Link>
                ) : null}
              </section>

              {FEATURES.ENABLE_AI_AGENTS_MODE ? (
                <section className="rounded-[20px] border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                    AI mode
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAiMode("standard")}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        aiMode === "standard"
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-950 hover:bg-slate-100"
                      }`}
                    >
                      <span className="block text-sm font-semibold">Standard</span>
                      <span
                        className={`mt-1 block text-sm ${
                          aiMode === "standard" ? "text-slate-200" : "text-slate-500"
                        }`}
                      >
                        Usa el generador actual de Measurable.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectAiMode("agents")}
                      disabled={!planCapabilities.canUseAiAgents}
                      className={`rounded-2xl border px-4 py-4 text-left transition disabled:cursor-not-allowed ${
                        aiMode === "agents"
                          ? "border-slate-950 bg-slate-950 text-white"
                          : planCapabilities.canUseAiAgents
                            ? "border-slate-200 bg-slate-50 text-slate-950 hover:bg-slate-100"
                            : "border-amber-200 bg-amber-50 text-amber-900"
                      }`}
                    >
                      <span className="block text-sm font-semibold">AI Agents</span>
                      <span
                        className={`mt-1 block text-sm ${
                          aiMode === "agents"
                            ? "text-slate-200"
                            : planCapabilities.canUseAiAgents
                              ? "text-slate-500"
                              : "text-amber-800"
                        }`}
                      >
                        {planCapabilities.canUseAiAgents
                          ? "Usa agentes para proponer estructura, insights y estilo del reporte."
                          : "Disponible en Core y Advanced."}
                      </span>
                    </button>
                  </div>
                  {!planCapabilities.canUseAiAgents ? (
                    <Link
                      href="/plans"
                      className="mt-4 inline-flex rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                    >
                      Upgrade plan
                    </Link>
                  ) : null}
                </section>
              ) : null}

              <section className="rounded-[20px] border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                  {messages.reports.reportTemplate}
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {templateOptions.map((template) => {
                    const active = template.id === selectedTemplate;

                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedTemplate(template.id)}
                        className={`rounded-[20px] border p-3 text-left transition ${
                          active
                            ? "border-slate-950 bg-slate-950/5 shadow-[0_0_0_1px_rgba(15,23,42,0.12)]"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`rounded-[16px] border p-3 ${template.previewClass}`}
                        >
                          <div
                            className={`rounded-full ${
                              template.id === "modern"
                                ? "bg-white/30"
                                : "bg-slate-200"
                            } h-2.5 w-16`}
                          />
                          <div className="mt-3 space-y-2">
                            <div
                              className={`h-3 rounded-full ${
                                template.id === "modern"
                                  ? "bg-white/80"
                                  : "bg-slate-300"
                              }`}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div
                                className={`h-12 rounded-xl ${
                                  template.id === "modern"
                                    ? "bg-white/15"
                                    : "bg-slate-200"
                                }`}
                              />
                              <div
                                className={`h-12 rounded-xl ${
                                  template.id === "modern"
                                    ? "bg-white/10"
                                    : "bg-slate-100"
                                }`}
                              />
                            </div>
                            <div
                              className={`h-16 rounded-2xl ${
                                template.id === "modern"
                                  ? "bg-white/10"
                                  : "bg-slate-100"
                              }`}
                            />
                          </div>
                        </div>
                        <h3 className="mt-3 text-sm font-semibold text-slate-950">
                          {template.name}
                        </h3>
                        <p className="mt-1 text-sm leading-5 text-slate-500">
                          {template.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={`/reports/new/flow/sync?integration=${integrationSource}`}
                className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                {messages.common.back}
              </Link>
              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : null}
                {loading ? messages.reports.generating : messages.reports.generateReport}
              </button>
            </div>

            {error ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export default function NewReportFlowGeneratePage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="space-y-3">
              <div className="h-6 w-48 animate-pulse rounded-full bg-slate-200" />
              <div className="h-24 animate-pulse rounded-[24px] bg-slate-100" />
            </div>
          </section>
        </AppShell>
      }
    >
      <NewReportFlowGeneratePageContent />
    </Suspense>
  );
}
