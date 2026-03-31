import type { User } from "@/types/auth";

import { apiFetch } from "@/lib/api";

type MeResponse =
  | {
      id?: string | number;
      email?: string | null;
      name?: string | null;
      full_name?: string | null;
    }
  | {
      user?: {
        id?: string | number;
        email?: string | null;
        name?: string | null;
        full_name?: string | null;
      };
      data?: {
        id?: string | number;
        email?: string | null;
        name?: string | null;
        full_name?: string | null;
      };
    };

export async function fetchCurrentUser() {
  const response = await apiFetch<MeResponse>("/me");
  const user = "user" in response ? response.user || response.data : response.data || response;

  if (!user) {
    throw new Error("User payload missing in /me response");
  }

  return {
    id: String(user.id ?? "me"),
    email: user.email || "",
    name: user.name || user.full_name || "Usuario",
  } satisfies User;
}
