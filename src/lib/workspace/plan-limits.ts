import type { Workspace } from "@/types/workspace";

import { formatNumber, formatStorageBytes } from "@/lib/formatters";

export type PlanCapabilities = {
  plan: string;
  maxSlides: number;
  canExportPdf: boolean;
  canExportPptx: boolean;
  canUseAiAgents: boolean;
};

const PLAN_CAPABILITIES: Record<string, PlanCapabilities> = {
  starter: {
    plan: "starter",
    maxSlides: 10,
    canExportPdf: true,
    canExportPptx: false,
    canUseAiAgents: false,
  },
  core: {
    plan: "core",
    maxSlides: 15,
    canExportPdf: true,
    canExportPptx: true,
    canUseAiAgents: false,
  },
  advanced: {
    plan: "advanced",
    maxSlides: 30,
    canExportPdf: true,
    canExportPptx: true,
    canUseAiAgents: true,
  },
};

const DEFAULT_PLAN_CAPABILITIES = PLAN_CAPABILITIES.starter;
const SLIDE_COUNT_OPTIONS = [5, 10, 15, 30] as const;

function normalizePlanKey(plan?: string | null) {
  const planKey = plan?.trim().toLowerCase().replace(/[\s-]+/g, "_") || "starter";

  if (planKey === "free") {
    return "starter";
  }

  return planKey;
}

export function formatPlanName(plan?: string | null) {
  if (!plan) {
    return "";
  }

  return plan
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function getPlanCapabilities(workspace?: Workspace | null): PlanCapabilities {
  const planKey = normalizePlanKey(workspace?.plan);
  const planCapabilities =
    PLAN_CAPABILITIES[planKey] || DEFAULT_PLAN_CAPABILITIES;

  return {
    ...planCapabilities,
    plan: planCapabilities.plan,
  };
}

export function getSlideCountOptions(capabilities: PlanCapabilities) {
  return SLIDE_COUNT_OPTIONS.map((value) => ({
    value,
    available: value <= capabilities.maxSlides,
  }));
}

export function canSelectSlideCount(
  capabilities: PlanCapabilities,
  slideCount: number
) {
  return slideCount > 0 && slideCount <= capabilities.maxSlides;
}

export function getReportsLimit(workspace?: Workspace | null) {
  return workspace?.planLimits?.reportsPerMonth;
}

export function getSlidesLimit(workspace?: Workspace | null) {
  return workspace?.planLimits?.maxSlidesPerReport;
}

export function getStorageLimit(workspace?: Workspace | null) {
  return workspace?.storageLimitBytes ?? workspace?.planLimits?.storageLimitBytes;
}

export function getStorageUsed(workspace?: Workspace | null) {
  return workspace?.storageUsedBytes ?? 0;
}

export function getStoragePercent(workspace?: Workspace | null) {
  const storageLimit = getStorageLimit(workspace);
  const storageUsed = getStorageUsed(workspace);

  if (!storageLimit || storageLimit <= 0) {
    return 0;
  }

  return Math.min((storageUsed / storageLimit) * 100, 100);
}

export function isUnlimitedReports(workspace?: Workspace | null) {
  return !getReportsLimit(workspace);
}

export function formatReportsUsageLabel(
  workspace: Workspace | null | undefined,
  reportsUsedThisMonth: number
) {
  const reportsLimit = getReportsLimit(workspace);

  if (!reportsLimit) {
    return "Unlimited";
  }

  return `${formatNumber(reportsUsedThisMonth, 0)} / ${formatNumber(reportsLimit, 0)} this month`;
}

export function formatSlidesUsageLabel(workspace?: Workspace | null) {
  const slidesLimit = getSlidesLimit(workspace);

  if (!slidesLimit) {
    return "Unlimited";
  }

  return `Up to ${formatNumber(slidesLimit, 0)} per report`;
}

export function formatStorageUsageLabel(workspace?: Workspace | null) {
  const storageLimit = getStorageLimit(workspace);

  if (!storageLimit) {
    return "Unlimited";
  }

  return `${formatStorageBytes(getStorageUsed(workspace))} / ${formatStorageBytes(storageLimit)}`;
}

export function isStorageNearLimit(workspace?: Workspace | null) {
  return getStoragePercent(workspace) >= 80;
}

export function isReportsNearLimit(
  workspace: Workspace | null | undefined,
  reportsUsedThisMonth: number
) {
  const reportsLimit = getReportsLimit(workspace);

  if (!reportsLimit) {
    return false;
  }

  return reportsUsedThisMonth / reportsLimit >= 0.8;
}

export function isSlideEstimateNearLimit(
  workspace: Workspace | null | undefined,
  estimatedSlides: number
) {
  const slidesLimit = getSlidesLimit(workspace);

  if (!slidesLimit) {
    return false;
  }

  return estimatedSlides >= slidesLimit;
}

export function shouldShowUpgradeCta(params: {
  workspace?: Workspace | null;
  reportsUsedThisMonth?: number;
  estimatedSlides?: number;
}) {
  const plan = params.workspace?.plan?.toLowerCase();

  if (!plan || plan === "advanced") {
    return false;
  }

  return (
    isStorageNearLimit(params.workspace) ||
    isReportsNearLimit(params.workspace, params.reportsUsedThisMonth ?? 0) ||
    isSlideEstimateNearLimit(params.workspace, params.estimatedSlides ?? 0)
  );
}
