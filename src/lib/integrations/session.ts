"use client";

import {
  normalizeMetaTimeframeSelection,
  type MetaTimeframeSelection,
} from "@/lib/integrations/timeframes";
import type { ReportTemplateId } from "@/lib/reports/template-selection";

const INTEGRATION_REPORT_CONTEXT_KEY = "integrationReportContext";
const PENDING_META_SOURCE_KEY = "pendingMetaSource";
export const META_SELECTOR_CACHE_KEY = "measurable.meta.sync.selectorCache";

export type PendingMetaSource = "facebook_pages" | "instagram_business";
export type SourceKey = PendingMetaSource;

export type SelectedSourceAccount = {
  accountId: string;
  accountName: string;
  integrationId: string;
  integrationAccountId?: string;
  datasetId?: string;
  syncStatus: "idle" | "syncing" | "synced" | "error";
  error?: string;
};

export type SelectedAccountsBySource = Record<SourceKey, SelectedSourceAccount>;

function createEmptySelectedSourceAccount(): SelectedSourceAccount {
  return {
    accountId: "",
    accountName: "",
    integrationId: "",
    integrationAccountId: undefined,
    datasetId: undefined,
    syncStatus: "idle",
    error: undefined,
  };
}

export function createEmptySelectedAccountsBySource(): SelectedAccountsBySource {
  return {
    facebook_pages: createEmptySelectedSourceAccount(),
    instagram_business: createEmptySelectedSourceAccount(),
  };
}

export type IntegrationReportContext = {
  source: string;
  integration: string;
  workspaceId: string;
  timeframe?: string;
  startDate?: string;
  endDate?: string;
  timeframeSelection?: MetaTimeframeSelection;
  integrationId?: string;
  datasetId?: string;
  businessId?: string;
  adAccountId?: string;
  pageId?: string;
  pageName?: string;
  synced?: boolean;
  requestedSlides?: number;
  aiMode?: "standard" | "agents";
  templateId?: ReportTemplateId;
  postConnectRedirect?: string;
  selectedSources?: SourceKey[];
  selectedAccountsBySource?: SelectedAccountsBySource;
  sharedTimeframe?: MetaTimeframeSelection;
  reportKind?: "single_source" | "multi_source";
};

function normalizeSelectedSources(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as SourceKey[];
  }

  return value.filter((item): item is SourceKey => isPendingMetaSource(String(item)));
}

function normalizeSelectedSourceAccount(value: unknown): SelectedSourceAccount {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    accountId: typeof record.accountId === "string" ? record.accountId : "",
    accountName: typeof record.accountName === "string" ? record.accountName : "",
    integrationId: typeof record.integrationId === "string" ? record.integrationId : "",
    integrationAccountId:
      typeof record.integrationAccountId === "string" ? record.integrationAccountId : undefined,
    datasetId: typeof record.datasetId === "string" ? record.datasetId : undefined,
    syncStatus:
      record.syncStatus === "syncing" ||
      record.syncStatus === "synced" ||
      record.syncStatus === "error"
        ? record.syncStatus
        : "idle",
    error: typeof record.error === "string" ? record.error : undefined,
  };
}

function normalizeSelectedAccountsBySource(value: unknown) {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const normalized = createEmptySelectedAccountsBySource();

  normalized.facebook_pages = normalizeSelectedSourceAccount(record.facebook_pages);
  normalized.instagram_business = normalizeSelectedSourceAccount(record.instagram_business);

  return normalized;
}

function deriveSelectedSources(
  rawContext: Record<string, unknown>,
  selectedAccountsBySource: SelectedAccountsBySource
) {
  const explicit = normalizeSelectedSources(rawContext.selectedSources);

  if (explicit.length > 0) {
    return explicit;
  }

  const legacySource = isPendingMetaSource(rawContext.source as string)
    ? (rawContext.source as SourceKey)
    : null;

  if (legacySource) {
    return [legacySource];
  }

  return (Object.entries(selectedAccountsBySource) as Array<[SourceKey, SelectedSourceAccount]>)
    .filter(([, account]) => Boolean(account.integrationId || account.accountId || account.datasetId))
    .map(([sourceKey]) => sourceKey);
}

function deriveReportKind(
  rawKind: unknown,
  selectedSources: SourceKey[]
): "single_source" | "multi_source" {
  if (rawKind === "single_source" || rawKind === "multi_source") {
    return rawKind;
  }

  return selectedSources.length > 1 ? "multi_source" : "single_source";
}

function deriveSharedTimeframe(
  rawContext: Record<string, unknown>
): MetaTimeframeSelection | undefined {
  const sharedTimeframe =
    rawContext.sharedTimeframe &&
    typeof rawContext.sharedTimeframe === "object" &&
    !Array.isArray(rawContext.sharedTimeframe)
      ? (rawContext.sharedTimeframe as MetaTimeframeSelection)
      : undefined;

  if (sharedTimeframe) {
    return sharedTimeframe;
  }

  if (
    typeof rawContext.timeframe === "string" ||
    typeof rawContext.startDate === "string" ||
    typeof rawContext.endDate === "string"
  ) {
    return normalizeMetaTimeframeSelection({
      preset: typeof rawContext.timeframe === "string" ? rawContext.timeframe : undefined,
      startDate: typeof rawContext.startDate === "string" ? rawContext.startDate : undefined,
      endDate: typeof rawContext.endDate === "string" ? rawContext.endDate : undefined,
    });
  }

  return undefined;
}

