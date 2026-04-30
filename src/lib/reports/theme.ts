export const REPORT_SLIDE_THEME = {
  template: "minimal-dark",
  slide: {
    width: 1160,
    height: 670,
    surfaceWidth: 1120,
    surfaceHeight: 630,
    aspectRatio: "16 / 9",
  },
  spacing: {
    previewGap: "space-y-7",
    exportGap: "space-y-0",
    outerPadding: "p-5",
    innerPadding: "p-10",
    contentOffsetWithHeader: "mt-8",
    contentOffsetWithoutHeader: "mt-6",
  },
  radius: {
    outerFrame: "rounded-[40px]",
    innerFrame: "rounded-[34px]",
  },
  colors: {
    pageBackground: "#eef3f8",
    frameBackground: "bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fb_100%)]",
    frameBorder: "border-slate-200/80",
    shellBackground:
      "bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.14),transparent_22%),linear-gradient(180deg,#07111f_0%,#0b1728_100%)]",
    shellBorder: "border-slate-800/80",
    cardBackground: "bg-white/[0.04]",
    cardBorder: "border-white/10",
    textPrimary: "text-white",
    textMuted: "text-slate-300",
    textSubtle: "text-slate-400",
    accent: "text-sky-300",
  },
  effects: {
    outerShadow: "shadow-[0_14px_36px_rgba(15,23,42,0.05)]",
    innerShadow: "shadow-[0_18px_48px_rgba(2,6,23,0.26)]",
    shellOverlay:
      "bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_26%,transparent_74%,rgba(255,255,255,0.03))]",
  },
} as const;

export type ReportRenderMode = "preview" | "export";
