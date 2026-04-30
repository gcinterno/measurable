import { apiUrl } from "@/lib/api/config";

type RegisterInput = {
  email: string;
  password: string;
  fullName?: string;
};

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

export class RegisterApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "RegisterApiError";
    this.status = status;
  }
}

function parseJsonSafely(rawText: string) {
  if (!rawText.trim()) {
    return null;
  }

  try {
    return JSON.parse(rawText) as BackendErrorPayload;
  } catch {
    return null;
  }
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

export async function registerUser(input: RegisterInput) {
  const response = await fetch(apiUrl("/auth/register"), {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      full_name: input.fullName || undefined,
    }),
  });

  const text = await response.text();
  const payload = parseJsonSafely(text);

  if (!response.ok) {
    throw new RegisterApiError(
      getErrorMessage(payload) || text || "Register error",
      response.status
    );
  }

  return payload;
}
