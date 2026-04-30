"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/components/providers/LanguageProvider";
import { DesktopFlowSteps } from "@/components/reports/flow/DesktopFlowSteps";
import { MobileFlowHeader } from "@/components/reports/flow/MobileFlowHeader";
import { IntegrationLibrary } from "@/components/reports/IntegrationLibrary";
import { integrationCatalog, isMetaFrontendIntegrationKey } from "@/lib/integrations/catalog";
import { getIntegrationReportContext } from "@/lib/integrations/session";

function NewReportFlowPageContent() {
  const { messages } = useI18n();
  const searchParams = useSearchParams();
  const sourceParam = searchParams.get("source");
  const integrationParam = searchParams.get("integration");
  const storedIntegrationContext = getIntegrationReportContext();
  const integrationSource =
    sourceParam || integrationParam || storedIntegrationContext?.source || "";
  const selectedIntegration = integrationCatalog.find(
    (integration) => integration.integrationKey === integrationSource
  );
  const connectedIntegrationKey =
    storedIntegrationContext?.integrationId &&
      isMetaFrontendIntegrationKey(storedIntegrationContext?.source)
      ? storedIntegrationContext.source
      : undefined;
  const currentStep = 1;
  const flowSteps = [
    {
      id: 1,
      title: messages.reports.chooseSource,
      description: messages.reports.chooseSourceDescription,
    },
    {
      id: 2,
      title: messages.reports.connectPrepare,
      description: messages.reports.connectPrepareDescription,
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

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <MobileFlowHeader
          currentStep={currentStep}
          totalSteps={flowSteps.length}
          title={messages.reports.chooseSource}
          description={messages.reports.chooseSourceDescription}
        />
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="hidden max-w-3xl md:block">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
              {messages.review.guidedFlow}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {messages.reports.createStepByStep}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              {messages.reports.createStepByStepDescription}
            </p>
          </div>

          <DesktopFlowSteps
            steps={flowSteps}
            currentStep={currentStep}
            stepLabel={messages.common.step}
          />

          <IntegrationLibrary
            integrations={integrationCatalog}
            selectedIntegrationKey={selectedIntegration?.integrationKey}
            embedded
            connectedIntegrationKey={connectedIntegrationKey}
          />
        </section>
      </div>
    </AppShell>
  );
}

export default function NewReportFlowPage() {
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
      <NewReportFlowPageContent />
    </Suspense>
  );
}
