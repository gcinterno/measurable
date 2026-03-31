import { apiUrl } from "@/lib/api/config";

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
      name?: string | null;
    }>
  | {
      pages?: Array<{
        id?: string | number;
        page_id?: string | number;
        name?: string | null;
      }>;
      items?: Array<{
        id?: string | number;
        page_id?: string | number;
        name?: string | null;
      }>;
      data?: Array<{
        id?: string | number;
        page_id?: string | number;
        name?: string | null;
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
  data?: {
    message?: string;
    detail?: string;
    integration_id?: string | number;
    integrationId?: string | number;
    dataset_id?: string | number;
    dataset_file_id?: string | number;
    datasetId?: string | number;
  };
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

function getMetaFrontendCallbackUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.origin}/integrations/meta/callback`;
}

function rewriteMetaRedirectUrl(redirectUrl: string) {
  if (!redirectUrl) {
    return "";
  }

  try {
    const url = new URL(redirectUrl);
    const frontendCallbackUrl = getMetaFrontendCallbackUrl();

    if (frontendCallbackUrl) {
      url.searchParams.set("redirect_uri", frontendCallbackUrl);
    }

    return url.toString();
  } catch {
    return redirectUrl;
  }
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

function getRedirectUrl(text: string) {
  try {
    const parsed = JSON.parse(text) as MetaConnectResponse;
    const redirectUrl =
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
      redirectUrl: rewriteMetaRedirectUrl(redirectUrl),
      connected,
      message: parsed.message || parsed.data?.message || "",
      integrationId: extractIntegrationId(parsed),
    };
  } catch {
    if (text.startsWith("http://") || text.startsWith("https://")) {
      return {
        redirectUrl: rewriteMetaRedirectUrl(text),
        connected: false,
        message: "",
        integrationId: "",
      };
    }

    return {
      redirectUrl: "",
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
    id: String(page.id ?? page.page_id ?? `page-${index}`),
    name: page.name || `Page ${index + 1}`,
  })) satisfies MetaEntity[];
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

  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || "No fue posible iniciar la conexion con Meta.");
  }

  return getRedirectUrl(text);
}

export async function completeMetaIntegrationCallback(
  searchParams: URLSearchParams
) {
  const query = searchParams.toString();
  const endpoint = query
    ? `/integrations/meta/callback-pages?${query}`
    : "/integrations/meta/callback-pages";

  const res = await fetch(apiUrl(endpoint), {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || "No fue posible completar la conexion con Meta.");
  }

  const payload = text ? (JSON.parse(text) as MetaConnectResponse) : {};

  return {
    connected:
      payload.connected ||
      payload.data?.connected ||
      payload.status === "connected" ||
      payload.data?.status === "connected" ||
      false,
    message: payload.message || payload.data?.message || "",
    integrationId: extractIntegrationId(payload),
  };
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

  const text = await res.text();
  console.log("meta pages response:", text);

  if (!res.ok) {
    throw new Error(text || "No fue posible cargar las paginas de Meta.");
  }

  const payload = JSON.parse(text) as MetaPagesResponse;
  return normalizePages(payload);
}

export async function selectMetaPage(input: {
  integrationId: string;
  pageId: string;
}) {
  const workspaceId = getRequiredWorkspaceId();
  const payload = {
    integration_id: Number(input.integrationId),
    workspace_id: Number(workspaceId),
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

  const text = await res.text();
  console.log("meta select page response:", text);

  if (!res.ok) {
    throw new Error(text || "No fue posible seleccionar la pagina.");
  }

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
}) {
  const workspaceId = getRequiredWorkspaceId();
  const payloads = [
    {
      workspace_id: workspaceId,
      page_id: input.pageId,
    },
    {
      workspaceId,
      pageId: input.pageId,
    },
  ];

  let lastError: Error | null = null;

  for (const payload of payloads) {
    try {
      const res = await fetch(
        apiUrl(
          `/integrations/meta/sync-pages?integration_id=${encodeURIComponent(
            input.integrationId
          )}`
        ),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(getAuthHeaders() || {}),
          },
          body: JSON.stringify(payload),
        }
      );

      const text = await res.text();
      console.log("meta sync pages response:", text);

      if (!res.ok) {
        throw new Error(text || "No fue posible sincronizar la pagina.");
      }

      const parsedPayload = text
        ? (JSON.parse(text) as MetaSelectOrSyncResponse)
        : {};

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
        datasetId: extractDatasetId(parsedPayload),
      };
    } catch (error) {
      lastError = error as Error;
    }
  }

  throw lastError || new Error("No fue posible sincronizar la pagina.");
}
