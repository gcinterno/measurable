"use client";

type InsightBoxProps = {
  text: string;
  className?: string;
};

export function InsightBox({ text, className = "" }: InsightBoxProps) {
  return (
    <div className={`rounded-[26px] border border-white/10 bg-black/20 p-6 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
        Insight
      </p>
      <p className="mt-4 max-w-none text-[15px] leading-7 text-slate-300">
        {text}
      </p>
    </div>
  );
}
