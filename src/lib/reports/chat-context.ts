"use client";

const REPORT_CHAT_CONTEXT_KEY = "reportChatContext";

export type ReportChatContext = {
  reportId: string;
  title: string;
  summary: string;
  stats: Array<{
    label: string;
    value: string;
  }>;
};

export function getReportChatContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(REPORT_CHAT_CONTEXT_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as ReportChatContext;
  } catch {
    return null;
  }
}

export function setReportChatContext(context: ReportChatContext) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(REPORT_CHAT_CONTEXT_KEY, JSON.stringify(context));
}
