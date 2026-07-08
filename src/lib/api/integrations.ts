import { apiUrl } from "@/lib/api/config";
import { ApiError, readApiResponseText } from "@/lib/api";
import { fetchWorkspaces, resolveActiveWorkspace } from "@/lib/api/workspaces";
import { trackMetaEvent } from "@/lib/tracking/meta";
import {
  getMetaOAuthAuthDomainForSource,
  type MetaOAuthSource,
} from "@/lib/integrations/meta-oauth";

type MetaConnectResponse = {
  url?: string;
  auth_url?: string;
  redirect_url?: string;
  connect_url?: string;
  connected?: boolean;
  status?: string;
  message?: string;
  integration_id?: string | number;
  integrationId?: string | number;
  data?: {
    url?: string;
    auth_url?: string;
    redirect_url?: string;
    connect_url?: string;
    connected?: boolean;
    status?: string;
    message?: string;
    integration_id?: string | number;
    integrationId?: string | number;
  };
};

type MetaEntity = {
  id: string;
  name: string;
};

type MetaAdsAccount = MetaEntity & {
  currency?: string;
  timezoneName?: string;
  accountStatus?: string;
  businessId?: string;
  businessName?: string;
  lastSyncedAt?: string;
};

type MetaRefreshPagesResponse = {
  message?: string;
  detail?: string;
  status?: string;
  ok?: boolean;
  data?: {
    message?: string;
    detail?: string;
    status?: string;
    ok?: boolean;
  };
};

type MetaPagesResponse =
  | Array<{
      id?: string | number;
      page_id?: string | number;
      account_id?: string | number;
      instagram_account_id?: string | number;
      name?: string | null;
      username?: string | null;
      display_label?: string | null;
    }>
  | {
      pages?: Array<{
        id?: string | number;
        page_id?: string | number;
        account_id?: string | number;
        instagram_account_id?: string | number;
        name?: string | null;
        username?: string | null;
        display_label?: string | null;
      }>;
      items?: Array<{
        id?: string | number;
        page_id?: string | number;
        account_id?: string | number;
        instagram_account_id?: string | number;
        name?: string | null;
        username?: string | null;
        display_label?: string | null;
      }>;
      data?: Array<{
        id?: string | number;
        page_id?: string | number;
        account_id?: string | number;
        instagram_account_id?: string | number;
        name?: string | null;
        username?: string | null;
        display_label?: string | null;
      }>;
    };

type MetaSelectOrSyncResponse = {
  message?: string;
  detail?: string;
  integration_id?: string | number;
  integrationId?: string | number;
  dataset_id?: string | number;
  dataset_file_id?: string | number;
  datasetId?: string | number;
  timeframe?: string | {
    key?: string;
    label?: string;
    preset?: string;
    since?: string;
    until?: string;
  };
  reach_daily?: unknown[];
  impressions_daily?: unknown[];
  data?: {
    message?: string;
    detail?: string;
    integration_id?: string | number;
    integrationId?: string | number;
    dataset_id?: string | number;
    dataset_file_id?: string | number;
    datasetId?: string | number;
    timeframe?: string | {
      key?: string;
      label?: string;
      preset?: string;
      since?: string;
      until?: string;
    };
    reach_daily?: unknown[];
    impressions_daily?: unknown[];
  };
};

type MetaSyncAllSourceResult = {
  success: boolean;
  message: string;
  detail: string;
  integrationId: string;
  datasetId: string;
  raw: unknown;
};

type MetaSyncAllResult = {
  ok: boolean;
  status: number;
  message: string;
  raw: unknown;
  sources: Record<"facebook_pages" | "instagram_business", MetaSyncAllSourceResult | null>;
};

export type MetaProviderKey = "facebook_pages" | "instagram_business" | "meta_ads";

export type MetaProviderBadge = "Available" | "Connected" | "Needs permission" | "Checking";

export type MetaProviderUiStatus = {
  provider: MetaProviderKey;
  status: string;
  connected: boolean;
  badge: MetaProviderBadge;
  actionLabel: "Connect" | "Reconnect" | "Disconnect";
  helperText: string;
  selectable: boolean;
  loading: boolean;
};

export type MetaProviderConnectionStatus = {
  provider: MetaProviderKey;
  status: string;
  connected: boolean;
  integrationId: string;
  assetCount: number;
  tokenScopes: string[];
  missingScopes: string[];
  lastSyncedAt: string;
  message: string;
};

type IntegrationsStatusResult = {
  metaConnected: boolean;
  integrationId: string;
  facebookPagesConnected: boolean;
  facebookPagesIntegrationId: string;
  facebookPagesStatus: string;
  facebookPagesAssetCount: number;
  instagramBusinessConnected: boolean;
  instagramBusinessIntegrationId: string;
  instagramBusinessStatus: string;
  instagramBusinessAssetCount: number;
  metaAdsConnected: boolean;
  metaAdsIntegrationId: string;
  metaAdsStatus: string;
  metaAdsAssetCount: number;
  providers: Record<MetaProviderKey, MetaProviderConnectionStatus>;
  tokenScopes?: string[];
};

type MetaAuthUrlValidationResult = {
  isValid: boolean;
  startsWithExpectedDomain: boolean;
  containsExpectedOAuthPath: boolean;
};

const META_PROVIDER_KEYS = [
  "facebook_pages",
  "instagram_business",
  "meta_ads",
] as const satisfies readonly MetaProviderKey[];

const CONNECTED_INTEGRATION_STATUSES = new Set([
  "connected",
  "connected_no_assets",
  "connected_no_assets_found",
  "connected_no_assets_available",
  "connected_empty",
  "connected_no_ad_accounts",
  "connected_no_instagram_accounts",
  "no_authorized_assets",
  "needs_page_ig_link",
  "needs_business_or_creator_account",
]);

const CANONICAL_CONNECTED_STATUSES = new Set(["connected", "connected_no_assets"]);
const CANONICAL_AVAILABLE_STATUSES = new Set(["", "available", "no_token", "disconnected"]);

export function isIntegrationConnectedStatus(status?: string | null) {
  return CONNECTED_INTEGRATION_STATUSES.has((status || "").trim().toLowerCase());
}

export function normalizeMetaProviderStatusValue(status?: string | null) {
  const normalized = (status || "").trim().toLowerCase();

  if (
    normalized === "connected_no_assets_found" ||
    normalized === "connected_no_assets_available" ||
    normalized === "connected_empty" ||
    normalized === "connected_no_ad_accounts" ||
    normalized === "connected_no_instagram_accounts" ||
    normalized === "no_authorized_assets"
  ) {
    return "connected_no_assets";
  }

  return normalized;
}

export function isMetaProviderConnectedStatus(status?: string | null) {
  return CANONICAL_CONNECTED_STATUSES.has(normalizeMetaProviderStatusValue(status));
}

