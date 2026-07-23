"use client";

const META_OAUTH_DEBUG_URL_KEY = "metaOAuthDebugUrl";
const META_OAUTH_PENDING_KEY = "metaOAuthPending";
const META_OAUTH_PENDING_FLAG_KEY = "metaOAuthPendingFlag";
const META_OAUTH_MAX_AGE_MS = 10 * 60 * 1000;
const META_OAUTH_MIN_RETURN_DELAY_MS = 1500;
const META_OAUTH_MAX_AUTO_RETRIES = 1;
export const META_OAUTH_POPUP_NAME = "measurable_meta_oauth";
export const META_OAUTH_POPUP_FEATURES = "width=720,height=780";
export const META_OAUTH_CONNECT_SUCCESS = "MEASURABLE_META_CONNECT_SUCCESS";
export const META_OAUTH_CONNECT_ERROR = "MEASURABLE_META_CONNECT_ERROR";
export const INTEGRATION_OAUTH_COMPLETE_MESSAGE_TYPE =
  "measurable:integration-oauth-complete";
export const META_OAUTH_POPUP_CLOSE_GRACE_MS = 1500;
export const META_OAUTH_POPUP_TIMEOUT_MS = 90000;
export type MetaOAuthSource =
  | "facebook_pages"
  | "instagram_business"
  | "meta_ads";

export type IntegrationOAuthCompleteProvider =
  | MetaOAuthSource
  | "meta_business_suite"
  | "instagram_business_login";

export type IntegrationOAuthCompleteMessage = {
  type: typeof INTEGRATION_OAUTH_COMPLETE_MESSAGE_TYPE;
  provider?: IntegrationOAuthCompleteProvider;
  source?: string;
  integration_type?: string;
  status?: string;
  integrationId?: string;
  workspaceId?: string;
  message?: string;
  error?: string;
};

export const FACEBOOK_PAGES_SCOPES = [
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
  "read_insights",
  "pages_read_user_content",
] as const;

export const INSTAGRAM_BUSINESS_SCOPES_INDEPENDENT = [
  "instagram_business_basic",
  "instagram_business_manage_insights",
] as const;

export const META_ADS_SCOPES = ["public_profile", "ads_read"] as const;

export const META_OAUTH_SCOPE_SETS = {
  facebook_pages: FACEBOOK_PAGES_SCOPES,
  instagram_business: INSTAGRAM_BUSINESS_SCOPES_INDEPENDENT,
  meta_ads: META_ADS_SCOPES,
} as const;

// Instagram Business uses the same Meta/Facebook OAuth route as the Pages + linked Instagram flow.

export function getMetaOAuthScopesForSource(source: MetaOAuthSource) {
  return [...META_OAUTH_SCOPE_SETS[source]];
}

export function getMetaOAuthScopeStringForSource(source: MetaOAuthSource) {
  return getMetaOAuthScopesForSource(source).join(",");
}

export function getMetaOAuthAuthDomainForSource(source: MetaOAuthSource) {
  if (source === "instagram_business") {
    return "facebook.com";
  }

  return "facebook.com";
}

type MetaOAuthTransport = "same_tab" | "popup";

type PendingMetaOAuth = {
  authUrl: string;
  oauthState: string;
  source: string;
  route: string;
  transport: MetaOAuthTransport;
  createdAt: number;
  lastRedirectAt: number;
  retryCount: number;
};

export type MetaOAuthWindowMessage =
  | {
      type: typeof META_OAUTH_CONNECT_SUCCESS;
      provider?: "meta" | "meta_ads" | "instagram_business" | "meta_business_suite" | "instagram_business_login";
      source?: string;
      integration_type?: string;
      integrationId?: string;
      pagesCount?: number;
      redirectTo?: string;
      status?: string;
      assetCount?: number;
      asset_count?: number;
      message?: string;
      missingScopes?: string[];
      missing_scopes?: string[];
    }
  | {
      type: typeof META_OAUTH_CONNECT_ERROR;
      provider?: "meta" | "meta_ads" | "instagram_business" | "meta_business_suite" | "instagram_business_login";
      source?: string;
      integration_type?: string;
      message: string;
      status?: string;
      missingScopes?: string[];
      missing_scopes?: string[];
    };

