type AnalyticsValue = string | number | boolean | null | undefined;

type AnalyticsParams = Record<string, AnalyticsValue>;

type DataLayerEvent = {
  event: string;
} & AnalyticsParams;

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
  }
}

const BLOCKED_PARAM_NAMES = [
  "accessToken",
  "access_token",
  "email",
  "fullName",
  "full_name",
  "name",
  "phone",
  "prompt",
  "rawPrompt",
  "raw_prompt",
  "reportContent",
  "report_content",
  "token",
] as const;

const blockedParamNames = new Set(
  BLOCKED_PARAM_NAMES.map((paramName) => paramName.toLowerCase()),
);

function sanitizeParams(params: AnalyticsParams = {}): AnalyticsParams {
  const sanitizedParams: AnalyticsParams = {};

  for (const [key, value] of Object.entries(params)) {
    if (blockedParamNames.has(key.toLowerCase())) {
      continue;
    }

    sanitizedParams[key] = value;
  }

  return sanitizedParams;
}

export function trackEvent(
  eventName: string,
  params: AnalyticsParams = {},
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({
    event: eventName,
    ...sanitizeParams(params),
  });
}