export function isMetaProviderAvailableStatus(status?: string | null) {
  return CANONICAL_AVAILABLE_STATUSES.has(normalizeMetaProviderStatusValue(status));
}

function getMetaProviderAvailableHelper(provider: MetaProviderKey) {
  if (provider === "instagram_business") {
    return "Connect Instagram Business accounts linked to your Facebook Pages.";
  }

  if (provider === "meta_ads") {
    return "Connect ad accounts to generate paid media performance reports.";
  }

  return "Connect Facebook Pages to generate organic visibility, engagement, page views, and audience reports.";
}

function getMetaProviderAssetLabel(provider: MetaProviderKey) {
  if (provider === "instagram_business") {
    return "Instagram account";
  }

  if (provider === "meta_ads") {
    return "ad account";
  }

  return "page";
}

export function normalizeMetaProviderStatus(input: {
  provider: MetaProviderKey;
  status?: string | null;
  connected?: boolean | null;
  loading?: boolean;
  assetCount?: number;
  lastSyncedAt?: string | null;
}): MetaProviderUiStatus {
  const status = normalizeMetaProviderStatusValue(input.status);
  const connected =
    isMetaProviderConnectedStatus(status) ||
    (!status && input.connected === true);
  const loading =
    input.loading === true &&
    !status &&
    input.connected !== true;
  const assetCount =
    typeof input.assetCount === "number" && Number.isFinite(input.assetCount)
      ? input.assetCount
      : 0;

  if (loading) {
    return {
      provider: input.provider,
      status,
      connected: false,
      badge: "Checking",
      actionLabel: "Connect",
      helperText: "",
      selectable: false,
      loading: true,
    };
  }

  if (status === "needs_permission") {
    return {
      provider: input.provider,
      status,
      connected: false,
      badge: "Needs permission",
      actionLabel: "Reconnect",
      helperText: "Reconnect and approve the required permissions.",
      selectable: false,
      loading: false,
    };
  }

  if (connected) {
    const helperText =
      status === "connected_no_assets"
        ? "Connected, but no assets were found."
        : assetCount > 0
          ? `${assetCount} ${getMetaProviderAssetLabel(input.provider)}${
              assetCount === 1 ? "" : "s"
            } ready.${
              input.lastSyncedAt
                ? ` Last synced ${new Date(input.lastSyncedAt).toLocaleString()}.`
                : ""
            }`
          : "";

    return {
      provider: input.provider,
      status,
      connected: true,
      badge: "Connected",
      actionLabel: "Disconnect",
      helperText,
      selectable: true,
      loading: false,
    };
  }

  return {
    provider: input.provider,
    status,
    connected: false,
    badge: "Available",
    actionLabel: "Connect",
    helperText: getMetaProviderAvailableHelper(input.provider),
    selectable: false,
    loading: false,
  };
}

function getAuthHeaders() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const token = window.localStorage.getItem("token");

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : undefined;
}

async function getRequiredWorkspaceId(preferredWorkspaceId?: string | null) {
  if (preferredWorkspaceId) {
    return preferredWorkspaceId;
  }

  const activeWorkspace = resolveActiveWorkspace(await fetchWorkspaces());

  if (activeWorkspace?.id) {
    return activeWorkspace.id;
  }

  throw new ApiError(
    "No active workspace selected. Please choose a workspace and try again.",
    {
      endpoint: "/workspaces",
    }
  );
}

function extractIntegrationId(payload: MetaConnectResponse | MetaSelectOrSyncResponse) {
  const integrationId =
    payload.integration_id ??
    payload.integrationId ??
    payload.data?.integration_id ??
    payload.data?.integrationId;

  return integrationId ? String(integrationId) : "";
}

function extractDatasetId(payload: MetaSelectOrSyncResponse) {
  const datasetId =
    payload.dataset_id ??
    payload.dataset_file_id ??
    payload.datasetId ??
    payload.data?.dataset_id ??
    payload.data?.dataset_file_id ??
    payload.data?.datasetId;

  return datasetId ? String(datasetId) : "";
}

function extractResponseTimeframe(payload: MetaSelectOrSyncResponse) {
  return payload.timeframe || payload.data?.timeframe || "";
}

function extractResponseTimeframeKey(payload: MetaSelectOrSyncResponse) {
  const timeframe = extractResponseTimeframe(payload);

  if (typeof timeframe === "string") {
    return timeframe;
  }

  return timeframe?.key || timeframe?.preset || "";
}

function getDailySeriesLength(payload: MetaSelectOrSyncResponse, key: "reach_daily" | "impressions_daily") {
  const directValue = payload[key];
  const nestedValue = payload.data?.[key];
  const value = Array.isArray(directValue) ? directValue : nestedValue;

  return Array.isArray(value) ? value.length : null;
}

function getRedirectUrl(text: string) {
  try {
    const parsed = JSON.parse(text) as MetaConnectResponse;
    const authUrlFromBackend =
      parsed.url ||
      parsed.auth_url ||
      parsed.redirect_url ||
      parsed.connect_url ||
      parsed.data?.url ||
      parsed.data?.auth_url ||
      parsed.data?.redirect_url ||
      parsed.data?.connect_url ||
      "";

    const connected =
      parsed.connected ||
      parsed.data?.connected ||
      parsed.status === "connected" ||
      parsed.data?.status === "connected" ||
      false;

    return {
      redirectUrl: authUrlFromBackend,
      authUrlFromBackend,
      finalAuthUrlUsed: authUrlFromBackend,
      connected,
      message: parsed.message || parsed.data?.message || "",
      integrationId: extractIntegrationId(parsed),
    };
  } catch {
    if (text.startsWith("http://") || text.startsWith("https://")) {
      return {
        redirectUrl: text,
        authUrlFromBackend: text,
        finalAuthUrlUsed: text,
        connected: false,
        message: "",
        integrationId: "",
      };
    }

    return {
      redirectUrl: "",
      authUrlFromBackend: "",
      finalAuthUrlUsed: "",
      connected: false,
      message: "",
      integrationId: "",
    };
  }
}

export function validateMetaAuthUrl(
  value: string,
  source: MetaOAuthSource = "facebook_pages"
): MetaAuthUrlValidationResult {
  if (!value) {
    return {
      isValid: false,
      startsWithExpectedDomain: false,
      containsExpectedOAuthPath: false,
    };
  }

  try {
    const parsedUrl = new URL(value);
    const isHttpUrl =
      parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
    const expectedDomain = getMetaOAuthAuthDomainForSource(source);
    const startsWithExpectedDomain = value.includes(expectedDomain);
    const containsExpectedOAuthPath =
      source === "instagram_business"
        ? parsedUrl.pathname.includes("/dialog/oauth") ||
          `${parsedUrl.pathname}${parsedUrl.search}`.includes("/dialog/oauth") ||
          parsedUrl.pathname.includes("/oauth/authorize")
        : parsedUrl.pathname.includes("/dialog/oauth") ||
          `${parsedUrl.pathname}${parsedUrl.search}`.includes("/dialog/oauth");

    return {
      isValid: isHttpUrl && startsWithExpectedDomain && containsExpectedOAuthPath,
      startsWithExpectedDomain,
      containsExpectedOAuthPath,
    };
  } catch {
    return {
      isValid: false,
      startsWithExpectedDomain: false,
      containsExpectedOAuthPath: false,
    };
  }
}

