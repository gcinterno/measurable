export type BillingPlanCode = "free" | "starter" | "pro" | "advanced";

export type BillingPlanDefinition = {
  code: BillingPlanCode;
  name: string;
  price: string;
  cadence: string;
  cta: string;
  recommended?: boolean;
  reportsPerMonth: number | null;
  slidesPerReport: number;
  canExportPdf: boolean;
  canExportPptx: boolean;
  canUseCustomBranding: boolean;
  watermark: boolean;
  scheduledReportsLimit: number | null;
  reportScopeLabel: string;
  features: string[];
};

export const BILLING_PLANS: BillingPlanDefinition[] = [
  {
    code: "free",
    name: "Free",
    price: "$0",
    cadence: "/month",
    cta: "Get Started for Free",
    reportsPerMonth: 10,
    slidesPerReport: 5,
    canExportPdf: true,
    canExportPptx: false,
    canUseCustomBranding: false,
    watermark: true,
    scheduledReportsLimit: 0,
    reportScopeLabel: "Single Platform Reports",
    features: [
      "10 Reports / month temporarily",
      "5 Slides per report",
      "Single Platform Reports",
      "Measurable Watermark",
      "Export PDF",
      "No credit card required",
    ],
  },
  {
    code: "starter",
    name: "Starter",
    price: "$19",
    cadence: "/month",
    cta: "Get Started with Starter",
    reportsPerMonth: 10,
    slidesPerReport: 10,
    canExportPdf: true,
    canExportPptx: true,
    canUseCustomBranding: true,
    watermark: false,
    scheduledReportsLimit: 0,
    reportScopeLabel: "2 - 3 Platform Reports",
    features: [
      "10 Reports / month",
      "10 Slides per report",
      "2 - 3 Platform Reports",
      "Personalized Branding",
      "Export PDF",
    ],
  },
  {
    code: "pro",
    name: "Pro",
    price: "$39",
    cadence: "/month",
    cta: "Get Started with Pro",
    recommended: true,
    reportsPerMonth: 30,
    slidesPerReport: 15,
    canExportPdf: true,
    canExportPptx: true,
    canUseCustomBranding: true,
    watermark: false,
    scheduledReportsLimit: 3,
    reportScopeLabel: "Multi-Platform Reports",
    features: [
      "30 Reports / month",
      "15 Slides per report",
      "Multi-Platform Reports",
      "Personalized Branding",
      "Export PDF",
      "3 Automated Scheduled Reports",
    ],
  },
  {
    code: "advanced",
    name: "Advanced",
    price: "$99",
    cadence: "/month",
    cta: "Get Started with Advanced",
    reportsPerMonth: null,
    slidesPerReport: 30,
    canExportPdf: true,
    canExportPptx: true,
    canUseCustomBranding: true,
    watermark: false,
    scheduledReportsLimit: null,
    reportScopeLabel: "Multi-Platform Reports",
    features: [
      "Unlimited Reports / month",
      "30 Slides per report",
      "Multi-Platform Reports",
      "Personalized Branding",
      "Export PDF",
      "Unlimited Automated Scheduled Reports",
    ],
  },
] as const;

export function normalizeBillingPlanCode(value?: string | null): BillingPlanCode {
  const normalized = value?.trim().toLowerCase().replace(/[\s-]+/g, "_") || "free";

  if (normalized === "core") {
    return "pro";
  }

  if (
    normalized === "free" ||
    normalized === "starter" ||
    normalized === "pro" ||
    normalized === "advanced"
  ) {
    return normalized;
  }

  return "free";
}

export function getBillingPlanDefinition(planCode?: string | null) {
  const normalized = normalizeBillingPlanCode(planCode);
  return BILLING_PLANS.find((plan) => plan.code === normalized) || BILLING_PLANS[0];
}
