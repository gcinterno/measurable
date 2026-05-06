import { apiUrl } from "@/lib/api/config";
import type { User } from "@/types/auth";

type RegisterInput = {
  email: string;
  password: string;
  fullName: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type VerifyEmailInput = {
  email: string;
  code: string;
};

type ForgotPasswordInput = {
  email: string;
};

type ResetPasswordInput = {
  email: string;
  code: string;
  newPassword: string;
};

type DeleteAccountInput = {
  reason: string;
  details: string;
  confirmation: "Eliminar";
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

type AuthSuccessPayload = {
  access_token?: string | null;
  token?: string | null;
  data?: {
    access_token?: string | null;
    token?: string | null;
  } | null;
};

type AuthMeResponse =
  | {
      id?: string | number;
      email?: string | null;
      phone?: string | null;
      phone_number?: string | null;
      name?: string | null;
      full_name?: string | null;
      role?: string | null;
      is_admin?: boolean | null;
      isAdmin?: boolean | null;
      email_verified?: boolean | null;
      emailVerified?: boolean | null;
      onboarding_completed?: boolean | null;
      onboardingCompleted?: boolean | null;
    }
  | {
      user?: {
        id?: string | number;
        email?: string | null;
        phone?: string | null;
        phone_number?: string | null;
        name?: string | null;
        full_name?: string | null;
        role?: string | null;
        is_admin?: boolean | null;
        isAdmin?: boolean | null;
        email_verified?: boolean | null;
        emailVerified?: boolean | null;
        onboarding_completed?: boolean | null;
        onboardingCompleted?: boolean | null;
      };
      data?: {
        id?: string | number;
        email?: string | null;
        phone?: string | null;
        phone_number?: string | null;
        name?: string | null;
        full_name?: string | null;
        role?: string | null;
        is_admin?: boolean | null;
        isAdmin?: boolean | null;
        email_verified?: boolean | null;
        emailVerified?: boolean | null;
        onboarding_completed?: boolean | null;
        onboardingCompleted?: boolean | null;
      };
    };

export class RegisterApiError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "RegisterApiError";
    this.status = status;
    this.code = code;
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

function getErrorCode(payload: BackendErrorPayload | null) {
  if (!payload) {
    return undefined;
  }

  if (typeof payload.detail === "object" && payload.detail) {
    return payload.detail.code;
  }

  return payload.code;
}

async function readAuthResponse(response: Response) {
  const text = await response.text();
  const payload = parseJsonSafely(text);

  if (!response.ok) {
    throw new RegisterApiError(
      getErrorMessage(payload) || text || "Auth error",
      response.status,
      getErrorCode(payload)
    );
  }

  return payload;
}

function extractAccessToken(payload: AuthSuccessPayload | BackendErrorPayload | null) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  if ("access_token" in payload && typeof payload.access_token === "string") {
    return payload.access_token;
  }

  if ("token" in payload && typeof payload.token === "string") {
    return payload.token;
  }

  if ("data" in payload && payload.data && typeof payload.data === "object") {
    if (typeof payload.data.access_token === "string") {
      return payload.data.access_token;
    }

    if (typeof payload.data.token === "string") {
      return payload.data.token;
    }
  }

  return "";
}

function normalizeAuthUser(response: AuthMeResponse): User {
  const user = "user" in response ? response.user || response.data : response.data || response;

  if (!user) {
    throw new Error("User payload missing in /auth/me response");
  }

  return {
    id: String(user.id ?? "me"),
    email: user.email || "",
    name: user.name || user.full_name || "Usuario",
    phone: user.phone || user.phone_number || "",
    role: user.role || undefined,
    isAdmin: Boolean(user.isAdmin ?? user.is_admin ?? user.role === "admin"),
    emailVerified: Boolean(user.emailVerified ?? user.email_verified),
    onboardingCompleted: Boolean(
      user.onboardingCompleted ?? user.onboarding_completed
    ),
  };
}

export async function registerUser(input: RegisterInput) {
  const response = await fetch(apiUrl("/auth/register"), {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      full_name: input.fullName,
    }),
  });

  return readAuthResponse(response);
}

export async function loginUser(input: LoginInput) {
  const body = new URLSearchParams();
  body.append("username", input.email);
  body.append("password", input.password);

  const response = await fetch(apiUrl("/auth/login"), {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const payload = await readAuthResponse(response);

  return {
    payload,
    accessToken: extractAccessToken(payload as AuthSuccessPayload | null),
  };
}

export async function verifyEmail(input: VerifyEmailInput) {
  const response = await fetch(apiUrl("/auth/verify-email"), {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      code: input.code,
    }),
  });

  const payload = await readAuthResponse(response);

  return {
    payload,
    accessToken: extractAccessToken(payload as AuthSuccessPayload | null),
  };
}

export async function resendVerificationCode(input: { email: string }) {
  const response = await fetch(apiUrl("/auth/resend-verification-code"), {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
    }),
  });

  return readAuthResponse(response);
}

export async function requestPasswordReset(input: ForgotPasswordInput) {
  const response = await fetch(apiUrl("/auth/forgot-password"), {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
    }),
  });

  return readAuthResponse(response);
}

export async function resetPassword(input: ResetPasswordInput) {
  const response = await fetch(apiUrl("/auth/reset-password"), {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      code: input.code,
      new_password: input.newPassword,
    }),
  });

  return readAuthResponse(response);
}

export async function fetchAuthMe(accessToken?: string) {
  const response = await fetch(apiUrl("/auth/me"), {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  const text = await response.text();
  const payload = parseJsonSafely(text) as AuthMeResponse | null;

  if (!response.ok || !payload) {
    throw new RegisterApiError(
      getErrorMessage(payload as BackendErrorPayload | null) || text || "Auth me error",
      response.status,
      getErrorCode(payload as BackendErrorPayload | null)
    );
  }

  return normalizeAuthUser(payload);
}

export async function logoutUser() {
  const response = await fetch(apiUrl("/auth/logout"), {
    method: "POST",
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text();
    const payload = parseJsonSafely(text);

    throw new RegisterApiError(
      getErrorMessage(payload) || text || "Logout error",
      response.status,
      getErrorCode(payload)
    );
  }
}

export async function deleteAccount(input: DeleteAccountInput) {
  const response = await fetch(apiUrl("/account/delete"), {
    method: "DELETE",
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const text = await response.text();
    const payload = parseJsonSafely(text);

    throw new RegisterApiError(
      "We could not delete your account right now. Please try again.",
      response.status,
      getErrorCode(payload)
    );
  }
}