function normalizePages(response: MetaPagesResponse) {
  const pages = Array.isArray(response)
    ? response
    : response.pages || response.items || response.data || [];

  return pages.map((page, index) => ({
    id: String(
      page.id ??
        page.page_id ??
        page.account_id ??
        page.instagram_account_id ??
        `entity-${index}`
    ),
    name:
      page.display_label ||
      (page.username ? `@${page.username.replace(/^@/, "")}` : "") ||
      page.name ||
      `Account ${index + 1}`,
  })) satisfies MetaEntity[];
}

function normalizeMetaAdsAccounts(response: unknown) {
  const payload = isRecord(response) ? response : {};
  const accounts = Array.isArray(response)
    ? response
    : Array.isArray(payload.accounts)
      ? payload.accounts
      : Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload.data)
          ? payload.data
          : [];

  return accounts.map((account, index) => {
    const record = isRecord(account) ? account : {};
    const business = isRecord(record.business) ? record.business : null;
    const id =
      record.id ??
      record.account_id ??
      record.ad_account_id ??
      `meta-ads-account-${index}`;

    return {
      id: String(id),
      name:
        (typeof record.display_label === "string" && record.display_label) ||
        (typeof record.name === "string" && record.name) ||
        (typeof record.account_name === "string" && record.account_name) ||
        `Ad Account ${index + 1}`,
      currency:
        typeof record.currency === "string" ? record.currency : undefined,
      timezoneName:
        typeof record.timezone_name === "string"
          ? record.timezone_name
          : typeof record.timezoneName === "string"
            ? record.timezoneName
            : undefined,
      accountStatus:
        typeof record.account_status === "string"
          ? record.account_status
          : typeof record.accountStatus === "string"
            ? record.accountStatus
            : undefined,
      businessId:
        typeof record.business_id === "string"
          ? record.business_id
          : typeof record.businessId === "string"
            ? record.businessId
            : typeof business?.id === "string"
              ? business.id
              : undefined,
      businessName:
        typeof record.business_name === "string"
          ? record.business_name
          : typeof record.businessName === "string"
            ? record.businessName
            : typeof business?.name === "string"
              ? business.name
              : undefined,
      lastSyncedAt:
        typeof record.last_synced_at === "string"
          ? record.last_synced_at
          : typeof record.lastSyncedAt === "string"
            ? record.lastSyncedAt
            : undefined,
    } satisfies MetaAdsAccount;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseJsonText(text: string) {
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function getRecordString(record: Record<string, unknown>) {
  return Object.entries(record)
    .flatMap(([key, value]) => {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return [key, String(value)];
      }

      return [key];
    })
    .join(" ")
    .toLowerCase();
}

function getRecordStatus(record: Record<string, unknown>) {
  const statusValue =
    record.status ??
    record.connection_status ??
    record.connectionStatus ??
    record.state;

  if (typeof statusValue === "string") {
    return statusValue.toLowerCase();
  }

  return "";
}

function getExplicitConnected(record: Record<string, unknown>) {
  return Boolean(
    record.connected === true ||
      record.is_connected === true ||
      record.isConnected === true
  );
}

function getRecordIntegrationId(record: Record<string, unknown>) {
  const integrationId =
    record.integration_id ??
    record.integrationId ??
    record.id;

  return integrationId ? String(integrationId) : "";
}

function getRecordMessage(record: Record<string, unknown>) {
  if (typeof record.message === "string") {
    return record.message;
  }

  if (typeof record.detail === "string") {
    return record.detail;
  }

  return "";
}

function normalizeScopeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") {
          return [item.trim()];
        }

        if (isRecord(item)) {
          return [
            normalizeScopeList(item.scope),
            normalizeScopeList(item.scopes),
            normalizeScopeList(item.permission),
            normalizeScopeList(item.permissions),
          ].flat();
        }

        return [];
      })
      .map((scope) => scope.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean);
  }

  if (isRecord(value)) {
    return normalizeScopeList(
      value.scope ||
        value.scopes ||
        value.permission ||
        value.permissions ||
        value.granted_scopes ||
        value.grantedScopes
    );
  }

  return [];
}

function getScopesFromRecord(record: Record<string, unknown>) {
  return [
    ...normalizeScopeList(record.scopes),
    ...normalizeScopeList(record.granted_scopes),
    ...normalizeScopeList(record.grantedScopes),
    ...normalizeScopeList(record.permissions),
    ...normalizeScopeList(record.permission),
    ...normalizeScopeList(record.scope),
  ];
}

function getNumberFromRecord(
  record: Record<string, unknown>,
  keys: string[]
) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    if (Array.isArray(value)) {
      return value.length;
    }
  }

  return 0;
}

function createEmptyMetaProviderConnectionStatus(
  provider: MetaProviderKey
): MetaProviderConnectionStatus {
  return {
    provider,
    status: "",
    connected: false,
    integrationId: "",
    assetCount: 0,
    tokenScopes: [],
    missingScopes: [],
    lastSyncedAt: "",
    message: "",
  };
}

function createEmptyMetaProviderConnectionStatuses() {
  return {
    facebook_pages: createEmptyMetaProviderConnectionStatus("facebook_pages"),
    instagram_business: createEmptyMetaProviderConnectionStatus("instagram_business"),
    meta_ads: createEmptyMetaProviderConnectionStatus("meta_ads"),
  } satisfies Record<MetaProviderKey, MetaProviderConnectionStatus>;
}

function normalizeProviderKey(value: string) {
  return value.trim().toLowerCase().replace(/[-\s]+/g, "_");
}

function getMetaProviderKeyFromValue(value: unknown): MetaProviderKey | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = normalizeProviderKey(value);

  if (normalized === "facebook" || normalized === "facebook_page") {
    return "facebook_pages";
  }

  if (normalized === "instagram" || normalized === "instagram_business_account") {
    return "instagram_business";
  }

  if (normalized === "meta_ad" || normalized === "meta_ads_account") {
    return "meta_ads";
  }

  return META_PROVIDER_KEYS.includes(normalized as MetaProviderKey)
    ? (normalized as MetaProviderKey)
    : null;
}

function getRecordProviderKey(record: Record<string, unknown>) {
  const candidate =
    record.provider ??
    record.source ??
    record.integration_type ??
    record.integrationType ??
    record.integration_key ??
    record.integrationKey ??
    record.key ??
    record.slug;

  return getMetaProviderKeyFromValue(candidate);
}

