"use client";

import type { ChangeEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/components/providers/LanguageProvider";
import { DesktopFlowSteps } from "@/components/reports/flow/DesktopFlowSteps";
import { MobileFlowHeader } from "@/components/reports/flow/MobileFlowHeader";
import { FEATURES } from "@/config/features";
import { getMeasurableBrandingOverride } from "@/lib/branding";
import { API_URL } from "@/lib/api/config";
import {
  getIntegrationReportContext,
  setIntegrationReportContext,
} from "@/lib/integrations/session";
import {
  integrationCatalog,
  isMetaFrontendIntegrationKey,
} from "@/lib/integrations/catalog";
import {
  formatMetaTimeframeLabel,
  normalizeMetaTimeframeSelection,
} from "@/lib/integrations/timeframes";
import {
  canSelectSlideCount,
  getSlideCountOptions,
  getPlanCapabilities,
} from "@/lib/workspace/plan-limits";
import { useActiveWorkspace } from "@/lib/workspace/use-active-workspace";
import {
  updateWorkspaceBranding,
  uploadWorkspaceBrandLogo,
} from "@/lib/api/workspaces";
import {
  type ReportTemplateId,
  resolveReportTemplateSelection,
} from "@/lib/reports/template-selection";
import { resolveAssetUrl } from "@/lib/reports/branding";
import { usePreferencesStore } from "@/lib/store/preferences-store";

const templateOptions: {
  id: ReportTemplateId;
  name: string;
  description: string;
  previewSrc: string;
}[] = [
  {
    id: "executive",
    name: "Ejecutivo",
    description: "Contraste alto y lectura clara para presentaciones ejecutivas.",
    previewSrc: "/templates/template-executive.svg",
  },
  {
    id: "simple",
    name: "Report Simple",
    description: "Clean light report style for simple executive summaries",
    previewSrc: "/templates/template-modern.svg",
  },
  {
    id: "modern",
    name: "Moderno",
    description: "Fondo blanco, limpio y visualmente ligero.",
    previewSrc: "/templates/template-modern.svg",
  },
];

const LOGO_CROP_SIZE = 512;
const MAX_BRAND_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_BRAND_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
]);

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("The file could not be read."));
    reader.readAsDataURL(file);
  });
}

function loadImageDimensions(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => reject(new Error("The image could not be loaded."));
    image.src = src;
  });
}

async function buildCroppedLogo(input: {
  src: string;
  width: number;
  height: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
}) {
  const image = new Image();
  image.src = input.src;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("The image could not be loaded."));
  });

  const canvas = document.createElement("canvas");
  canvas.width = LOGO_CROP_SIZE;
  canvas.height = LOGO_CROP_SIZE;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available.");
  }

  const minDimension = Math.min(input.width, input.height);
  const cropSize = minDimension / input.zoom;
  const maxX = Math.max(0, input.width - cropSize);
  const maxY = Math.max(0, input.height - cropSize);
  const sourceX = Math.min(Math.max(input.offsetX, 0), maxX);
  const sourceY = Math.min(Math.max(input.offsetY, 0), maxY);

  context.clearRect(0, 0, LOGO_CROP_SIZE, LOGO_CROP_SIZE);
  context.drawImage(
    image,
    sourceX,
    sourceY,
    cropSize,
    cropSize,
    0,
    0,
    LOGO_CROP_SIZE,
    LOGO_CROP_SIZE
  );

  return canvas.toDataURL("image/png");
}

