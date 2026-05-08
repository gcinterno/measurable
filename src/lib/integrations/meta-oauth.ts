"use client";

const META_OAUTH_READY_BANNER_ID = "meta-oauth-ready-banner";
const META_OAUTH_DEBUG_URL_KEY = "metaOAuthDebugUrl";

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

export async function showMetaOAuthReadyBanner() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  let banner = document.getElementById(META_OAUTH_READY_BANNER_ID);

  if (!banner) {
    banner = document.createElement("div");
    banner.id = META_OAUTH_READY_BANNER_ID;
    banner.textContent = "OAuth URL ready";
    banner.setAttribute(
      "style",
      [
        "position:fixed",
        "left:16px",
        "right:16px",
        "bottom:16px",
        "z-index:9999",
        "border-radius:16px",
        "background:#0f172a",
        "color:#ffffff",
        "padding:12px 16px",
        "font:600 14px/1.4 system-ui,sans-serif",
        "box-shadow:0 24px 80px rgba(15,23,42,0.24)",
        "text-align:center",
      ].join(";")
    );
    document.body.appendChild(banner);
  }

  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => resolve(), 60);
    });
  });
}