function inferRecordProviderKey(record: Record<string, unknown>) {
  const directProvider = getRecordProviderKey(record);

  if (directProvider) {
    return directProvider;
  }

  const haystack = getRecordString(record);
  const providerMatches = META_PROVIDER_KEYS.filter((provider) => {
    if (provider === "facebook_pages") {
      return (
        haystack.includes("facebook_pages") ||
        haystack.includes("facebook pages") ||
        haystack.includes("facebook-pages") ||
        haystack.includes("facebook page")
      );
    }

    if (provider === "instagram_business") {
      return (
        haystack.includes("instagram_business") ||
        haystack.includes("instagram business") ||
        haystack.includes("instagram-business")
      );
    }

    return (
      haystack.includes("meta_ads") ||
      haystack.includes("meta ads") ||
      haystack.includes("meta-ads") ||
      haystack.includes("ad account") ||
      haystack.includes("ads insights") ||
      haystack.includes("marketing api")
    );
  });

  return providerMatches.length === 1 ? providerMatches[0] : null;
}

function getProviderAssetCount(record: Record<string, unknown>) {
  return getNumberFromRecord(record, [
    "asset_count",
    "assetCount",
    "page_count",
    "pageCount",
    "pages_count",
    "pagesCount",
    "account_count",
    "accountCount",
    "accounts_count",
    "accountsCount",
    "ad_accounts_count",
    "adAccountsCount",
    "instagram_accounts_count",
    "instagramAccountsCount",
    "authorized_accounts_count",
    "authorizedAccountsCount",
    "authorized_pages_count",
    "authorizedPagesCount",
    "pages",
    "accounts",
    "items",
  ]);
}

function getRecordLastSyncedAt(record: Record<string, unknown>) {
  return typeof record.last_synced_at === "string"
    ? record.last_synced_at
    : typeof record.lastSyncedAt === "string"
      ? record.lastSyncedAt
      : "";
}

function mergeMetaProviderConnectionStatus(
  current: MetaProviderConnectionStatus,
  record: Record<string, unknown>
): MetaProviderConnectionStatus {
  const status = normalizeMetaProviderStatusValue(getRecordStatus(record)) || current.status;
  const tokenScopes = [
    ...current.tokenScopes,
    ...getScopesFromRecord(record),
  ];
  const missingScopes = [
    ...current.missingScopes,
    ...normalizeScopeList(record.missing_scopes),
    ...normalizeScopeList(record.missingScopes),
  ];
  const connected = normalizeMetaProviderStatus({
    provider: current.provider,
    status,
    connected: getExplicitConnected(record) || current.connected,
  }).connected;

  return {
    ...current,
    status,
    connected,
    integrationId: current.integrationId || getRecordIntegrationId(record),
    assetCount: getProviderAssetCount(record) || current.assetCount,
    tokenScopes: tokenScopes.length > 0 ? Array.from(new Set(tokenScopes)) : [],
    missingScopes: missingScopes.length > 0 ? Array.from(new Set(missingScopes)) : [],
    lastSyncedAt: current.lastSyncedAt || getRecordLastSyncedAt(record),
    message: current.message || getRecordMessage(record),
  };
}

function getNestedSourcePayload(
  payload: unknown,
  aliases: string[]
): unknown {
  if (!isRecord(payload)) {
    return null;
  }

  const containers = [
    payload,
    isRecord(payload.data) ? payload.data : null,
    isRecord(payload.results) ? payload.results : null,
    isRecord(payload.sources) ? payload.sources : null,
  ].filter((value): value is Record<string, unknown> => Boolean(value));

  for (const container of containers) {
    for (const alias of aliases) {
      if (alias in container) {
        return container[alias];
      }
    }
  }

  return null;
}

function extractSyncAllSourceResult(
  payload: unknown
): MetaSyncAllSourceResult | null {
  if (!payload) {
    return null;
  }

  const record = isRecord(payload) ? payload : {};
  const nestedData = isRecord(record.data) ? record.data : null;
  const datasetId = extractDatasetId(record as MetaSelectOrSyncResponse);
  const integrationId = extractIntegrationId(record as MetaSelectOrSyncResponse);
  const statusValue =
    getRecordStatus(record) || (nestedData ? getRecordStatus(nestedData) : "");
  const status =
    typeof statusValue === "string" ? statusValue.toLowerCase() : "";
  const explicitSuccess =
    record.success === true ||
    record.synced === true ||
    (nestedData?.success === true) ||
    (nestedData?.synced === true);
  const explicitFailure =
    record.success === false ||
    record.synced === false ||
    (nestedData?.success === false) ||
    (nestedData?.synced === false) ||
    status === "failed" ||
    status === "error";
  const success =
    explicitSuccess ||
    (!explicitFailure &&
      (Boolean(datasetId) ||
        status === "synced" ||
        status === "success" ||
        status === "completed"));
  const detail =
    getRecordMessage(record) ||
    (nestedData ? getRecordMessage(nestedData) : "") ||
    (success ? "Successfully synced" : "Failed to sync");

  return {
    success,
    message: detail,
    detail,
    integrationId,
    datasetId,
    raw: payload,
  };
}

function extractMetaConnectionStatus(payload: unknown): IntegrationsStatusResult {
  const queue: Array<{ value: unknown; providerHint?: MetaProviderKey }> = [
    { value: payload },
  ];
  const providers = createEmptyMetaProviderConnectionStatuses();
  const tokenScopes = new Set<string>();

  while (queue.length > 0) {
    const currentItem = queue.shift();
    const current = currentItem?.value;

    if (Array.isArray(current)) {
      current.forEach((item) => {
        queue.push({ value: item, providerHint: currentItem?.providerHint });
      });
      continue;
    }

    if (!isRecord(current)) {
      continue;
    }

    const provider = currentItem?.providerHint || inferRecordProviderKey(current);

    if (provider) {
      providers[provider] = mergeMetaProviderConnectionStatus(
        providers[provider],
        current
      );
    }

    getScopesFromRecord(current).forEach((scope) => tokenScopes.add(scope));

    Object.entries(current).forEach(([key, value]) => {
      const providerHint =
        getMetaProviderKeyFromValue(key) || currentItem?.providerHint;

      if (Array.isArray(value) || isRecord(value)) {
        queue.push({ value, providerHint: providerHint || undefined });
      }
    });
  }

  const facebookPages = providers.facebook_pages;
  const instagramBusiness = providers.instagram_business;
  const metaAds = providers.meta_ads;
  const metaConnected = facebookPages.connected;
  const integrationId = facebookPages.integrationId;
  const instagramBusinessConnected = instagramBusiness.connected;
  const instagramBusinessIntegrationId = instagramBusiness.integrationId;
  const metaAdsConnected = metaAds.connected;
  const metaAdsIntegrationId = metaAds.integrationId;

  return {
    metaConnected,
    integrationId,
    facebookPagesConnected: facebookPages.connected,
    facebookPagesIntegrationId: facebookPages.integrationId,
    facebookPagesStatus: facebookPages.status,
    facebookPagesAssetCount: facebookPages.assetCount,
    instagramBusinessConnected,
    instagramBusinessIntegrationId,
    instagramBusinessStatus: instagramBusiness.status,
    instagramBusinessAssetCount: instagramBusiness.assetCount,
    metaAdsConnected,
    metaAdsIntegrationId,
    metaAdsStatus: metaAds.status,
    metaAdsAssetCount: metaAds.assetCount,
    providers,
    tokenScopes: Array.from(tokenScopes),
  };
}

