"use client";

import { useEffect } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/components/providers/LanguageProvider";
import { DesktopFlowSteps } from "@/components/reports/flow/DesktopFlowSteps";
import { MobileFlowHeader } from "@/components/reports/flow/MobileFlowHeader";
import { IntegrationLibrary } from "@/components/reports/IntegrationLibrary";
import { integrationCatalog, isMetaFrontendIntegrationKey } from "@/lib/integrations/catalog";
import {
  createEmptySelectedAccountsBySource,
  getIntegrationReportContext,
  setIntegrationReportContext,
} from "@/lib/integrations/session";

function NewReportFlowPageContent() {
  const { messages } = useI18n();
  const searchParams = useSearchParams();
  const shouldResumeSelection = searchParams.get("resume") === "1";
  const storedIntegrationContext = getIntegrationReportContext();
  const selectedIntegrationKeys = shouldResumeSelection
    ? storedIntegrationContext?.selectedSources?.length
      ? storedIntegrationContext.selectedSources
      : []
    : [];
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

  useEffect(() => {
    if (shouldResumeSelection || !storedIntegrationContext) {
      return;
    }

    setIntegrationReportContext({
      ...storedIntegrationContext,
      source: "",
      pageId: undefined,
      pageName: undefined,
      datasetId: undefined,
      synced: false,
      selectedSources: [],
      selectedAccountsBySource: createEmptySelectedAccountsBySource(),
      reportKind: "single_source",
    });
  }, [shouldResumeSelection, storedIntegrationContext]);

  return (
    <AppShell>
      <div className="-mx-4 -mt-4 space-y-5 bg-white px-4 pt-4 pb-6 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6 sm:pb-8">
        <MobileFlowHeader
          currentStep={currentStep}
          totalSteps={flowSteps.length}
          title={messages.reports.chooseSource}
          description={messages.reports.chooseSourceDescription}
        />
        <section className="p-5 sm:p-8">
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
            selectedIntegrationKeys={selectedIntegrationKeys}
            embedded
            connectedIntegrationKey={connectedIntegrationKey}
            mode="report-flow"
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
          <div className="-mx-4 -mt-4 bg-white px-4 pt-4 pb-6 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6 sm:pb-8">
            <section className="p-5 sm:p-8">
              <div className="space-y-3">
                <div className="h-6 w-48 animate-pulse rounded-full bg-slate-200" />
                <div className="h-24 animate-pulse rounded-[24px] bg-slate-100" />
              </div>
            </section>
          </div>
        </AppShell>
      }
    >
      <NewReportFlowPageContent />
    </Suspense>
  );
}
