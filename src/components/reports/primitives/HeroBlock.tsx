"use client";

import type { ReactNode } from "react";

type HeroBlockProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  footer?: ReactNode;
  rightSlot?: ReactNode;
  titleClassName?: string;
  subtitleClassName?: string;
  className?: string;
};

export function HeroBlock({
  eyebrow,
  title,
  subtitle,
  meta,
  footer,
  rightSlot,
  titleClassName = "text-[4.6rem]",
  subtitleClassName = "text-[1.4rem]",
  className = "max-w-[38rem]",
}: HeroBlockProps) {
  return (
    <div className="relative h-full">
      <div className={`flex h-full flex-col justify-center pr-10 ${className}`}>
        {eyebrow ? (
          <p className="text-[0.95rem] font-medium uppercase tracking-[0.18em] text-sky-300">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={`max-w-none font-semibold leading-[0.92] tracking-[-0.05em] text-white ${titleClassName}`}
        >
          {title}
        </h1>
        <div className="mt-5 h-px w-28 bg-gradient-to-r from-sky-300 via-white/70 to-transparent" />
        {subtitle ? (
          <p className={`mt-5 text-slate-300 ${subtitleClassName}`}>{subtitle}</p>
        ) : null}
        {meta ? (
          <p className="mt-4 text-[0.95rem] font-medium uppercase tracking-[0.18em] text-sky-300">
            {meta}
          </p>
        ) : null}
        {footer}
      </div>

      {rightSlot}
    </div>
  );
}
