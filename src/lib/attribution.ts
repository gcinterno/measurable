"use client";

import { apiUrl } from "@/lib/api/config";

export type AttributionFields = {
  referral_code: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
};

type AttributionRecord = AttributionFields & {
  landing_page: string;
  captured_at: string;
};

const ATTRIBUTION_STORAGE_KEY = "measurableAttribution";
const ATTRIBUTION_COOKIE_KEY = "measurable_attribution";
const ATTRIBUTION_TRACKING_KEY = "measurableAttributionTracked";
const ATTRIBUTION_COOKIE_MAX_AGE_DAYS = 90;
const ATTRIBUTION_QUERY_KEYS = [
  "ref",
  "referral_code",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

type StoredAttributionEnvelope = {
  firstTouch: AttributionRecord | null;
  lastTouch: AttributionRecord | null;
};

const EMPTY_ATTRIBUTION_FIELDS: AttributionFields = {
  referral_code: "",
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  utm_term: "",
  utm_content: "",
};

function isBrowser() {
  return typeof window !== "undefined";
}

function getCookieMaxAgeSeconds() {
  return ATTRIBUTION_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
}

function normalizeValue(value: string | null) {
  return (value || "").trim();
}

function parseAttributionPayload(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as StoredAttributionEnvelope;
  } catch {
    return null;
  }
}

function readCookie(name: string) {
  if (!isBrowser()) {
    return null;
  }

  const escapedName = name.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${escapedName}=([^;]*)`)
  );

  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (!isBrowser()) {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${getCookieMaxAgeSeconds()}; samesite=lax`;
}

function readStoredEnvelope() {
  if (!isBrowser()) {
    return {
      firstTouch: null,
      lastTouch: null,
    } satisfies StoredAttributionEnvelope;
  }

  const localValue = parseAttributionPayload(
    window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY)
  );
  const cookieValue = parseAttributionPayload(readCookie(ATTRIBUTION_COOKIE_KEY));
  const envelope = localValue || cookieValue;

  return {
    firstTouch: envelope?.firstTouch || null,
    lastTouch: envelope?.lastTouch || null,
  } satisfies StoredAttributionEnvelope;
}

function writeStoredEnvelope(envelope: StoredAttributionEnvelope) {
  if (!isBrowser()) {
    return;
  }

  const serialized = JSON.stringify(envelope);
  window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, serialized);
  writeCookie(ATTRIBUTION_COOKIE_KEY, serialized);
}

function hasAttributionFields(attribution: AttributionFields) {
  return ATTRIBUTION_QUERY_KEYS.some((key) => {
    const normalizedKey = key === "ref" ? "referral_code" : key;
    return Boolean(attribution[normalizedKey as keyof AttributionFields]);
  });
}

function buildAttributionRecord(
  fields: AttributionFields,
  landingPage: string
): AttributionRecord {
  return {
    ...fields,
    landing_page: landingPage,
    captured_at: new Date().toISOString(),
  };
}

function normalizeAttributionFromSearchParams(searchParams: URLSearchParams) {
  const referralCode =
    normalizeValue(searchParams.get("referral_code")) ||
    normalizeValue(searchParams.get("ref"));

  return {
    referral_code: referralCode,
    utm_source: normalizeValue(searchParams.get("utm_source")),
    utm_medium: normalizeValue(searchParams.get("utm_medium")),
    utm_campaign: normalizeValue(searchParams.get("utm_campaign")),
    utm_term: normalizeValue(searchParams.get("utm_term")),
    utm_content: normalizeValue(searchParams.get("utm_content")),
  } satisfies AttributionFields;
}

async function trackReferralClick(record: AttributionRecord) {
  if (!hasAttributionFields(record)) {
    return;
  }

  const trackingKey = `${record.landing_page}|${record.referral_code}|${record.utm_source}|${record.utm_campaign}`;

  if (window.sessionStorage.getItem(ATTRIBUTION_TRACKING_KEY) === trackingKey) {
    return;
  }

  window.sessionStorage.setItem(ATTRIBUTION_TRACKING_KEY, trackingKey);

  try {
    await fetch(apiUrl("/referrals/click"), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        referral_code: record.referral_code || undefined,
        utm_source: record.utm_source || undefined,
        utm_medium: record.utm_medium || undefined,
        utm_campaign: record.utm_campaign || undefined,
        utm_term: record.utm_term || undefined,
        utm_content: record.utm_content || undefined,
        landing_page: record.landing_page,
      }),
    });
  } catch {
    return;
  }
}

export function captureAttributionFromCurrentUrl() {
  if (!isBrowser()) {
    return;
  }

  const url = new URL(window.location.href);
  const fields = normalizeAttributionFromSearchParams(url.searchParams);

  if (!hasAttributionFields(fields)) {
    return;
  }

  const landingPage = `${url.pathname}${url.search}`;
  const currentRecord = buildAttributionRecord(fields, landingPage);
  const existing = readStoredEnvelope();
  const nextEnvelope: StoredAttributionEnvelope = {
    firstTouch: existing.firstTouch || currentRecord,
    lastTouch: currentRecord,
  };

  writeStoredEnvelope(nextEnvelope);
  void trackReferralClick(currentRecord);
}

export function getSignupAttributionFields() {
  const stored = readStoredEnvelope();
  const source = stored.firstTouch || stored.lastTouch;

  return {
    ...EMPTY_ATTRIBUTION_FIELDS,
    ...(source
      ? {
          referral_code: source.referral_code || "",
          utm_source: source.utm_source || "",
          utm_medium: source.utm_medium || "",
          utm_campaign: source.utm_campaign || "",
          utm_term: source.utm_term || "",
          utm_content: source.utm_content || "",
        }
      : {}),
  } satisfies AttributionFields;
}

export function getStoredAttributionEnvelope() {
  return readStoredEnvelope();
}
