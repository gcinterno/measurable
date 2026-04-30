import { apiUrl } from "@/lib/api/config";
import { readApiResponseText } from "@/lib/api";

const META_PAGES_WORKSPACE_ID = "1";

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

type MetaPagesResponse =
  | Array<{
      id?: string | number;
      page_id?: string | number;
      account_id?: string | number;
      instagram_account_id?: string | number;
      name?: string | null;
      username?: string | null;
    }>
  | {
      pages?: Array<{
        id?: string | number;
        page_id?: string | number;
        account_id?: string | number;
        instagram_account_id?: string | number;
        name?: string | null;
        username?: string | null;
      }>;
      items?: Array<{
        id?: string | number;
        page_id?: string | number;
        account_id?: string | number;
        instagram_account_id?: string | number;
        name?: string | null;
        username?: string | null;
      }>;
      data?: Array<{
        id?: string | number;
        page_id?: string | number;
        account_id?: string | number;
        instagram_account_id?: string | number;
        name?: string | null;
        username?: string | null;
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

type IntegrationsStatusResult = {
  metaConnected: boolean;
  integrationId: string;
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

function getRequiredWorkspaceId() {
  return META_PAGES_WORKSPACE_ID;
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
    name: page.name || page.username || `Account ${index + 1}`,
  })) satisfies MetaEntity[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

function extractMetaConnectionStatus(payload: unknown): IntegrationsStatusResult {
  const queue: unknown[] = [payload];
  let metaConnected = false;
  let integrationId = "";

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

    if (mentionsMeta && getRecordConnected(current)) {
      metaConnected = true;

      if (!integrationId) {
        integrationId = getRecordIntegrationId(current);
      }
    }

    Object.values(current).forEach((value) => {
      if (Array.isArray(value) || isRecord(value)) {
        queue.push(value);
      }
    });
  }

  return {
    metaConnected,
    integrationId,
  };
}

export async function connectMetaIntegration() {
  const res = await fetch(
    apiUrl(
      `/integrations/meta/connect-pages?workspace_id=${encodeURIComponent(
        getRequiredWorkspaceId()
      )}`
    ),
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  const text = await readApiResponseText(
    `/integrations/meta/connect-pages?workspace_id=${encodeURIComponent(
      getRequiredWorkspaceId()
    )}`,
    res
  );

  return getRedirectUrl(text);
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

export async function fetchMetaPages(integrationId: string) {
  const workspaceId = getRequiredWorkspaceId();
  const res = await fetch(
    apiUrl(
      `/integrations/meta/pages?workspace_id=${encodeURIComponent(
        workspaceId
      )}&integration_id=${encodeURIComponent(integrationId)}`
    ),
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  const endpoint = `/integrations/meta/pages?workspace_id=${encodeURIComponent(
    workspaceId
  )}&integration_id=${encodeURIComponent(integrationId)}`;
  const text = await readApiResponseText(endpoint, res);
  console.log("meta pages response:", text);

  const payload = JSON.parse(text) as MetaPagesResponse;
  return normalizePages(payload);
}

export async function fetchMetaInstagramAccounts(integrationId: string) {
  const workspaceId = getRequiredWorkspaceId();
  const endpoint = `/integrations/meta/instagram-accounts?workspace_id=${encodeURIComponent(
    workspaceId
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
  timeframe: string;
  startDate?: string;
  endDate?: string;
}) {
  const workspaceId = getRequiredWorkspaceId();
  const payload = {
    workspaceId,
    pageId: input.pageId,
    timeframe: input.timeframe,
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
    selectedTimeframe: input.timeframe,
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
    requestTimeframe: input.timeframe,
    responseTimeframe,
    responseTimeframeKey,
    reachDailyLength,
    impressionsDailyLength,
    raw: parsedPayload,
  });

  if (responseTimeframeKey && responseTimeframeKey !== input.timeframe) {
    console.warn("[MetaTimeframe][api.sync.response] timeframe mismatch", {
      requestTimeframe: input.timeframe,
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
