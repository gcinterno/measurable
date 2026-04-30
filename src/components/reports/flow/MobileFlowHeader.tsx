"use client";

import Link from "next/link";

type MobileFlowHeaderProps = {
  currentStep: number;
  totalSteps: number;
  title: string;
  description: string;
  backHref?: string;
};

export function MobileFlowHeader({
  currentStep,
  totalSteps,
  title,
  description,
  backHref,
}: MobileFlowHeaderProps) {
  return (
    <div className="sticky top-[73px] z-20 -mx-4 mb-5 border-b border-slate-200 bg-[#edf2f7]/95 px-4 pb-4 pt-3 backdrop-blur md:hidden">
      <div className="relative px-1 pb-1 pt-2">
        {backHref ? (
          <Link
            href={backHref}
            className="absolute left-0 top-0 inline-flex shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            Atrás
          </Link>
        ) : null}

        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-600">
          Paso {currentStep} de {totalSteps}
        </p>
        <h1 className="mx-auto mt-2 max-w-[17rem] text-center text-[1.75rem] font-semibold tracking-tight text-slate-950">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-[18rem] text-center text-sm leading-6 text-slate-500">
          {description}
        </p>
        <div className="mx-auto mt-4 flex w-fit items-center justify-center gap-2">
          {Array.from({ length: totalSteps }, (_, index) => {
            const stepNumber = index + 1;
            const completed = stepNumber < currentStep;
            const active = stepNumber === currentStep;

            return (
              <div key={stepNumber} className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                    active
                      ? "bg-slate-950 text-white"
                      : completed
                        ? "bg-sky-600 text-white"
                        : "border border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {completed ? "✓" : stepNumber}
                </span>
                {stepNumber < totalSteps ? (
                  <span className="h-px w-8 bg-slate-200" />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
