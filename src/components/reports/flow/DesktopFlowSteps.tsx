"use client";

import Link from "next/link";

type FlowStep = {
  id: number;
  title: string;
  description: string;
};

type DesktopFlowStepsProps = {
  steps: readonly FlowStep[];
  currentStep: number;
  clickableHrefMap?: Partial<Record<number, string>>;
  stepLabel: string;
};

export function DesktopFlowSteps({
  steps,
  currentStep,
  clickableHrefMap = {},
  stepLabel,
}: DesktopFlowStepsProps) {
  return (
    <div className="mt-8 hidden gap-4 lg:grid lg:grid-cols-4">
      {steps.map((step, index) => {
        const completed = currentStep > step.id;
        const active = currentStep === step.id;
        const href = clickableHrefMap[step.id];
        const stepCard = (
          <div
            className={`relative rounded-[24px] border p-5 transition ${
              active
                ? "border-slate-950 bg-slate-950 text-white"
                : completed
                  ? "border-sky-200 bg-sky-50 text-slate-950"
                  : "border-slate-200 bg-slate-50 text-slate-950"
            } ${href ? "cursor-pointer hover:border-sky-300 hover:bg-sky-100" : ""}`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                  active
                    ? "bg-white text-slate-950"
                    : completed
                      ? "bg-sky-600 text-white"
                      : "bg-white text-slate-500 ring-1 ring-slate-200"
                }`}
              >
                {completed ? "✓" : step.id}
              </span>
              <div>
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                    active
                      ? "text-sky-200"
                      : completed
                        ? "text-sky-700"
                        : "text-slate-400"
                  }`}
                >
                  {stepLabel} {step.id}
                </p>
                <h2 className="mt-1 text-lg font-semibold">{step.title}</h2>
              </div>
            </div>
            <p className={`mt-4 text-sm leading-6 ${active ? "text-slate-200" : "text-slate-500"}`}>
              {step.description}
            </p>
          </div>
        );

        return (
          <div key={step.id} className="relative">
            {index < steps.length - 1 ? (
              <div className="absolute left-[calc(50%+26px)] top-6 hidden h-px w-[calc(100%-52px)] bg-slate-200 lg:block" />
            ) : null}
            {href ? (
              <Link href={href} className="block rounded-[24px]">
                {stepCard}
              </Link>
            ) : (
              stepCard
            )}
          </div>
        );
      })}
    </div>
  );
}
