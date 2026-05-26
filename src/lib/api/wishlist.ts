import { apiFetch } from "@/lib/api";

export type WishlistLeadInput = {
  name: string;
  email: string;
  company?: string;
  message?: string;
  source?: string;
};

export async function createWishlistLead(payload: WishlistLeadInput) {
  return apiFetch<Record<string, unknown>>("/wishlist", {
    method: "POST",
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      company: payload.company || "",
      message: payload.message || "",
      source: payload.source || "upgrade_page",
    }),
  });
}