export async function connectMetaIntegration(input?: {
  workspaceId?: string | null;
  source?: string | null;
  reconnect?: boolean;
  includeLinkedInstagram?: boolean;
}) {
  const activeWorkspaceId = await getRequiredWorkspaceId(input?.workspaceId);
  const source = input?.source || "facebook_pages";
  void trackMetaEvent("MetaConnectStarted", {
    workspace_id: activeWorkspaceId,
    source,
    reconnect: input?.reconnect === true,
  });
  const searchParams = new URLSearchParams({
    workspace_id: activeWorkspaceId,
    source,
    integration_type: source,
  });

  if (input?.reconnect) {
    searchParams.set("reconnect", "true");
  }

  if (input?.includeLinkedInstagram) {
    searchParams.set("include_linked_instagram", "true");
  }

  const endpoint = `/integrations/meta/connect-pages?${searchParams.toString()}`;
  const connectUrl = apiUrl(endpoint);

  console.log("[MetaOAuth][connect]", {
    activeWorkspaceId,
    source,
    integration_type: source,
    reconnect: input?.reconnect === true,
    connectUrl,
    hasAuthorization: Boolean(getAuthHeaders()?.Authorization),
  });

  const requestStartedAt = Date.now();

  const res = await fetch(
    connectUrl,
    {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
      credentials: "include",
    }
  );

  const text = await readApiResponseText(endpoint, res);
  console.info("META_CONNECT_RESPONSE", {
    workspace_id: activeWorkspaceId,
    source,
    integration_type: source,
    reconnect: input?.reconnect === true,
    status: res.status,
    ok: res.ok,
    duration_ms: Date.now() - requestStartedAt,
    response_text_length: text.length,
    response_text_preview: text.slice(0, 300),
  });

  return getRedirectUrl(text);
}

export async function connectInstagramBusinessIntegration(input?: {
  workspaceId?: string | null;
  reconnect?: boolean;
  source?: string | null;
}) {
  const activeWorkspaceId = await getRequiredWorkspaceId(input?.workspaceId);
  const source = input?.source || "instagram_business";
  void trackMetaEvent("MetaConnectStarted", {
    workspace_id: activeWorkspaceId,
    source,
    reconnect: input?.reconnect === true,
  });
  const searchParams = new URLSearchParams({
    workspace_id: activeWorkspaceId,
  });

  if (input?.reconnect) {
    searchParams.set("reconnect", "true");
  }

  const endpoint = `/integrations/instagram-business/connect?${searchParams.toString()}`;
  const connectUrl = apiUrl(endpoint);

  console.log("[MetaOAuth][connect]", {
    activeWorkspaceId,
    source,
    integration_type: source,
    reconnect: input?.reconnect === true,
    connectUrl,
    hasAuthorization: Boolean(getAuthHeaders()?.Authorization),
  });

  const requestStartedAt = Date.now();

  const res = await fetch(connectUrl, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
    credentials: "include",
  });

  const text = await readApiResponseText(endpoint, res);
  console.info("META_CONNECT_RESPONSE", {
    workspace_id: activeWorkspaceId,
    source,
    integration_type: source,
    reconnect: input?.reconnect === true,
    status: res.status,
    ok: res.ok,
    duration_ms: Date.now() - requestStartedAt,
    response_text_length: text.length,
    response_text_preview: text.slice(0, 300),
  });

  return getRedirectUrl(text);
}

export async function disconnectMetaIntegration(input?: {
  workspaceId?: string | null;
}) {
  const activeWorkspaceId = await getRequiredWorkspaceId(input?.workspaceId);
  const endpoint = "/integrations/meta/disconnect";
  const res = await fetch(apiUrl(endpoint), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(getAuthHeaders() || {}),
    },
    body: JSON.stringify({
      workspace_id: activeWorkspaceId,
    }),
  });

  const text = await readApiResponseText(endpoint, res);
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  return {
    ok: res.ok,
    message:
      (typeof payload.message === "string" && payload.message) ||
      (typeof payload.detail === "string" && payload.detail) ||
      "Integration disconnected successfully.",
  };
}

