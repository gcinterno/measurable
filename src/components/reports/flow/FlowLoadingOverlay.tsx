"use client";

type FlowLoadingOverlayProps = {
  title: string;
  description?: string;
};

export function FlowLoadingOverlay({
  title,
  description,
}: FlowLoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-6 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-[32px] border border-white/70 bg-white/95 p-8 text-center shadow-[0_28px_90px_rgba(15,23,42,0.22)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-950">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/25 border-t-white" />
        </div>
        <h2 className="mt-6 text-xl font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
