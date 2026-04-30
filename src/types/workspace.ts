export type WorkspacePlanLimits = {
  reportsPerMonth?: number;
  maxSlidesPerReport?: number;
  storageLimitBytes?: number;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  plan?: string;
  planLimits?: WorkspacePlanLimits;
  storageUsedBytes?: number;
  storageLimitBytes?: number;
  branding?: {
    logoUrl?: string;
    source?: string;
  };
};
