"use client";

type OnboardingProgressProps = {
  step: number;
  totalSteps: number;
};

export function OnboardingProgress({
  step,
  totalSteps,
}: OnboardingProgressProps) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--measurable-blue)]">
        Step {step} of {totalSteps}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {Array.from({ length: totalSteps }, (_, index) => {
          const active = index < step;

          return (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-200 ${
                active ? "bg-[var(--measurable-blue)]" : "bg-[var(--border-soft)]"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