function buildLegacyFieldsFromSources(
  rawContext: Record<string, unknown>,
  selectedSources: SourceKey[],
  selectedAccountsBySource: SelectedAccountsBySource
) {
  const firstSource = selectedSources[0] || "";
  const firstSourceAccount = firstSource
    ? selectedAccountsBySource[firstSource]
    : createEmptySelectedSourceAccount();

  const aiMode: "standard" | "agents" | undefined =
    rawContext.aiMode === "agents" || rawContext.aiMode === "standard"
      ? rawContext.aiMode
      : undefined;

  return {
    source: firstSource || (typeof rawContext.source === "string" ? rawContext.source : ""),
    integration: typeof rawContext.integration === "string" ? rawContext.integration : "",
    workspaceId: typeof rawContext.workspaceId === "string" ? rawContext.workspaceId : "",
    timeframe: typeof rawContext.timeframe === "string" ? rawContext.timeframe : undefined,
    startDate: typeof rawContext.startDate === "string" ? rawContext.startDate : undefined,
    endDate: typeof rawContext.endDate === "string" ? rawContext.endDate : undefined,
    timeframeSelection:
      rawContext.timeframeSelection &&
      typeof rawContext.timeframeSelection === "object" &&
      !Array.isArray(rawContext.timeframeSelection)
        ? (rawContext.timeframeSelection as MetaTimeframeSelection)
        : undefined,
    integrationId:
      firstSourceAccount.integrationId ||
      (typeof rawContext.integrationId === "string" ? rawContext.integrationId : undefined),
    datasetId:
      firstSourceAccount.datasetId ||
      (typeof rawContext.datasetId === "string" ? rawContext.datasetId : undefined),
    businessId: typeof rawContext.businessId === "string" ? rawContext.businessId : undefined,
    adAccountId: typeof rawContext.adAccountId === "string" ? rawContext.adAccountId : undefined,
    pageId:
      firstSourceAccount.accountId ||
      (typeof rawContext.pageId === "string" ? rawContext.pageId : undefined),
    pageName:
      firstSourceAccount.accountName ||
      (typeof rawContext.pageName === "string" ? rawContext.pageName : undefined),
    synced:
      selectedSources.length > 0
        ? selectedSources.every(
            (sourceKey) => selectedAccountsBySource[sourceKey].syncStatus === "synced"
          )
        : Boolean(rawContext.synced),
    requestedSlides:
      typeof rawContext.requestedSlides === "number" ? rawContext.requestedSlides : undefined,
    aiMode,
    templateId:
      typeof rawContext.templateId === "string"
        ? (rawContext.templateId as ReportTemplateId)
        : undefined,
    postConnectRedirect:
      typeof rawContext.postConnectRedirect === "string"
        ? rawContext.postConnectRedirect
        : undefined,
  };
}

function normalizeIntegrationReportContext(value: unknown): IntegrationReportContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const rawContext = value as Record<string, unknown>;
  const selectedAccountsBySource = normalizeSelectedAccountsBySource(
    rawContext.selectedAccountsBySource
  );
  const selectedSources = deriveSelectedSources(rawContext, selectedAccountsBySource);
  const reportKind = deriveReportKind(rawContext.reportKind, selectedSources);
  const legacyFields = buildLegacyFieldsFromSources(
    rawContext,
    selectedSources,
    selectedAccountsBySource
  );

  return {
    ...legacyFields,
    selectedSources,
    selectedAccountsBySource,
    sharedTimeframe: deriveSharedTimeframe(rawContext),
    reportKind,
  };
}

export function isPendingMetaSource(
  value: string | null | undefined
): value is PendingMetaSource {
  return value === "facebook_pages" || value === "instagram_business";
}

export function getIntegrationReportContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(INTEGRATION_REPORT_CONTEXT_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return normalizeIntegrationReportContext(JSON.parse(rawValue));
  } catch {
    return null;
  }
}

export function setIntegrationReportContext(
  context: IntegrationReportContext
) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedContext = normalizeIntegrationReportContext(context);

  if (!normalizedContext) {
    return;
  }

  window.localStorage.setItem(
    INTEGRATION_REPORT_CONTEXT_KEY,
    JSON.stringify(normalizedContext)
  );
}

export function clearIntegrationReportContext() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(INTEGRATION_REPORT_CONTEXT_KEY);
}

export function clearStoredMetaIntegrationState() {
  const currentContext = getIntegrationReportContext();

  if (!currentContext || currentContext.integration !== "meta") {
    return;
  }

  setIntegrationReportContext({
    ...currentContext,
    integrationId: undefined,
    datasetId: undefined,
    businessId: undefined,
    adAccountId: undefined,
    pageId: undefined,
    pageName: undefined,
    synced: false,
  });
}

export function clearMetaSelectorCache() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(META_SELECTOR_CACHE_KEY);
}

export function clearMetaIntegrationSessionState() {
  if (typeof window === "undefined") {
    return;
  }

  const currentContext = getIntegrationReportContext();

  clearPendingMetaSource();
  clearMetaSelectorCache();

  if (!currentContext) {
    clearIntegrationReportContext();
    return;
  }

  const nextContext = normalizeIntegrationReportContext({
    ...currentContext,
    source: "",
    integration: "",
    integrationId: undefined,
    datasetId: undefined,
    businessId: undefined,
    adAccountId: undefined,
    pageId: undefined,
    pageName: undefined,
    synced: false,
    postConnectRedirect: undefined,
    selectedSources: [],
    selectedAccountsBySource: createEmptySelectedAccountsBySource(),
    reportKind: "single_source",
  });

  if (!nextContext) {
    clearIntegrationReportContext();
    return;
  }

  setIntegrationReportContext(nextContext);
}

export function getPendingMetaSource() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(PENDING_META_SOURCE_KEY);
  return isPendingMetaSource(rawValue) ? rawValue : null;
}

export function setPendingMetaSource(source: PendingMetaSource) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PENDING_META_SOURCE_KEY, source);
}

export function clearPendingMetaSource() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PENDING_META_SOURCE_KEY);
}
