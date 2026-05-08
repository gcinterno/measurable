"use client";

const META_OAUTH_READY_BANNER_ID = "meta-oauth-ready-banner";
const META_OAUTH_DEBUG_URL_KEY = "metaOAuthDebugUrl";
const META_OAUTH_PENDING_KEY = "metaOAuthPending";
const META_OAUTH_PENDING_FLAG_KEY = "metaOAuthPendingFlag";
const META_OAUTH_MAX_AGE_MS = 10 * 60 * 1000;
const META_OAUTH_MIN_RETURN_DELAY_MS = 1500;
const META_OAUTH_MAX_AUTO_RETRIES = 1;

type PendingMetaOAuth = {
  authUrl: string;
  oauthState: string;
  source: string;
  route: string;
  createdAt: number;
  lastRedirectAt: number;
  retryCount: number;
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

export function normalizeMetaAuthUrl(rawAuthUrl: string) {
  const parsedUrl = new URL(rawAuthUrl);

  if (!parsedUrl.searchParams.get("auth_type")) {
    parsedUrl.searchParams.set("auth_type", "rerequest");
  }

  if (!parsedUrl.searchParams.get("display")) {
    parsedUrl.searchParams.set("display", "touch");
  }

  return parsedUrl.toString();
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
}) {
  const nextValue = {
    authUrl: input.authUrl,
    oauthState: getMetaOAuthState(input.authUrl),
    source: input.source,
    route: input.route,
    createdAt: Date.now(),
    lastRedirectAt: 0,
    retryCount: 0,
  } satisfies PendingMetaOAuth;

  writePendingMetaOAuth(nextValue);

  console.info("META_AUTH_URL_CREATED", {
    source: input.source,
    route: input.route,
    auth_url: input.authUrl,
    oauth_state: nextValue.oauthState || null,
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