export async function fetchIntegrationsConnectionStatus(input?: {
  cacheBust?: number | string | null;
}) {
  const searchParams = new URLSearchParams();

  if (input?.cacheBust) {
    searchParams.set("_", String(input.cacheBust));
  }

  const endpoint = searchParams.size > 0
    ? `/integrations?${searchParams.toString()}`
    : "/integrations";
  const res = await fetch(apiUrl(endpoint), {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  const text = await readApiResponseText(endpoint, res);
  const payload = text ? (JSON.parse(text) as unknown) : null;

  return extractMetaConnectionStatus(payload);
}

export async function connectMetaAdsIntegration(input?: {
  workspaceId?: string | null;
  reconnect?: boolean;
  source?: string | null;
}) {
  const activeWorkspaceId = await getRequiredWorkspaceId(input?.workspaceId);
  const searchParams = new URLSearchParams({
    workspace_id: activeWorkspaceId,
  });

  if (input?.reconnect) {
    searchParams.set("reconnect", "true");
  }

  const endpoint = `/integrations/meta-ads/connect?${searchParams.toString()}`;
  const res = await fetch(apiUrl(endpoint), {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
    credentials: "include",
  });

  const text = await readApiResponseText(endpoint, res);
  return getRedirectUrl(text);
}

export async function fetchMetaAdsStatus(
  input?: string | null | { workspaceId?: string | null; cacheBust?: number | string | null }
) {
  const workspaceId = typeof input === "object" && input !== null ? input.workspaceId : input;
  const cacheBust = typeof input === "object" && input !== null ? input.cacheBust : undefined;
  const resolvedWorkspaceId = await getRequiredWorkspaceId(workspaceId);
  const searchParams = new URLSearchParams({
    workspace_id: resolvedWorkspaceId,
  });

  if (cacheBust) {
    searchParams.set("_", String(cacheBust));
  }

  const endpoint = `/integrations/meta-ads/status?${searchParams.toString()}`;
  const res = await fetch(apiUrl(endpoint), {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
    credentials: "include",
  });
  const text = await readApiResponseText(endpoint, res);
  const payload = text ? parseJsonText(text) : null;
  const record = isRecord(payload) ? payload : {};
  const data = isRecord(record.data) ? record.data : {};
  const tokenScopes = [
    ...getScopesFromRecord(record),
    ...getScopesFromRecord(data),
  ];
  const missingScopes = [
    ...normalizeScopeList(record.missing_scopes),
    ...normalizeScopeList(record.missingScopes),
    ...normalizeScopeList(data.missing_scopes),
    ...normalizeScopeList(data.missingScopes),
  ];
  const rawStatus =
    getRecordStatus(record) || getRecordStatus(data) || "";
  const status = rawStatus || "";
  const connected = normalizeMetaProviderStatus({
    provider: "meta_ads",
    status,
    connected:
      Boolean(record.connected) ||
      Boolean(record.is_connected) ||
      Boolean(data.connected) ||
      Boolean(data.is_connected),
  }).connected;

  return {
    connected,
    integrationId: getRecordIntegrationId(record) || getRecordIntegrationId(data),
    tokenScopes: tokenScopes.length > 0 ? Array.from(new Set(tokenScopes)) : [],
    status,
    missingScopes: missingScopes.length > 0 ? Array.from(new Set(missingScopes)) : [],
    selectedAccountId:
      typeof record.selected_account_id === "string"
        ? record.selected_account_id
        : typeof record.selectedAccountId === "string"
          ? record.selectedAccountId
          : typeof data.selected_account_id === "string"
            ? data.selected_account_id
            : typeof data.selectedAccountId === "string"
              ? data.selectedAccountId
              : "",
    lastSyncedAt:
      typeof record.last_synced_at === "string"
        ? record.last_synced_at
        : typeof record.lastSyncedAt === "string"
          ? record.lastSyncedAt
          : typeof data.last_synced_at === "string"
            ? data.last_synced_at
            : typeof data.lastSyncedAt === "string"
              ? data.lastSyncedAt
              : "",
    message: getRecordMessage(record) || getRecordMessage(data),
  };
}

export async function fetchInstagramBusinessStatus(
  input?: string | null | { workspaceId?: string | null; cacheBust?: number | string | null }
) {
  const workspaceId = typeof input === "object" && input !== null ? input.workspaceId : input;
  const cacheBust = typeof input === "object" && input !== null ? input.cacheBust : undefined;
  const resolvedWorkspaceId = await getRequiredWorkspaceId(workspaceId);
  const searchParams = new URLSearchParams({
    workspace_id: resolvedWorkspaceId,
  });

  if (cacheBust) {
    searchParams.set("_", String(cacheBust));
  }

  const endpoint = `/integrations/instagram-business/status?${searchParams.toString()}`;
  const res = await fetch(apiUrl(endpoint), {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
    credentials: "include",
  });
  const text = await readApiResponseText(endpoint, res);
  const payload = text ? parseJsonText(text) : null;
  const record = isRecord(payload) ? payload : {};
  const data = isRecord(record.data) ? record.data : {};
  const tokenScopes = [
    ...getScopesFromRecord(record),
    ...getScopesFromRecord(data),
  ];
  const missingScopes = [
    ...normalizeScopeList(record.missing_scopes),
    ...normalizeScopeList(record.missingScopes),
    ...normalizeScopeList(data.missing_scopes),
    ...normalizeScopeList(data.missingScopes),
  ];
  const status = getRecordStatus(record) || getRecordStatus(data) || "";
  const assetCount =
    getNumberFromRecord(record, [
      "asset_count",
      "assetCount",
      "account_count",
      "accountCount",
      "accounts_count",
      "accountsCount",
      "instagram_accounts_count",
      "instagramAccountsCount",
      "authorized_accounts_count",
      "authorizedAccountsCount",
      "accounts",
      "items",
    ]) ||
    getNumberFromRecord(data, [
      "asset_count",
      "assetCount",
      "account_count",
      "accountCount",
      "accounts_count",
      "accountsCount",
      "instagram_accounts_count",
      "instagramAccountsCount",
      "authorized_accounts_count",
      "authorizedAccountsCount",
      "accounts",
      "items",
    ]);

  const accountId =
    typeof record.instagram_account_id === "string"
      ? record.instagram_account_id
      : typeof record.instagramAccountId === "string"
        ? record.instagramAccountId
        : typeof data.instagram_account_id === "string"
          ? data.instagram_account_id
          : typeof data.instagramAccountId === "string"
            ? data.instagramAccountId
            : "";

  return {
    connected: normalizeMetaProviderStatus({
      provider: "instagram_business",
      status,
      connected:
        Boolean(record.connected) ||
        Boolean(record.is_connected) ||
        Boolean(data.connected) ||
        Boolean(data.is_connected),
    }).connected,
    integrationId: getRecordIntegrationId(record) || getRecordIntegrationId(data),
    tokenScopes: tokenScopes.length > 0 ? Array.from(new Set(tokenScopes)) : [],
    status,
    assetCount,
    missingScopes: missingScopes.length > 0 ? Array.from(new Set(missingScopes)) : [],
    instagramAccountId: accountId,
    lastSyncedAt:
      typeof record.last_synced_at === "string"
        ? record.last_synced_at
        : typeof record.lastSyncedAt === "string"
          ? record.lastSyncedAt
          : typeof data.last_synced_at === "string"
            ? data.last_synced_at
            : typeof data.lastSyncedAt === "string"
              ? data.lastSyncedAt
              : "",
    message: getRecordMessage(record) || getRecordMessage(data),
  };
}

export async function fetchMetaAdsAccounts(input?: {
  integrationId?: string;
  workspaceId?: string | null;
}) {
  const resolvedWorkspaceId = await getRequiredWorkspaceId(input?.workspaceId);
  const searchParams = new URLSearchParams({
    workspace_id: resolvedWorkspaceId,
  });

  if (input?.integrationId) {
    searchParams.set("integration_id", input.integrationId);
  }

  const endpoint = `/integrations/meta-ads/accounts?${searchParams.toString()}`;
  const res = await fetch(apiUrl(endpoint), {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
    credentials: "include",
  });
  const text = await readApiResponseText(endpoint, res);
  const payload = text ? parseJsonText(text) : null;

  return normalizeMetaAdsAccounts(payload);
}

export async function selectMetaAdsAccount(input: {
  integrationId: string;
  accountId: string;
  workspaceId?: string | null;
}) {
  const resolvedWorkspaceId = await getRequiredWorkspaceId(input.workspaceId);
  const endpoint = "/integrations/meta-ads/select-account";
  const res = await fetch(apiUrl(endpoint), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(getAuthHeaders() || {}),
    },
    body: JSON.stringify({
      workspace_id: resolvedWorkspaceId,
      integration_id: input.integrationId,
      account_id: input.accountId,
    }),
  });

  const text = await readApiResponseText(endpoint, res);
  const payload = text ? (JSON.parse(text) as MetaSelectOrSyncResponse) : {};

  return {
    raw: payload,
    integrationId: extractIntegrationId(payload) || input.integrationId,
    datasetId: extractDatasetId(payload),
  };
}

