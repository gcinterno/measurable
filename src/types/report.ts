export type Report = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
};

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
  blocks: ReportBlock[];
  rawMetadata?: Record<string, unknown>;
};

export type ReportDetail = Report & {
  blocks: ReportBlock[];
  workspaceName?: string;
  workspaceId?: string;
};
