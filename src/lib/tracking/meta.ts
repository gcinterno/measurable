import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth-store";

type MetaValue = string | number | boolean | null | undefined;
type MetaParams = Record<string, MetaValue>;

type MetaTrackOptions = {
  eventId?: string;
};

type MetaTrackingPayload = {
  event_name: string;
  event_id: string;
  event_source_url: string;
  fbp: string | null;
  fbc: string | null;
  custom_data: Record<string, string | number | boolean | null>;
};

type FbqFunction = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: FbqFunction;
    _fbq?: FbqFunction;
  }
}

const META_PIXEL_ENABLED = process.env.NEXT_PUBLIC_META_PIXEL_ENABLED === "true";
const META_PIXEL_DEBUG = process.env.NEXT_PUBLIC_META_PIXEL_DEBUG === "true";
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";

let pixelInitialized = false;

function debugLog(message: string, payload?: Record<string, unknown>) {
  if (!META_PIXEL_DEBUG) {
    return;
  }

  console.info(`[MetaPixel] ${message}`, payload || {});
}

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function isLocalhost() {
  if (!isBrowser()) {
    return false;
  }

  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function isAdminUser() {
  const user = useAuthStore.getState().user;
  return Boolean(user?.isAdmin || user?.role === "admin");
}

function canTrackMeta() {
  if (!isBrowser()) {
    return false;
  }

  if (!META_PIXEL_ENABLED || !META_PIXEL_ID) {
    return false;
  }

  if (!META_PIXEL_DEBUG && isLocalhost()) {
    return false;
  }

  if (isAdminUser()) {
    return false;
  }

  return true;
}

function sanitizeMetaParams(
  params: MetaParams = {}
): Record<string, string | number | boolean | null> {
  const sanitized: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(params)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function getCookie(name: string) {
  if (!isBrowser()) {
    return null;
  }

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`)
  );

  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (!isBrowser()) {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

function getFbclid() {
  if (!isBrowser()) {
    return null;
  }

  return new URL(window.location.href).searchParams.get("fbclid");
}

export function getMetaBrowserIdentifiers() {
  const fbp = getCookie("_fbp");
  const existingFbc = getCookie("_fbc");
  const fbclid = getFbclid();

  if (existingFbc) {
    return {
      fbp,
      fbc: existingFbc,
    };
  }

  if (!fbclid) {
    return {
      fbp,
      fbc: null,
    };
  }

  const fbc = `fb.1.${Date.now()}.${fbclid}`;
  setCookie("_fbc", fbc, 60 * 60 * 24 * 90);

  return {
    fbp,
    fbc,
  };
}

export function createMetaEventId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `meta-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function initMetaPixel() {
  if (!canTrackMeta()) {
    return false;
  }

  if (pixelInitialized) {
    return true;
  }

  if (typeof window.fbq !== "function") {
    debugLog("fbq unavailable during init");
    return false;
  }

  window.fbq("init", META_PIXEL_ID);
  pixelInitialized = true;
  debugLog("pixel initialized", { pixelId: META_PIXEL_ID });
  return true;
}

async function sendMetaEventToBackend(payload: MetaTrackingPayload) {
  try {
    await apiFetch("/tracking/meta/event", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    debugLog("server event sent", {
      eventName: payload.event_name,
      eventId: payload.event_id,
    });
  } catch (error) {
    debugLog("server event failed", {
      eventName: payload.event_name,
      eventId: payload.event_id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function trackMetaEvent(
  eventName: string,
  params: MetaParams = {},
  options: MetaTrackOptions = {}
) {
  if (!canTrackMeta()) {
    return null;
  }

  const eventId = options.eventId || createMetaEventId();
  const customData = sanitizeMetaParams(params);
  const { fbp, fbc } = getMetaBrowserIdentifiers();

  initMetaPixel();

  if (typeof window.fbq === "function") {
    try {
      window.fbq("track", eventName, customData, {
        eventID: eventId,
      });
      debugLog("browser event sent", {
        eventName,
        eventId,
        customData,
      });
    } catch (error) {
      debugLog("browser event failed", {
        eventName,
        eventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  void sendMetaEventToBackend({
    event_name: eventName,
    event_id: eventId,
    event_source_url: window.location.href,
    fbp,
    fbc,
    custom_data: customData,
  });

  return eventId;
}
