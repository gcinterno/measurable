import { apiUrl } from "@/lib/api/config";
import { clearSession } from "@/lib/auth/session";
import { useAuthStore } from "@/lib/store/auth-store";

type ApiErrorOptions = {
  endpoint: string;
  status?: number;
  code?: string;
  isAuthError?: boolean;
  isAbortError?: boolean;
};

export class ApiError extends Error {
  endpoint: string;
  status?: number;
  code?: string;
  isAuthError: boolean;
  isAbortError: boolean;

  constructor(message: string, options: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.endpoint = options.endpoint;
    this.status = options.status;
    this.code = options.code;
    this.isAuthError = Boolean(options.isAuthError);
    this.isAbortError = Boolean(options.isAbortError);
  }
}

let invalidAuthHandled = false;
let invalidAuthTokenValue: string | null = null;

type BackendErrorPayload = {
  detail?:
    | string
    | {
        code?: string;
        message?: string;
      }
    | null;
  code?: string;
  message?: string;
};

const AUTH_ERROR_CODES = new Set([
  "missing_token",
  "invalid_token",
  "token_expired",
  "unauthorized",
  "not_authenticated",
  "authentication_failed",
  "credentials_not_provided",
]);

const LIMIT_ERROR_CODES = new Set([
  "monthly_report_limit_reached",
  "slide_limit_exceeded",
  "storage_limit_reached",
]);

function parseJsonSafely(rawText: string) {
  if (!rawText.trim()) {
    return null;
  }

  try {
    return JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getErrorCode(payload: BackendErrorPayload | null) {
  if (!payload) {
    return undefined;
  }

  if (typeof payload.detail === "object" && payload.detail) {
    return payload.detail.code;
  }

  return payload.code;
}

function getErrorMessage(payload: BackendErrorPayload | null) {
  if (!payload) {
    return undefined;
  }

  if (typeof payload.detail === "object" && payload.detail) {
    return payload.detail.message;
  }

  if (typeof payload.detail === "string") {
    return payload.detail;
  }

  return payload.message;
}

function isAuthFailureStatus(status: number) {
  return status === 401;
}

function isInvalidTokenCode(code?: string) {
  return Boolean(code && AUTH_ERROR_CODES.has(code));
}

function isRealAuthFailure(status: number, code?: string) {
  return isAuthFailureStatus(status) || isInvalidTokenCode(code);
}

export function isPlanLimitError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    Boolean(error.code && LIMIT_ERROR_CODES.has(error.code))
  );
}

export function isLimitError(error: unknown): error is ApiError {
  return isPlanLimitError(error);
}

function handleAuthFailure(params: {
  endpoint: string;
  status?: number;
  code?: string;
  token: string | null;
}) {
  if (typeof window === "undefined") {
    return {
      tokenCleared: false,
      redirectTriggered: false,
    };
  }

  const tokenCleared = Boolean(params.token);

  if (tokenCleared) {
    clearSession();
    useAuthStore.setState({ token: null, user: null });
  }

  invalidAuthHandled = true;
  invalidAuthTokenValue = params.token;

  const alreadyOnLogin = window.location.pathname === "/login";
  const redirectTriggered = !alreadyOnLogin;

  console.warn("auth failure detected", {
    endpoint: params.endpoint,
    status: params.status ?? null,
    code: params.code ?? null,
    tokenCleared,
    redirectTriggered,
  });

  if (redirectTriggered) {
    window.setTimeout(() => {
      window.location.replace("/login?session=expired");
    }, 0);
  }

  return {
    tokenCleared,
    redirectTriggered,
  };
}

export function isAuthError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.isAuthError;
}

export function isAbortError(error: unknown): error is ApiError {
  return (
    (error instanceof ApiError && error.isAbortError) ||
    (error instanceof DOMException && error.name === "AbortError")
  );
}

export async function readApiResponseText(
  endpoint: string,
  response: Response
) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;
  const text = await response.text();
  const payload = parseJsonSafely(text) as BackendErrorPayload | null;
  const errorCode = getErrorCode(payload);
  const authFailure = isRealAuthFailure(response.status, errorCode);

  if (!response.ok) {
    if (authFailure) {
      handleAuthFailure({
        endpoint,
        status: response.status,
        code: errorCode,
        token,
      });
    }

    throw new ApiError(getErrorMessage(payload) || text || "API error", {
      endpoint,
      status: response.status,
      code: errorCode,
      isAuthError: authFailure,
    });
  }

  return text;
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  if (token && invalidAuthHandled && invalidAuthTokenValue === token) {
    throw new ApiError("Session expired", {
      endpoint,
      status: 401,
      code: "invalid_token",
      isAuthError: true,
    });
  }

  if (token && invalidAuthTokenValue && invalidAuthTokenValue !== token) {
    invalidAuthHandled = false;
    invalidAuthTokenValue = null;
  }

  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const res = await fetch(apiUrl(endpoint), {
      ...options,
      headers,
      credentials: options.credentials ?? "include",
    });

    const text = await readApiResponseText(endpoint, res);

    if (!text.trim()) {
      return null as T;
    }

    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request aborted", {
        endpoint,
        isAbortError: true,
      });
    }

    throw new ApiError(
      error instanceof Error ? error.message : "Failed to fetch",
      {
        endpoint,
      }
    );
  }
}