function NewReportFlowGeneratePageContent() {
  const { messages } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preferences = usePreferencesStore();
  const showSlideCountLimit = false;
  const storedIntegrationContext = getIntegrationReportContext();
  const integrationSource =
    searchParams.get("integration") || storedIntegrationContext?.source || "";
  const selectedSources =
    storedIntegrationContext?.selectedSources?.length
      ? storedIntegrationContext.selectedSources
      : integrationSource
        ? [integrationSource]
        : [];
  const normalizedSelectedSources = selectedSources.filter(isMetaFrontendIntegrationKey);
  const selectedAccountsBySource = storedIntegrationContext?.selectedAccountsBySource;
  const isMultiSourceReport = normalizedSelectedSources.length >= 2;
  const primarySource = normalizedSelectedSources[0] || integrationSource;
  const selectedIntegration = integrationCatalog.find(
    (integration) => integration.integrationKey === primarySource
  );
  const datasetId = storedIntegrationContext?.datasetId || "";
  const currentStep = 3;
  const stepHrefMap: Record<number, string> = {
    1: primarySource
      ? `/reports/new/flow?resume=1&integration=${primarySource}`
      : "/reports/new/flow?resume=1",
    2: primarySource
      ? `/reports/new/flow/sync?integration=${primarySource}`
      : "/reports/new/flow/sync",
  };
  const [selectedTemplate, setSelectedTemplate] =
    useState<ReportTemplateId>(
      resolveReportTemplateSelection(storedIntegrationContext?.templateId)
    );
  const [selectedSlides, setSelectedSlides] = useState(
    storedIntegrationContext?.requestedSlides || 5
  );
  const [aiMode, setAiMode] = useState<"standard" | "agents">(
    storedIntegrationContext?.aiMode || "standard"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [brandNameDraft, setBrandNameDraft] = useState(() => preferences.brandName ?? "Measurable");
  const [brandLogoDraft, setBrandLogoDraft] = useState(() => preferences.logoDataUrl || "");
  const [brandAssetsError, setBrandAssetsError] = useState("");
  const [brandAssetsSaved, setBrandAssetsSaved] = useState(false);
  const [brandAssetsSaving, setBrandAssetsSaving] = useState(false);
  const [brandLogoUploading, setBrandLogoUploading] = useState(false);
  const [brandLogoRemoved, setBrandLogoRemoved] = useState(false);
  const [brandLogoPreviewFailed, setBrandLogoPreviewFailed] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropSource, setCropSource] = useState("");
  const [cropSourceWidth, setCropSourceWidth] = useState(0);
  const [cropSourceHeight, setCropSourceHeight] = useState(0);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);
  const { workspace, reportsUsedThisMonth } = useActiveWorkspace({
    includeReportsUsage: true,
  });
  const isFreePlan = workspace?.plan?.trim().toLowerCase() === "free";
  const planCapabilities = getPlanCapabilities(workspace);
  const measurableBranding = getMeasurableBrandingOverride(workspace);
  const slideCountOptions = getSlideCountOptions(planCapabilities).map((option) => ({
    ...option,
    available: isMultiSourceReport ? option.value === 10 : option.available,
  }));
  const timeframeLabel = formatMetaTimeframeLabel({
    timeframe: storedIntegrationContext?.timeframe,
    startDate: storedIntegrationContext?.startDate,
    endDate: storedIntegrationContext?.endDate,
  });
  const brandName = brandNameDraft;
  const brandLogoUrl = brandLogoDraft || measurableBranding?.logoUrl || "";
  const resolvedBrandLogoPreviewUrl = useMemo(
    () => resolveAssetUrl(brandLogoUrl, API_URL, { workspaceId: workspace?.id }) || "",
    [brandLogoUrl, workspace?.id]
  );
  const cropDragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originOffsetX: number;
    originOffsetY: number;
  } | null>(null);
  const cropMinDimension = useMemo(
    () => Math.min(cropSourceWidth || 0, cropSourceHeight || 0),
    [cropSourceHeight, cropSourceWidth]
  );
  const cropVisibleSize = cropMinDimension > 0 ? cropMinDimension / cropZoom : 0;
  const cropPreviewScale = cropVisibleSize > 0 ? 240 / cropVisibleSize : 1;
  const cropPreviewImageStyle =
    cropSourceWidth > 0 && cropSourceHeight > 0
      ? {
          width: `${cropSourceWidth * cropPreviewScale}px`,
          height: `${cropSourceHeight * cropPreviewScale}px`,
          maxWidth: "none",
          transform: `translate(${-cropOffsetX * cropPreviewScale}px, ${-cropOffsetY * cropPreviewScale}px)`,
        }
      : undefined;
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
    nextAiMode: "standard" | "agents",
    nextTemplateId = selectedTemplate
  ) {
    const latestContext = getIntegrationReportContext();

    if (!latestContext) {
      return;
    }

    setIntegrationReportContext({
      ...latestContext,
      requestedSlides: nextSlides,
      aiMode: nextAiMode,
      templateId: nextTemplateId,
    });
  }

  function handleSelectSlides(nextSlides: number) {
    if (isMultiSourceReport && nextSlides !== 10) {
      setError(
        "Multi-source reports require the 10-slide format to include platform comparisons and cross-channel insights."
      );
      return;
    }

    console.info("[PlanLimits][ui]", {
      currentPlan: planCapabilities.plan,
      maxSlides: planCapabilities.maxSlides,
      selectedSlides: nextSlides,
    });

    if (!isMultiSourceReport && !canSelectSlideCount(planCapabilities, nextSlides)) {
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
      setError("AI Agents is available on the Advanced plan.");
      return;
    }

    setError("");
    setAiMode(nextAiMode);
    persistGenerateOptions(selectedSlides, nextAiMode);
  }

  function handleSelectTemplate(nextTemplateId: ReportTemplateId) {
    setSelectedTemplate(nextTemplateId);
    persistGenerateOptions(selectedSlides, aiMode, nextTemplateId);
  }

  function clampCropOffsets(nextOffsetX: number, nextOffsetY: number, nextZoom = cropZoom) {
    const nextVisibleSize = cropMinDimension > 0 ? cropMinDimension / nextZoom : 0;
    const nextMaxX = Math.max(0, cropSourceWidth - nextVisibleSize);
    const nextMaxY = Math.max(0, cropSourceHeight - nextVisibleSize);

    return {
      offsetX: Math.min(Math.max(nextOffsetX, 0), nextMaxX),
      offsetY: Math.min(Math.max(nextOffsetY, 0), nextMaxY),
    };
  }

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!ALLOWED_BRAND_LOGO_TYPES.has(file.type) || file.size > MAX_BRAND_LOGO_SIZE_BYTES) {
      setBrandAssetsSaved(false);
      setBrandAssetsError("We could not upload the logo right now.");
      return;
    }

    try {
      setBrandAssetsError("");
      const dataUrl = await readFileAsDataUrl(file);
      const dimensions = await loadImageDimensions(dataUrl);
      const minDimension = Math.min(dimensions.width, dimensions.height);

      setCropSource(dataUrl);
      setCropSourceWidth(dimensions.width);
      setCropSourceHeight(dimensions.height);
      setCropZoom(1);
      setCropOffsetX(Math.max(0, (dimensions.width - minDimension) / 2));
      setCropOffsetY(Math.max(0, (dimensions.height - minDimension) / 2));
      setCropModalOpen(true);
    } catch (readError) {
      console.error("generate flow logo file error:", readError);
      setBrandAssetsSaved(false);
      setBrandAssetsError("We could not upload the logo right now.");
    }
  }

  async function handleApplyLogoCrop() {
    if (!cropSource || !cropSourceWidth || !cropSourceHeight) {
      return;
    }

    try {
      setBrandLogoUploading(true);
      setBrandAssetsSaved(false);
      setBrandAssetsError("");
      const dataUrl = await buildCroppedLogo({
        src: cropSource,
        width: cropSourceWidth,
        height: cropSourceHeight,
        zoom: cropZoom,
        offsetX: cropOffsetX,
        offsetY: cropOffsetY,
      });
      const logoBlob = await fetch(dataUrl).then((response) => response.blob());
      const uploadedLogo = await uploadWorkspaceBrandLogo(
        new File([logoBlob], "brand-logo.png", { type: "image/png" })
      );

      setBrandLogoDraft(uploadedLogo.logoUrl);
      setBrandLogoPreviewFailed(false);
      setBrandLogoRemoved(false);
      setBrandAssetsSaved(false);
      setBrandAssetsError("");
      setCropModalOpen(false);
    } catch (cropError) {
      console.error("generate flow logo upload error:", {
        endpoint: "/workspace/branding/logo",
        error: cropError,
      });
      setBrandAssetsSaved(false);
      setBrandAssetsError("We could not upload the logo right now.");
    } finally {
      setBrandLogoUploading(false);
    }
  }

  function handleRemoveLogo() {
    setBrandLogoDraft("");
    setBrandLogoPreviewFailed(false);
    setBrandLogoRemoved(true);
    setBrandAssetsSaved(false);
    setBrandAssetsError("");
  }

  function handleBrandNameChange(nextBrandName: string) {
    setBrandNameDraft(nextBrandName);
    setBrandAssetsSaved(false);
    if (brandAssetsError && nextBrandName.trim()) {
      setBrandAssetsError("");
    }
  }

  useEffect(() => {
    const backendBrandName = workspace?.branding?.brandName;
    const backendLogoUrl = workspace?.branding?.logoUrl;

    if (backendBrandName) {
      setBrandNameDraft(backendBrandName);
    }

    setBrandLogoDraft(backendLogoUrl || "");
    setBrandLogoPreviewFailed(false);
    setBrandLogoRemoved(false);
  }, [workspace?.branding?.brandName, workspace?.branding?.logoUrl]);

  async function handleSaveBrandAssets() {
    const normalizedBrandName = brandNameDraft.trim();

    if (!normalizedBrandName) {
      setBrandAssetsSaved(false);
      setBrandAssetsError("Please enter a valid Brand name.");
      return;
    }

    if (!workspace?.id) {
      setBrandAssetsSaved(false);
      setBrandAssetsError("Workspace is not ready yet. Please try again.");
      return;
    }

    try {
      setBrandAssetsSaving(true);
      setBrandAssetsError("");
      const payload = {
        brandName: normalizedBrandName,
        ...(brandLogoRemoved
          ? { removeLogo: true as const }
          : brandLogoDraft
            ? { logoUrl: brandLogoDraft }
            : {}),
      };
      const { workspace: updatedWorkspace } = await updateWorkspaceBranding(
        workspace.id,
        payload
      );
      const savedBrandName = updatedWorkspace.branding?.brandName || normalizedBrandName;
      const savedLogoUrl = updatedWorkspace.branding?.logoUrl || "";

      preferences.updatePreferences({
        brandName: savedBrandName,
        logoDataUrl: savedLogoUrl,
        logoSource: savedLogoUrl ? "workspace" : "",
      });
      setBrandNameDraft(savedBrandName);
      setBrandLogoDraft(savedLogoUrl);
      setBrandLogoPreviewFailed(false);
      setBrandLogoRemoved(false);
      setBrandAssetsError("");
      setBrandAssetsSaved(true);
    } catch (saveError) {
      console.error("generate flow brand assets save error:", {
        endpoint: "/workspace/branding",
        payload: {
          brand_name: normalizedBrandName,
          ...(brandLogoRemoved
            ? { remove_logo: true }
            : brandLogoDraft
              ? { logo_url: brandLogoDraft }
              : {}),
        },
        error: saveError,
      });
      setBrandAssetsSaved(false);
      setBrandAssetsError("We could not save Brand Assets right now.");
    } finally {
      setBrandAssetsSaving(false);
    }
  }

  useEffect(() => {
    if (isMultiSourceReport && selectedSlides !== 10) {
      const timeoutId = window.setTimeout(() => {
        setSelectedSlides(10);
        persistGenerateOptions(10, aiMode);
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    return undefined;
  }, [aiMode, isMultiSourceReport, selectedSlides]);

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
  }, [aiMode, isMultiSourceReport, planCapabilities.maxSlides, selectedSlides]);

  async function handleGenerateReport() {
    const hasValidSourceCount =
      normalizedSelectedSources.length >= 1 &&
      normalizedSelectedSources.length <= 2;
    const isSourceConfigured = (sourceKey: string) => {
      if (!isMetaFrontendIntegrationKey(sourceKey)) {
        return false;
      }

      const configuredSource = selectedAccountsBySource?.[sourceKey];

      if (
        configuredSource?.accountId &&
        configuredSource.datasetId &&
        configuredSource.syncStatus === "synced"
      ) {
        return true;
      }

      return (
        normalizedSelectedSources.length === 1 &&
        sourceKey === normalizedSelectedSources[0] &&
        Boolean(datasetId) &&
        Boolean(storedIntegrationContext?.synced)
      );
    };
    const hasUnconfiguredSource = normalizedSelectedSources.some(
      (sourceKey) => !isSourceConfigured(sourceKey)
    );

    if (
      !hasValidSourceCount ||
      hasUnconfiguredSource
    ) {
      setError(
        messages.reports.noDatasetYet
      );
      return;
    }

    if (!isMultiSourceReport && !canSelectSlideCount(planCapabilities, selectedSlides)) {
      setError(
        `Your current plan supports up to ${planCapabilities.maxSlides} slides. Choose a smaller report or upgrade.`
      );
      return;
    }

    setLoading(true);
    setError("");

    if (!storedIntegrationContext) {
      setError(messages.reports.noDatasetYet);
      setLoading(false);
      return;
    }

    const requestedAiMode =
      aiMode === "agents" && planCapabilities.canUseAiAgents
        ? "agents"
        : "standard";
    const requestedSlides = isMultiSourceReport ? 10 : selectedSlides;
    const normalizedSelection = normalizeMetaTimeframeSelection({
      preset: storedIntegrationContext.timeframe,
      startDate: storedIntegrationContext.startDate,
      endDate: storedIntegrationContext.endDate,
    });

    persistGenerateOptions(requestedSlides, requestedAiMode, selectedTemplate);
    setIntegrationReportContext({
      ...storedIntegrationContext,
      requestedSlides,
      aiMode: requestedAiMode,
      templateId: selectedTemplate,
      reportKind:
        normalizedSelectedSources.length > 1 ? "multi_source" : "single_source",
    });
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
        requested_slides: requestedSlides,
        ai_mode: requestedAiMode,
      },
    });
    console.info("[PlanLimits][generate.request]", {
      currentPlan: planCapabilities.plan,
      plan: planCapabilities.plan,
      requestedSlides,
      datasetId,
    });
    console.info("[AIAgents][generate.request]", {
      datasetId,
      requestedSlides,
      aiMode: requestedAiMode,
    });

    router.replace(
      `/reports/new/flow/review?integration=${primarySource}&template=${selectedTemplate}&generate=1`
    );
  }

  return (
    <AppShell>
      <div className="-mx-4 -mt-4 space-y-5 bg-white px-4 pt-4 pb-6 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6 sm:pb-8">
        <MobileFlowHeader
          currentStep={currentStep}
          totalSteps={flowSteps.length}
          title={messages.reports.generateReport}
          description={messages.reports.generateReportDescription}
          backHref={stepHrefMap[2]}
        />
        <section className="p-5 sm:p-8">
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

          <div className="mt-8 space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                {messages.reports.generateReport}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">
                Create &amp; Generate your report
              </h2>
            </div>
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
                    href={`/reports/new/flow/sync?integration=${primarySource}`}
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
                {isMultiSourceReport ? (
                  <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                    Multi-source reports require the 10-slide format to include platform comparisons and cross-channel insights.
                  </div>
                ) : null}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {slideCountOptions.map((option) => {
                    const active = option.value === selectedSlides;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelectSlides(option.value)}
                        disabled={!option.available}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          active
                            ? "border-slate-950 bg-slate-950 text-white"
                          : option.available
                              ? "border-slate-200 bg-slate-50 text-slate-950 hover:bg-slate-100"
                              : "border-slate-200 bg-white text-slate-400 hover:border-amber-200 hover:bg-amber-50"
                        } disabled:cursor-not-allowed`}
                      >
                        <span className="block text-lg font-semibold">{option.value} slides</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[20px] border border-slate-200 bg-white p-4 lg:col-span-2">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                  {messages.reports.reportTemplate}
                </p>
                <div className="mt-4 grid gap-4 xl:grid-cols-3">
                  {templateOptions.map((template) => {
                    const active = template.id === selectedTemplate;

                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleSelectTemplate(template.id)}
                        className={`rounded-[24px] border p-4 text-left transition ${
                          active
                            ? "border-slate-950 bg-slate-950/5 shadow-[0_0_0_1px_rgba(15,23,42,0.12)]"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-[#eef3f8] shadow-[0_14px_32px_rgba(15,23,42,0.08)]">
                          <img
                            src={template.previewSrc}
                            alt={`${template.name} template preview`}
                            className="block aspect-[1160/670] h-auto w-full object-cover"
                          />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-slate-950">
                          {template.name}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {template.description}
                        </p>
                      </button>
                    );
                  })}
                  <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-4 text-left">
                    <div className="flex aspect-[1160/670] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white/70">
                      <div className="text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400">
                          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 stroke-current">
                            <path d="M12 5v14M5 12h14" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        </div>
                        <p className="mt-4 text-lg font-semibold text-slate-700">
                          More templates coming soon...
                        </p>
                      </div>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-700">
                      Coming soon
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      We are preparing more report styles for future releases.
                    </p>
                  </div>
                </div>
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
                          : "Disponible en Advanced."}
                      </span>
                    </button>
                  </div>
                </section>
              ) : null}

              <section className="rounded-[20px] border border-slate-200 bg-white p-4 lg:col-span-2">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                  {messages.settings.brandAssets}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {messages.settings.brandAssetsDescription}
                </p>

                <div className="mt-4">
                  <div className="relative rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <div className={isFreePlan ? "pointer-events-none opacity-70 blur-[1.5px]" : ""}>
                      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                        <div>
                          <label className="block">
                            <span className="text-sm font-medium text-slate-950">
                              {messages.settings.brandName}
                            </span>
                            <input
                              type="text"
                              disabled={isFreePlan}
                              value={brandNameDraft}
                              onChange={(event) => handleBrandNameChange(event.target.value)}
                              className={`mt-3 w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:ring-2 ${
                                brandAssetsError
                                  ? "border-red-300 focus:border-red-300 focus:ring-red-100"
                                  : "border-slate-200 focus:border-sky-300 focus:ring-sky-100"
                              }`}
                              placeholder={messages.settings.brandNamePlaceholder}
                            />
                            {brandAssetsError ? (
                              <p className="mt-2 text-sm font-medium text-red-600">
                                {brandAssetsError}
                              </p>
                            ) : null}
                          </label>

                          {!isFreePlan ? (
                            <div className="mt-5 flex flex-wrap items-center gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  void handleSaveBrandAssets();
                                }}
                                disabled={brandAssetsSaving || brandLogoUploading}
                                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                              >
                                {brandAssetsSaving ? "Saving..." : "Save changes"}
                              </button>
                              {brandAssetsSaved ? (
                                <div className="inline-flex items-center gap-3 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
                                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                    <svg
                                      viewBox="0 0 20 20"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                    >
                                      <path
                                        d="m5 10 3 3 7-7"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </span>
                                  Brand assets saved successfully
                                </div>
                              ) : (
                                <p className="text-sm text-slate-500">
                                  Save the brand name and logo before generating the report.
                                </p>
                              )}
                            </div>
                          ) : null}
                        </div>

                        <div>
                          <span className="text-sm font-medium text-slate-950">
                            {messages.settings.brandLogo}
                          </span>
                          <div className="mt-3 flex items-center gap-4">
                            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] border border-slate-200 bg-white">
                              {resolvedBrandLogoPreviewUrl && !brandLogoPreviewFailed ? (
                                <img
                                  src={resolvedBrandLogoPreviewUrl}
                                  alt="Brand logo preview"
                                  className="h-full w-full object-contain"
                                  onError={() => setBrandLogoPreviewFailed(true)}
                                />
                              ) : (
                                <span className="text-sm font-semibold text-slate-400">
                                  Logo
                                </span>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm leading-6 text-slate-500">
                                {messages.settings.logoRecommendation}
                              </p>
                              <div className="mt-4 flex flex-wrap gap-3">
                                <label
                                  className={`inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                                    isFreePlan
                                      ? "cursor-not-allowed bg-slate-300 text-slate-500"
                                      : "cursor-pointer bg-slate-950 text-white hover:bg-slate-800"
                                  }`}
                                >
                                  {messages.settings.uploadLogo}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={isFreePlan || brandAssetsSaving || brandLogoUploading}
                                    onChange={handleLogoChange}
                                  />
                                </label>
                                {brandLogoDraft && !isFreePlan ? (
                                  <button
                                    type="button"
                                    onClick={handleRemoveLogo}
                                    disabled={brandAssetsSaving || brandLogoUploading}
                                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                                  >
                                    {messages.settings.removeLogo}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {isFreePlan ? (
                      <div className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center rounded-[24px] bg-white/75 px-5 text-center backdrop-blur-[2px]">
                        <div className="max-w-md rounded-[24px] border border-slate-200 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.10)]">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              className="h-5 w-5"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.5 10V7.75a4.5 4.5 0 1 0-9 0V10m-.75 0h10.5A1.5 1.5 0 0 1 18.75 11.5v7A1.5 1.5 0 0 1 17.25 20h-10.5a1.5 1.5 0 0 1-1.5-1.5v-7A1.5 1.5 0 0 1 6.75 10Z"
                              />
                            </svg>
                          </div>
                          <h3 className="mt-4 text-lg font-semibold text-slate-950">
                            Custom branding is available on paid plans
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            Upgrade your plan to add your own brand name and logo to reports.
                          </p>
                          <Link
                            href="/pricing"
                            className="mt-5 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-800"
                          >
                            Upgrade your plan
                          </Link>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={`/reports/new/flow/sync?integration=${primarySource}`}
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
      {cropModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,17,31,0.52)] px-4 py-4 sm:px-6">
          <div className="w-full max-w-[720px] rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_22px_56px_rgba(15,23,42,0.22)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {messages.settings.adjustLogo}
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  {messages.settings.adjustLogoDescription}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div className="flex flex-col items-center rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <div
                  className="relative h-[240px] w-[240px] cursor-grab overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] active:cursor-grabbing"
                  onPointerDown={(event) => {
                    if (!cropSource) {
                      return;
                    }

                    cropDragStateRef.current = {
                      pointerId: event.pointerId,
                      startX: event.clientX,
                      startY: event.clientY,
                      originOffsetX: cropOffsetX,
                      originOffsetY: cropOffsetY,
                    };

                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    const dragState = cropDragStateRef.current;

                    if (!dragState || dragState.pointerId !== event.pointerId || !cropVisibleSize) {
                      return;
                    }

                    const deltaX = (event.clientX - dragState.startX) / cropPreviewScale;
                    const deltaY = (event.clientY - dragState.startY) / cropPreviewScale;
                    const nextOffsets = clampCropOffsets(
                      dragState.originOffsetX - deltaX,
                      dragState.originOffsetY - deltaY
                    );

                    setCropOffsetX(nextOffsets.offsetX);
                    setCropOffsetY(nextOffsets.offsetY);
                  }}
                  onPointerUp={(event) => {
                    if (cropDragStateRef.current?.pointerId === event.pointerId) {
                      cropDragStateRef.current = null;
                    }

                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    }
                  }}
                  onPointerCancel={(event) => {
                    if (cropDragStateRef.current?.pointerId === event.pointerId) {
                      cropDragStateRef.current = null;
                    }

                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    }
                  }}
                >
                  {cropSource ? (
                    <img
                      src={cropSource}
                      alt="Logo crop preview"
                      className="absolute left-0 top-0 object-cover"
                      style={cropPreviewImageStyle}
                    />
                  ) : null}
                </div>
                <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                  Drag the logo to reposition it inside the crop area.
                </p>
              </div>

              <div className="space-y-5">
                <label className="block">
                  <span className="text-sm font-medium text-slate-950">
                    {messages.settings.zoom}
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={cropZoom}
                    onChange={(event) => {
                      const nextZoom = Number(event.target.value);
                      const currentVisibleSize = cropMinDimension / cropZoom;
                      const currentCenterX = cropOffsetX + currentVisibleSize / 2;
                      const currentCenterY = cropOffsetY + currentVisibleSize / 2;
                      const nextVisibleSize = cropMinDimension / nextZoom;
                      const nextOffsets = clampCropOffsets(
                        currentCenterX - nextVisibleSize / 2,
                        currentCenterY - nextVisibleSize / 2,
                        nextZoom
                      );
                      setCropZoom(nextZoom);
                      setCropOffsetX(nextOffsets.offsetX);
                      setCropOffsetY(nextOffsets.offsetY);
                    }}
                    className="mt-3 w-full accent-sky-600"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCropModalOpen(false)}
                disabled={brandLogoUploading}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                {messages.settings.cancel}
              </button>
              <button
                type="button"
                onClick={() => void handleApplyLogoCrop()}
                disabled={brandLogoUploading}
                className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {brandLogoUploading ? "Uploading..." : messages.settings.applyLogo}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

export default function NewReportFlowGeneratePage() {
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
      <NewReportFlowGeneratePageContent />
    </Suspense>
  );
}
