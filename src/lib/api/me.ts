import type { User } from "@/types/auth";

import { apiFetch } from "@/lib/api";

type MeResponse =
  | {
      id?: string | number;
      email?: string | null;
      phone?: string | null;
      phone_number?: string | null;
      name?: string | null;
      full_name?: string | null;
      logo_url?: string | null;
      logoUrl?: string | null;
      role?: string | null;
      is_admin?: boolean | null;
      isAdmin?: boolean | null;
      email_verified?: boolean | null;
      emailVerified?: boolean | null;
      onboarding_completed?: boolean | null;
      onboardingCompleted?: boolean | null;
      branding?: {
        logo_url?: string | null;
        logoUrl?: string | null;
      } | null;
    }
  | {
      user?: {
        id?: string | number;
        email?: string | null;
        phone?: string | null;
        phone_number?: string | null;
        name?: string | null;
        full_name?: string | null;
        logo_url?: string | null;
        logoUrl?: string | null;
        role?: string | null;
        is_admin?: boolean | null;
        isAdmin?: boolean | null;
        email_verified?: boolean | null;
        emailVerified?: boolean | null;
        onboarding_completed?: boolean | null;
        onboardingCompleted?: boolean | null;
        branding?: {
          logo_url?: string | null;
          logoUrl?: string | null;
        } | null;
      };
      data?: {
        id?: string | number;
        email?: string | null;
        phone?: string | null;
        phone_number?: string | null;
        name?: string | null;
        full_name?: string | null;
        logo_url?: string | null;
        logoUrl?: string | null;
        role?: string | null;
        is_admin?: boolean | null;
        isAdmin?: boolean | null;
        email_verified?: boolean | null;
        emailVerified?: boolean | null;
        onboarding_completed?: boolean | null;
        onboardingCompleted?: boolean | null;
        branding?: {
          logo_url?: string | null;
          logoUrl?: string | null;
        } | null;
      };
    };

function extractMeBranding(
  user:
    | {
        logo_url?: string | null;
        logoUrl?: string | null;
        branding?: {
          logo_url?: string | null;
          logoUrl?: string | null;
        } | null;
      }
    | null
    | undefined
) {
  if (user?.branding?.logoUrl) {
    return {
      logoUrl: user.branding.logoUrl,
      source: "branding.logoUrl",
    };
  }

  if (user?.branding?.logo_url) {
    return {
      logoUrl: user.branding.logo_url,
      source: "branding.logo_url",
    };
  }

  if (user?.logoUrl) {
    return {
      logoUrl: user.logoUrl,
      source: "logoUrl",
    };
  }

  if (user?.logo_url) {
    return {
      logoUrl: user.logo_url,
      source: "logo_url",
    };
  }

  return {
    logoUrl: undefined,
    source: "empty",
  };
}

export async function fetchCurrentUser(options?: { signal?: AbortSignal }) {
  const response = await apiFetch<MeResponse>("/me", {
    signal: options?.signal,
  });
  const user = "user" in response ? response.user || response.data : response.data || response;

  if (!user) {
    throw new Error("User payload missing in /me response");
  }

  const branding = extractMeBranding(user);

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
    branding: {
      logoUrl: branding.logoUrl,
      source: branding.source,
    },
  } satisfies User;
}

export async function updateCurrentUser(
  input: {
    logoUrl?: string | null;
  },
  options?: { signal?: AbortSignal }
) {
  const payload: Record<string, unknown> = {};

  if (input.logoUrl !== undefined) {
    payload.logo_url = input.logoUrl ?? null;
  }

  const response = await apiFetch<MeResponse>("/me", {
    method: "PUT",
    body: JSON.stringify(payload),
    signal: options?.signal,
  });
  const user = "user" in response ? response.user || response.data : response.data || response;

  if (!user) {
    throw new Error("User payload missing in /me update response");
  }

  const branding = extractMeBranding(user);

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
    branding: {
      logoUrl: branding.logoUrl,
      source: branding.source,
    },
  } satisfies User;
}
