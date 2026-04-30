export type IntegrationStatus = "Available" | "Connected" | "Coming soon";

export type IntegrationCatalogItem = {
  name: string;
  category: string;
  description: string;
  status: IntegrationStatus;
  actionLabel: string;
  integrationKey: string;
  logoUrl: string;
  logoAlt: string;
  detailHref?: string;
};

export const META_FRONTEND_INTEGRATION_KEYS = [
  "facebook_pages",
  "instagram_business",
] as const;

export type MetaFrontendIntegrationKey =
  (typeof META_FRONTEND_INTEGRATION_KEYS)[number];

export function isMetaFrontendIntegrationKey(
  value: string | null | undefined
): value is MetaFrontendIntegrationKey {
  return (
    typeof value === "string" &&
    META_FRONTEND_INTEGRATION_KEYS.includes(value as MetaFrontendIntegrationKey)
  );
}

export const integrationCatalog: readonly IntegrationCatalogItem[] = [
  {
    name: "Facebook Pages",
    category: "Paid social",
    description:
      "Connect Facebook Pages to generate reach, followers, and engagement reports.",
    status: "Available",
    actionLabel: "Connect",
    integrationKey: "facebook_pages",
    logoUrl: "https://cdn.simpleicons.org/meta",
    logoAlt: "Meta logo",
    detailHref: "/integrations/meta",
  },
  {
    name: "Instagram Business",
    category: "Paid social",
    description:
      "Connect Instagram Business accounts linked to your Facebook Pages.",
    status: "Available",
    actionLabel: "Connect",
    integrationKey: "instagram_business",
    logoUrl: "https://cdn.simpleicons.org/instagram",
    logoAlt: "Instagram logo",
    detailHref: "/integrations/meta",
  },
  {
    name: "Google Ads",
    category: "Search",
    description:
      "Import Google Ads campaigns and performance data as soon as this connector is available.",
    status: "Coming soon",
    actionLabel: "Coming soon",
    integrationKey: "google-ads",
    logoUrl: "https://cdn.simpleicons.org/googleads",
    logoAlt: "Google Ads logo",
  },
  {
    name: "LinkedIn",
    category: "B2B media",
    description:
      "Bring LinkedIn campaign metrics into Measurable when the integration launches.",
    status: "Coming soon",
    actionLabel: "Coming soon",
    integrationKey: "linkedin",
    logoUrl: "https://cdn.simpleicons.org/linkedin",
    logoAlt: "LinkedIn logo",
  },
  {
    name: "Google Business Profile",
    category: "Local presence",
    description:
      "Connect local presence and business profile performance in a future release.",
    status: "Coming soon",
    actionLabel: "Coming soon",
    integrationKey: "google-business-profile",
    logoUrl: "https://cdn.simpleicons.org/googlebusinessprofile",
    logoAlt: "Google Business Profile logo",
  },
  {
    name: "Shopify",
    category: "Commerce",
    description:
      "Sync products, orders, and revenue into your reporting workflow when available.",
    status: "Coming soon",
    actionLabel: "Coming soon",
    integrationKey: "shopify",
    logoUrl: "https://cdn.simpleicons.org/shopify",
    logoAlt: "Shopify logo",
  },
] as const;
