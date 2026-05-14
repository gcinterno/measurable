export const MEASURABLE_BRAND_LOGO_URL = "/brand/measurable-logo.svg";

type WorkspacePlanInput =
  | {
      plan?: string | null;
    }
  | null
  | undefined;

export function isFreeWorkspacePlan(workspace: WorkspacePlanInput) {
  return workspace?.plan?.trim().toLowerCase() === "free";
}

export function getMeasurableBrandingOverride(workspace: WorkspacePlanInput) {
  if (!isFreeWorkspacePlan(workspace)) {
    return null;
  }

  return {
    logoUrl: MEASURABLE_BRAND_LOGO_URL,
    source: "measurable.brand.logo",
  };
}