function readPendingMetaOAuth() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(META_OAUTH_PENDING_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as PendingMetaOAuth;
  } catch {
    return null;
  }
}

function writePendingMetaOAuth(value: PendingMetaOAuth) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(META_OAUTH_PENDING_KEY, JSON.stringify(value));
  window.sessionStorage.setItem(META_OAUTH_PENDING_FLAG_KEY, "1");
}

function isPendingMetaOAuthExpired(value: PendingMetaOAuth) {
  return Date.now() - value.createdAt > META_OAUTH_MAX_AGE_MS;
}

export function getMetaOAuthDebugUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.sessionStorage.getItem(META_OAUTH_DEBUG_URL_KEY) || "";
}

export function storeMetaOAuthDebugUrl(authUrl: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(META_OAUTH_DEBUG_URL_KEY, authUrl);
}

export function clearMetaOAuthDebugUrl() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(META_OAUTH_DEBUG_URL_KEY);
}

export function clearPendingMetaOAuth() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(META_OAUTH_PENDING_KEY);
  window.sessionStorage.removeItem(META_OAUTH_PENDING_FLAG_KEY);
}

export function hasPendingMetaOAuthFlag() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(META_OAUTH_PENDING_FLAG_KEY) === "1";
}

export function normalizeMetaAuthUrl(
  rawAuthUrl: string,
  source: MetaOAuthSource = "facebook_pages"
) {
  if (source === "instagram_business") {
    return rawAuthUrl;
  }

  const parsedUrl = new URL(rawAuthUrl);

  parsedUrl.searchParams.set("scope", getMetaOAuthScopeStringForSource(source));

  if (!parsedUrl.searchParams.get("auth_type")) {
    parsedUrl.searchParams.set("auth_type", "rerequest");
  }

  if (!parsedUrl.searchParams.get("display")) {
    parsedUrl.searchParams.set("display", "touch");
  }

  return parsedUrl.toString();
}

export function getMetaOAuthRequestedScopes(
  authUrl: string,
  source: MetaOAuthSource = "facebook_pages"
) {
  try {
    const rawScope = new URL(authUrl).searchParams.get("scope") || "";
    const parsedScopes = rawScope
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean);

    return parsedScopes.length > 0
      ? parsedScopes
      : getMetaOAuthScopesForSource(source);
  } catch {
    return getMetaOAuthScopesForSource(source);
  }
}

export function getMissingMetaOAuthScopes(
  scopes: string[],
  source: MetaOAuthSource = "facebook_pages"
) {
  const normalized = new Set(scopes.map((scope) => scope.trim()).filter(Boolean));

  return getMetaOAuthScopesForSource(source).filter((scope) => !normalized.has(scope));
}

export function getMetaOAuthFriendlyErrorMessage(
  source: MetaOAuthSource,
  message?: string | null
) {
  const rawMessage = (message || "").trim();
  const normalizedMessage = rawMessage.toLowerCase();

  if (source === "instagram_business") {
    if (
      normalizedMessage.includes("insufficient developer role") ||
      normalizedMessage.includes("developer role")
    ) {
      return "Instagram could not be connected because this Instagram account is not added as a tester/developer for the Instagram Business Login app yet. Add the account in Meta Developers > Instagram > API setup with Instagram login > Add account, accept the invite, or wait until the app review is approved/live.";
    }

    if (
      normalizedMessage.includes("instagram_business_not_configured") ||
      normalizedMessage.includes("missing: instagram_app_id") ||
      normalizedMessage.includes("missing: instagram_app_secret") ||
      normalizedMessage.includes("missing: instagram_redirect_uri")
    ) {
      return "Instagram Business could not be connected because the app is not configured. Missing: INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, INSTAGRAM_REDIRECT_URI.";
    }

    if (
      normalizedMessage.includes("access_denied") ||
      normalizedMessage.includes("invalid_scope")
    ) {
      return "Instagram Business could not be connected. The Instagram OAuth request was denied or the requested scope is not available for this account.";
    }

    if (normalizedMessage.includes("instagram")) {
      return rawMessage || "Instagram Business could not be connected. Please try again.";
    }

    return rawMessage || "Instagram Business could not be connected. Please try again.";
  }

  return rawMessage || "We couldn’t complete the Meta connection. Please try again.";
}

