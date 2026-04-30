export type Report = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  thumbnailUrl?: string;
  branding?: {
    logoUrl?: string;
    source?: string;
  };
};

export type ReportDescriptionTimeframe = {
  label?: string;
  since?: string;
  until?: string;
  key?: string;
  preset?: string;
};

export type ReportDescription = {
  timeframe?: ReportDescriptionTimeframe | null;
  ai_mode?: "standard" | "agents" | string;
  aiMode?: "standard" | "agents" | string;
  ai_agent_fallback_used?: boolean;
  aiAgentFallbackUsed?: boolean;
  [key: string]: unknown;
};

export type ReportLocale = "en" | "es";

export type ReportBlock = {
  id: string;
  type: string;
  content: string;
  title?: string;
  label?: string;
  editable?: boolean;
};

export type ReportVersionBlock = {
  id: string;
  type: string;
  data: {
    text?: string | null;
    label?: string | null;
    value?: string | number | null;
    [key: string]: unknown;
  };
  rawDataJson: string;
};

export type ReportVersion = {
  id: string;
  version: string;
  createdAt: string;
  status: string;
  locale: ReportLocale;
  branding?: {
    logoUrl?: string;
    source?: string;
  };
  blocks: ReportBlock[];
  rawMetadata?: Record<string, unknown>;
};

export type ReportVersionView = {
  locale: ReportLocale;
  branding?: {
    logoUrl?: string;
    source?: string;
  };
  description?: ReportDescription | null;
  blocks: ReportVersionBlock[];
};

export type ReportDetail = Report & {
  blocks: ReportBlock[];
  workspaceName?: string;
  workspaceId?: string;
  description?: ReportDescription | null;
  branding?: {
    logoUrl?: string;
    source?: string;
  };
  logoUrl?: string;
};