export async function syncMetaAdsAccount(input: {
  integrationId: string;
  accountId: string;
  timeframe: string;
  startDate?: string;
  endDate?: string;
  workspaceId?: string | null;
}) {
  const resolvedWorkspaceId = await getRequiredWorkspaceId(input.workspaceId);
  const endpoint = "/integrations/meta-ads/sync";
  const res = await fetch(apiUrl(endpoint), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(getAuthHeaders() || {}),
    },
    body: JSON.stringify({
      workspace_id: resolvedWorkspaceId,
      integration_id: input.integrationId,
      account_id: input.accountId,
      timeframe: input.timeframe,
      start_date: input.timeframe === "custom" ? input.startDate ?? null : null,
      end_date: input.timeframe === "custom" ? input.endDate ?? null : null,
    }),
  });

  const text = await readApiResponseText(endpoint, res);
  const payload = text ? (JSON.parse(text) as MetaSelectOrSyncResponse) : {};

  return {
    raw: payload,
    message:
      payload.message ||
      payload.detail ||
      payload.data?.message ||
      payload.data?.detail ||
      "Synchronization completed.",
    detail: payload.detail || payload.data?.detail || "",
    integrationId: extractIntegrationId(payload) || input.integrationId,
    datasetId: extractDatasetId(payload),
  };
}

export async function disconnectMetaAdsIntegration(input?: {
  workspaceId?: string | null;
}) {
  const activeWorkspaceId = await getRequiredWorkspaceId(input?.workspaceId);
  const endpoint = "/integrations/meta-ads/disconnect";
  const res = await fetch(apiUrl(endpoint), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(getAuthHeaders() || {}),
    },
    body: JSON.stringify({
      workspace_id: activeWorkspaceId,
    }),
  });

  const text = await readApiResponseText(endpoint, res);
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  return {
    ok: res.ok,
    message:
      (typeof payload.message === "string" && payload.message) ||
      (typeof payload.detail === "string" && payload.detail) ||
      "Meta Ads disconnected successfully.",
  };
}

