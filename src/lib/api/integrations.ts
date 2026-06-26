import { apiUrl } from "@/lib/api/config";
import { ApiError, readApiResponseText } from "@/lib/api";
import { fetchWorkspaces, resolveActiveWorkspace } from "@/lib/api/workspaces";
import { trackMetaEvent } from "@/lib/tracking/meta";

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

type IntegrationsStatusResult = {
  metaConnected: boolean;
  integrationId: string;
  metaAdsConnected: boolean;
  metaAdsIntegrationId: string;
  tokenScopes?: string[];
};

type MetaAuthUrlValidationResult = {
  isValid: boolean;
  startsWithFacebook: boolean;
  containsDialogOAuth: boolean;
};

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

export function validateMetaAuthUrl(value: string): MetaAuthUrlValidationResult {
  if (!value) {
    return {
      isValid: false,
      startsWithFacebook: false,
      containsDialogOAuth: false,
    };
  }

  try {
    const parsedUrl = new URL(value);
    const isHttpUrl =
      parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
    const startsWithFacebook = value.startsWith("https://www.facebook.com/");
    const containsDialogOAuth =
      parsedUrl.pathname.includes("/dialog/oauth") ||
      `${parsedUrl.pathname}${parsedUrl.search}`.includes("/dialog/oauth");

    return {
      isValid: isHttpUrl && startsWithFacebook && containsDialogOAuth,
      startsWithFacebook,
      containsDialogOAuth,
    };
  } catch {
    return {
      isValid: false,
      startsWithFacebook: false,
      containsDialogOAuth: false,
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

function getRecordConnected(record: Record<string, unknown>) {
  if (record.connected === true || record.is_connected === true || record.isConnected === true) {
    return true;
  }

  return getRecordStatus(record) === "connected";
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
  const queue: unknown[] = [payload];
  let metaConnected = false;
  let integrationId = "";
  let metaAdsConnected = false;
  let metaAdsIntegrationId = "";
  const tokenScopes = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    if (!isRecord(current)) {
      continue;
    }

    const haystack = getRecordString(current);
    const mentionsMeta =
      haystack.includes("meta") ||
      haystack.includes("facebook") ||
      haystack.includes("facebook_pages") ||
      haystack.includes("instagram") ||
      haystack.includes("instagram_business");
    const mentionsMetaAds =
      haystack.includes("meta ads") ||
      haystack.includes("meta_ads") ||
      haystack.includes("ad account") ||
      haystack.includes("ads insights") ||
      haystack.includes("marketing api");

    if (mentionsMeta && getRecordConnected(current)) {
      metaConnected = true;

      if (!integrationId) {
        integrationId = getRecordIntegrationId(current);
      }
    }

    if (mentionsMetaAds && getRecordConnected(current)) {
      metaAdsConnected = true;

      if (!metaAdsIntegrationId) {
        metaAdsIntegrationId = getRecordIntegrationId(current);
      }
    }

    getScopesFromRecord(current).forEach((scope) => tokenScopes.add(scope));

    Object.values(current).forEach((value) => {
      if (Array.isArray(value) || isRecord(value)) {
        queue.push(value);
      }
    });
  }

  return {
    metaConnected,
    integrationId,
    metaAdsConnected,
    metaAdsIntegrationId,
    tokenScopes: Array.from(tokenScopes),
  };
}

export async function connectMetaIntegration(input?: {
  workspaceId?: string | null;
  source?: string | null;
  reconnect?: boolean;
}) {
  const activeWorkspaceId = await getRequiredWorkspaceId(input?.workspaceId);
  void trackMetaEvent("MetaConnectStarted", {
    workspace_id: activeWorkspaceId,
    source: input?.source || "facebook_pages",
    reconnect: input?.reconnect === true,
  });
  const searchParams = new URLSearchParams({
    workspace_id: activeWorkspaceId,
  });

  if (input?.reconnect) {
    searchParams.set("reconnect", "true");
  }

  const endpoint = `/integrations/meta/connect-pages?${searchParams.toString()}`;
  const connectUrl = apiUrl(endpoint);

  console.log("[MetaOAuth][connect]", {
    activeWorkspaceId,
    source: input?.source || null,
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
    source: input?.source || null,
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

export async function fetchIntegrationsConnectionStatus() {
  const endpoint = "/integrations";
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

export async function fetchMetaAdsStatus(workspaceId?: string | null) {
  const resolvedWorkspaceId = await getRequiredWorkspaceId(workspaceId);
  const endpoint = `/integrations/meta-ads/status?workspace_id=${encodeURIComponent(
    resolvedWorkspaceId
  )}`;
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

  return {
    connected:
      Boolean(record.connected) ||
      Boolean(record.is_connected) ||
      Boolean(data.connected) ||
      Boolean(data.is_connected) ||
      getRecordStatus(record) === "connected" ||
      getRecordStatus(data) === "connected",
    integrationId: getRecordIntegrationId(record) || getRecordIntegrationId(data),
    tokenScopes: tokenScopes.length > 0 ? Array.from(new Set(tokenScopes)) : [],
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