export function getMetaAdsStatusMessage(input: {
  status?: string | null;
  message?: string | null;
  missingScopes?: string[];
}) {
  const status = (input.status || "").trim().toLowerCase();
  const rawMessage = (input.message || "").trim();
  const missingScopes = input.missingScopes || [];

  if (status === "connected") {
    return "Meta Ads connected successfully.";
  }

  if (status === "needs_permission") {
    if (missingScopes.includes("business_management")) {
      return "Meta Ads connected, but Business Manager access is required to discover ad accounts. Please reconnect and approve business_management.";
    }

    return (
      rawMessage ||
      "Meta Ads connected, but additional permissions are required to discover ad accounts."
    );
  }

  if (status === "connected_no_assets" || status === "no_authorized_assets") {
    return "Meta Ads connected, but no ad accounts were found. Make sure your Meta user has access to an ad account in Business Manager.";
  }

  if (status === "config_missing") {
    return "Meta Ads OAuth is not fully configured.";
  }

  if (status === "no_token") {
    return rawMessage || "Meta Ads OAuth did not return an access token.";
  }

  if (status === "disconnected") {
    return rawMessage || "Meta Ads is disconnected.";
  }

  if (status === "error") {
    return rawMessage || "We couldn’t complete the Meta Ads connection. Please try again.";
  }

  return rawMessage || "";
}