export async function fetchMetaPages(
  integrationId: string,
  workspaceId?: string | null
) {
  const resolvedWorkspaceId = await getRequiredWorkspaceId(workspaceId);
  const res = await fetch(
    apiUrl(
      `/integrations/meta/pages?workspace_id=${encodeURIComponent(
        resolvedWorkspaceId
      )}&integration_id=${encodeURIComponent(integrationId)}`
    ),
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  const endpoint = `/integrations/meta/pages?workspace_id=${encodeURIComponent(
    resolvedWorkspaceId
  )}&integration_id=${encodeURIComponent(integrationId)}`;
  const text = await readApiResponseText(endpoint, res);
  console.log("meta pages response:", text);

  const payload = JSON.parse(text) as MetaPagesResponse;
  return normalizePages(payload);
}

export async function fetchMetaInstagramAccounts(
  integrationId: string,
  workspaceId?: string | null
) {
  const resolvedWorkspaceId = await getRequiredWorkspaceId(workspaceId);
  const endpoint = `/integrations/meta/instagram-accounts?workspace_id=${encodeURIComponent(
    resolvedWorkspaceId
  )}&integration_id=${encodeURIComponent(integrationId)}`;
  const res = await fetch(apiUrl(endpoint), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const text = await readApiResponseText(endpoint, res);
  console.log("meta instagram accounts response:", text);

  const payload = JSON.parse(text) as MetaPagesResponse;
  return normalizePages(payload);
}

export async function fetchMetaPagesCatalog(integrationId: string) {
  const endpoint = `/integrations/meta/pages/catalog?integration_id=${encodeURIComponent(
    integrationId
  )}`;
  const res = await fetch(apiUrl(endpoint), {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  const text = await readApiResponseText(endpoint, res);
  const payload = JSON.parse(text) as MetaPagesResponse;

  return normalizePages(payload);
}

export async function fetchMetaInstagramAccountsCatalog(integrationId: string) {
  const endpoint = `/integrations/meta/instagram-accounts/catalog?integration_id=${encodeURIComponent(
    integrationId
  )}`;
  const res = await fetch(apiUrl(endpoint), {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  const text = await readApiResponseText(endpoint, res);
  const payload = JSON.parse(text) as MetaPagesResponse;

  return normalizePages(payload);
}

export async function refreshMetaPages(input: {
  integrationId: string;
  workspaceId?: string | null;
}) {
  const resolvedWorkspaceId = await getRequiredWorkspaceId(input.workspaceId);
  const endpoint = "/integrations/meta/refresh-pages";
  const payload = {
    workspace_id: resolvedWorkspaceId,
    integration_id: input.integrationId,
  };

  const res = await fetch(apiUrl(endpoint), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(getAuthHeaders() || {}),
    },
    body: JSON.stringify(payload),
  });

  const text = await readApiResponseText(endpoint, res);
  const parsedPayload = text
    ? (JSON.parse(text) as MetaRefreshPagesResponse)
    : {};

  return {
    ok: Boolean(parsedPayload.ok ?? parsedPayload.data?.ok ?? res.ok),
    message:
      parsedPayload.message ||
      parsedPayload.detail ||
      parsedPayload.data?.message ||
      parsedPayload.data?.detail ||
      "",
  };
}

export async function selectMetaPage(input: {
  integrationId: string;
  pageId: string;
}) {
  const payload = {
    integration_id: input.integrationId,
    page_id: input.pageId,
  };

  const res = await fetch(apiUrl("/integrations/meta/select-page"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(getAuthHeaders() || {}),
    },
    body: JSON.stringify(payload),
  });

  const text = await readApiResponseText("/integrations/meta/select-page", res);
  console.log("meta select page response:", text);

  const parsedPayload = text
    ? (JSON.parse(text) as MetaSelectOrSyncResponse)
    : {};

  return {
    raw: parsedPayload,
    integrationId: extractIntegrationId(parsedPayload),
    datasetId: extractDatasetId(parsedPayload),
  };
}

export async function syncMetaPages(input: {
  pageId: string;
  integrationId: string;
  timeframe?: string;
  startDate?: string;
  endDate?: string;
  workspaceId?: string | null;
}) {
  const workspaceId = await getRequiredWorkspaceId(input.workspaceId);
  const payload = {
    workspaceId,
    pageId: input.pageId,
    timeframe: input.timeframe || "last_30d",
    startDate: input.timeframe === "custom" ? input.startDate : undefined,
    endDate: input.timeframe === "custom" ? input.endDate : undefined,
  };
  const finalUrl = apiUrl(
    `/integrations/meta/sync-pages?integration_id=${encodeURIComponent(
      input.integrationId
    )}`
  );
  const headers = {
    "Content-Type": "application/json",
    ...(getAuthHeaders() || {}),
  };
  const body = JSON.stringify(payload);

  console.info("[MetaTimeframe][api.sync.request]", {
    finalUrl,
    method: "POST",
    body,
    headers: {
      contentType: headers["Content-Type"],
      hasAuthorization: Boolean(headers.Authorization),
    },
    integrationId: input.integrationId,
    selectedTimeframe: input.timeframe || "last_30d",
    startDate: input.startDate,
    endDate: input.endDate,
    payload,
  });

  const res = await fetch(
    finalUrl,
    {
      method: "POST",
      headers,
      body,
    }
  );

  const endpoint = `/integrations/meta/sync-pages?integration_id=${encodeURIComponent(
    input.integrationId
  )}`;
  const text = await readApiResponseText(endpoint, res);
  console.log("meta sync pages response:", text);

  const parsedPayload = text
    ? (JSON.parse(text) as MetaSelectOrSyncResponse)
    : {};
  const datasetId = extractDatasetId(parsedPayload);
  const responseTimeframe = extractResponseTimeframe(parsedPayload);
  const responseTimeframeKey = extractResponseTimeframeKey(parsedPayload);
  const reachDailyLength = getDailySeriesLength(parsedPayload, "reach_daily");
  const impressionsDailyLength = getDailySeriesLength(parsedPayload, "impressions_daily");

  console.info("[MetaTimeframe][api.sync.response]", {
    integrationId:
      extractIntegrationId(parsedPayload) || input.integrationId,
    datasetId,
    requestTimeframe: input.timeframe || "last_30d",
    responseTimeframe,
    responseTimeframeKey,
    reachDailyLength,
    impressionsDailyLength,
    raw: parsedPayload,
  });

  if (responseTimeframeKey && responseTimeframeKey !== (input.timeframe || "last_30d")) {
    console.warn("[MetaTimeframe][api.sync.response] timeframe mismatch", {
      requestTimeframe: input.timeframe || "last_30d",
      responseTimeframe,
      responseTimeframeKey,
      datasetId,
    });
  }

  return {
    raw: parsedPayload,
    message:
      parsedPayload.message ||
      parsedPayload.detail ||
      parsedPayload.data?.message ||
      parsedPayload.data?.detail ||
      "Sincronizacion completada.",
    detail: parsedPayload.detail || parsedPayload.data?.detail || "",
    integrationId:
      extractIntegrationId(parsedPayload) || input.integrationId,
    datasetId,
  };
}

export async function syncMetaInstagramAccount(input: {
  accountId: string;
  integrationId: string;
  timeframe: string;
  startDate?: string;
  endDate?: string;
  workspaceId?: string | null;
}) {
  const workspaceId = await getRequiredWorkspaceId(input.workspaceId);
  const payload = {
    integration_id: Number(input.integrationId),
    instagram_account_id: input.accountId,
    workspace_id: Number(workspaceId),
    timeframe: input.timeframe,
    start_date: input.timeframe === "custom" ? input.startDate ?? null : null,
    end_date: input.timeframe === "custom" ? input.endDate ?? null : null,
  };
  const endpoint = "/integrations/meta/sync-instagram-business";
  const finalUrl = apiUrl(endpoint);
  const headers = {
    "Content-Type": "application/json",
    ...(getAuthHeaders() || {}),
  };
  const body = JSON.stringify(payload);

  console.info("[MetaTimeframe][api.syncInstagram.request]", {
    finalUrl,
    method: "POST",
    body,
    headers: {
      contentType: headers["Content-Type"],
      hasAuthorization: Boolean(headers.Authorization),
    },
    integrationId: input.integrationId,
    instagramAccountId: input.accountId,
    selectedTimeframe: input.timeframe,
    startDate: input.startDate,
    endDate: input.endDate,
    payload,
  });

  const res = await fetch(finalUrl, {
    method: "POST",
    headers,
    body,
  });

  const text = await readApiResponseText(endpoint, res);
  console.log("meta sync instagram account response:", text);

  const parsedPayload = text
    ? (JSON.parse(text) as MetaSelectOrSyncResponse)
    : {};
  const datasetId = extractDatasetId(parsedPayload);

  return {
    raw: parsedPayload,
    message:
      parsedPayload.message ||
      parsedPayload.detail ||
      parsedPayload.data?.message ||
      parsedPayload.data?.detail ||
      "Sincronizacion completada.",
    detail: parsedPayload.detail || parsedPayload.data?.detail || "",
    integrationId:
      extractIntegrationId(parsedPayload) || input.integrationId,
    datasetId,
  };
}

export async function syncAllMetaDataSources(input: {
  facebookPageId?: string;
  instagramBusinessAccountId?: string;
  timeframe: string;
}) {
  const endpoint = "/integrations/meta/sync-all";
  const finalUrl = apiUrl(endpoint);
  const payload = {
    facebook_page_id: input.facebookPageId || undefined,
    instagram_business_account_id: input.instagramBusinessAccountId || undefined,
    timeframe: input.timeframe,
  };
  const headers = {
    "Content-Type": "application/json",
    ...(getAuthHeaders() || {}),
  };
  const body = JSON.stringify(payload);

  console.info("[MetaSyncAll][request.payload]", payload);

  const res = await fetch(finalUrl, {
    method: "POST",
    headers,
    body,
  });

  const text = await res.text();
  const parsedPayload = parseJsonText(text);

  console.info("[MetaSyncAll][response.status]", res.status);
  console.info("[MetaSyncAll][response.body]", parsedPayload ?? text);

  const topLevelRecord = isRecord(parsedPayload) ? parsedPayload : null;
  const topLevelMessage =
    (topLevelRecord ? getRecordMessage(topLevelRecord) : "") ||
    (res.ok ? "Sync completed." : "We could not sync the selected data sources.");

  return {
    ok: res.ok,
    status: res.status,
    message: topLevelMessage,
    raw: parsedPayload ?? text,
    sources: {
      facebook_pages: extractSyncAllSourceResult(
        getNestedSourcePayload(parsedPayload, [
          "facebook_pages",
          "facebook_page",
          "facebookPages",
          "facebookPage",
          "facebook",
        ])
      ),
      instagram_business: extractSyncAllSourceResult(
        getNestedSourcePayload(parsedPayload, [
          "instagram_business",
          "instagram_business_account",
          "instagramBusiness",
          "instagramBusinessAccount",
          "instagram",
        ])
      ),
    },
  } satisfies MetaSyncAllResult;
}
