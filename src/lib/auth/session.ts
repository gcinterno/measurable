"use client";

const TOKEN_KEY = "token";
const AUTH_SESSION_KEY = "authSession";
const PENDING_VERIFICATION_EMAIL_KEY = "pendingVerificationEmail";
const LOGOUT_IN_PROGRESS_KEY = "logoutInProgress";
const ONBOARDING_DISMISSED_KEY = "onboardingDismissed";
const PENDING_REGISTRATION_KEY = "pendingRegistration";

export function getToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(getToken() || window.localStorage.getItem(AUTH_SESSION_KEY) === "1");
}

export function isLogoutInProgress() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(LOGOUT_IN_PROGRESS_KEY) === "1";
}

export function markSessionAuthenticated() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LOGOUT_IN_PROGRESS_KEY);
  window.localStorage.setItem(AUTH_SESSION_KEY, "1");
}

export function startLogoutInProgress() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOGOUT_IN_PROGRESS_KEY, "1");
}

export function clearLogoutInProgress() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LOGOUT_IN_PROGRESS_KEY);
}

export function isOnboardingDismissed() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "1";
}

export function dismissOnboarding() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ONBOARDING_DISMISSED_KEY, "1");
}

export function clearOnboardingDismissed() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
}

export function setPendingVerificationEmail(email: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, email);
}

export function getPendingVerificationEmail() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY) || "";
}

export function clearPendingVerificationEmail() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
}

export function setPendingRegistrationCredentials(input: {
  email: string;
  password: string;
}) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(input));
}

export function getPendingRegistrationCredentials() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(PENDING_REGISTRATION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as {
      email?: string;
      password?: string;
    };

    if (!parsed.email || !parsed.password) {
      return null;
    }

    return {
      email: parsed.email,
      password: parsed.password,
    };
  } catch {
    return null;
  }
}

export function clearPendingRegistrationCredentials() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
}

export function clearSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(AUTH_SESSION_KEY);
}
