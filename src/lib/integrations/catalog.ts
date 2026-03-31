export type IntegrationStatus = "Disponible" | "Conectado" | "Próximamente";

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

export const integrationCatalog: readonly IntegrationCatalogItem[] = [
  {
    name: "Meta",
    category: "Paid social",
    description:
      "Conecta una Facebook Page para iniciar el flujo de autorizacion desde el backend.",
    status: "Disponible",
    actionLabel: "Conectar pagina",
    integrationKey: "meta",
    logoUrl: "https://cdn.simpleicons.org/meta",
    logoAlt: "Meta logo",
    detailHref: "/integrations/meta",
  },
  {
    name: "Google Ads",
    category: "Search",
    description:
      "Importa estructura de campanas y rendimiento de Google Ads cuando la conexion este lista.",
    status: "Próximamente",
    actionLabel: "Próximamente",
    integrationKey: "google-ads",
    logoUrl: "https://cdn.simpleicons.org/googleads",
    logoAlt: "Google Ads logo",
  },
  {
    name: "LinkedIn",
    category: "B2B media",
    description:
      "Prepara la integracion de LinkedIn Ads para futuras sincronizaciones de campanas.",
    status: "Próximamente",
    actionLabel: "Próximamente",
    integrationKey: "linkedin",
    logoUrl: "https://cdn.simpleicons.org/linkedin",
    logoAlt: "LinkedIn logo",
  },
  {
    name: "Google Business Profile",
    category: "Local presence",
    description:
      "Visualmente listo para conectar ubicaciones y rendimiento local en una siguiente fase.",
    status: "Próximamente",
    actionLabel: "Próximamente",
    integrationKey: "google-business-profile",
    logoUrl: "https://cdn.simpleicons.org/googlebusinessprofile",
    logoAlt: "Google Business Profile logo",
  },
  {
    name: "Shopify",
    category: "Commerce",
    description:
      "Reserva el espacio para una futura conexion de catalogo, pedidos y revenue.",
    status: "Próximamente",
    actionLabel: "Próximamente",
    integrationKey: "shopify",
    logoUrl: "https://cdn.simpleicons.org/shopify",
    logoAlt: "Shopify logo",
  },
] as const;