export function isValidMetaAuthUrlForSource(
  value: string,
  source: MetaOAuthSource = "facebook_pages"
) {
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

export function getMetaOAuthState(authUrl: string) {
  try {
    return new URL(authUrl).searchParams.get("state") || "";
  } catch {
    return "";
  }
}

export function hasMetaConnectPrerequisites() {
  if (typeof window === "undefined") {
    return {
      tokenReady: false,
    };
  }

  return {
    tokenReady: Boolean(window.localStorage.getItem("token")),
  };
}

export function createPendingMetaOAuth(input: {
  authUrl: string;
  source: string;
  route: string;
  transport?: MetaOAuthTransport;
}) {
  const source = (input.source as MetaOAuthSource) || "facebook_pages";
  const requestedScopes = getMetaOAuthRequestedScopes(input.authUrl, source);
  const nextValue = {
    authUrl: input.authUrl,
    oauthState: getMetaOAuthState(input.authUrl),
    source,
    route: input.route,
    transport: input.transport || "same_tab",
    createdAt: Date.now(),
    lastRedirectAt: 0,
    retryCount: 0,
  } satisfies PendingMetaOAuth;

  writePendingMetaOAuth(nextValue);

  console.info("META_OAUTH_SCOPES_REQUESTED", {
    source,
    integration_type: source,
    route: input.route,
    scopes: requestedScopes,
  });
  console.info("META_OAUTH_AUTH_URL_CREATED", {
    source,
    integration_type: source,
    route: input.route,
    auth_url: input.authUrl,
    oauth_state: nextValue.oauthState || null,
    transport: nextValue.transport,
    scopes: requestedScopes,
  });
}

export function markMetaRedirectStarted() {
  const currentValue = readPendingMetaOAuth();

  if (!currentValue) {
    return;
  }

  const nextValue = {
    ...currentValue,
    lastRedirectAt: Date.now(),
  } satisfies PendingMetaOAuth;

  writePendingMetaOAuth(nextValue);

  console.info("META_REDIRECT_STARTED", {
    source: nextValue.source,
    route: nextValue.route,
    auth_url: nextValue.authUrl,
    oauth_state: nextValue.oauthState || null,
    transport: nextValue.transport,
    retry_count: nextValue.retryCount,
  });
}

export function consumePendingMetaOAuthForRetry(input: {
  route: string;
  hasCallbackParams: boolean;
}) {
  if (typeof window === "undefined") {
    return null;
  }

  if (input.hasCallbackParams) {
    return null;
  }

  if (!hasPendingMetaOAuthFlag()) {
    return null;
  }

  const currentValue = readPendingMetaOAuth();

  if (!currentValue) {
    clearPendingMetaOAuth();
    return null;
  }

  if (isPendingMetaOAuthExpired(currentValue)) {
    clearPendingMetaOAuth();
    return null;
  }

  if (currentValue.transport === "popup") {
    return null;
  }

  const timeSinceLastRedirect = Date.now() - currentValue.lastRedirectAt;

  if (timeSinceLastRedirect < META_OAUTH_MIN_RETURN_DELAY_MS) {
    return null;
  }

  console.info("META_RETURN_WITHOUT_CALLBACK", {
    current_route: input.route,
    source: currentValue.source,
    pending_route: currentValue.route,
    auth_url: currentValue.authUrl,
    oauth_state: currentValue.oauthState || null,
    retry_count: currentValue.retryCount,
    age_ms: Date.now() - currentValue.createdAt,
    time_since_last_redirect_ms: timeSinceLastRedirect,
  });

  if (currentValue.retryCount >= META_OAUTH_MAX_AUTO_RETRIES) {
    clearPendingMetaOAuth();
    return null;
  }

  const nextValue = {
    ...currentValue,
    retryCount: currentValue.retryCount + 1,
    lastRedirectAt: Date.now(),
  } satisfies PendingMetaOAuth;

  writePendingMetaOAuth(nextValue);

  console.info("META_AUTO_RETRY", {
    current_route: input.route,
    source: nextValue.source,
    auth_url: nextValue.authUrl,
    oauth_state: nextValue.oauthState || null,
    retry_count: nextValue.retryCount,
  });

  return nextValue.authUrl;
}

export async function showMetaOAuthReadyBanner() {
  return Promise.resolve();
}

export function openMetaOAuthPopup(authUrl: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return window.open(authUrl, META_OAUTH_POPUP_NAME, META_OAUTH_POPUP_FEATURES);
}

export function logMetaOAuthDev(event: string, payload?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info(`[MetaOAuth][dev] ${event}`, payload || {});
}

export function isMetaOAuthWindowMessage(
  data: unknown
): data is MetaOAuthWindowMessage {
  if (!data || typeof data !== "object") {
    return false;
  }

  const candidate = data as {
    type?: string;
    provider?: string;
    source?: string;
    integration_type?: string;
  };
  const provider =
    candidate.provider || candidate.source || candidate.integration_type;

  return (
    (provider === "meta" ||
      provider === "meta_ads" ||
      provider === "instagram_business" ||
      provider === "instagram_business_login" ||
      provider === "meta_business_suite") &&
    (candidate.type === META_OAUTH_CONNECT_SUCCESS ||
      candidate.type === META_OAUTH_CONNECT_ERROR)
  );
}

export function postMetaOAuthMessageToOpener(message: MetaOAuthWindowMessage) {
  if (typeof window === "undefined" || !window.opener) {
    return false;
  }

  try {
    window.opener.postMessage(message, window.location.origin);
    return true;
  } catch (error) {
    console.error("meta oauth opener postMessage error:", error);
    return false;
  }
}

export function isIntegrationOAuthCompleteMessage(
  data: unknown
): data is IntegrationOAuthCompleteMessage {
  if (!data || typeof data !== "object") {
    return false;
  }

  const candidate = data as {
    type?: string;
    provider?: string;
    source?: string;
    integration_type?: string;
    status?: string;
    integrationId?: string;
    workspaceId?: string;
    message?: string;
    error?: string;
  };
  const provider =
    candidate.provider || candidate.source || candidate.integration_type;

  return (
    candidate.type === INTEGRATION_OAUTH_COMPLETE_MESSAGE_TYPE &&
    (provider === "facebook_pages" ||
      provider === "instagram_business" ||
      provider === "instagram_business_login" ||
      provider === "meta_ads" ||
      provider === "meta_business_suite")
  );
}

export function postIntegrationOAuthCompleteToOpener(
  message: IntegrationOAuthCompleteMessage
) {
  if (typeof window === "undefined" || !window.opener) {
    return false;
  }

  try {
    window.opener.postMessage(message, window.location.origin);
    return true;
  } catch (error) {
    console.error("integration oauth opener postMessage error:", error);
    return false;
  }
}
