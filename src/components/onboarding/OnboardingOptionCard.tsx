"use client";

type OnboardingOptionCardProps = {
  label: string;
  value: string;
  selected: boolean;
  onClick: (value: string) => void;
};

export function OnboardingOptionCard({
  label,
  value,
  selected,
  onClick,
}: OnboardingOptionCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`w-full rounded-[16px] border px-4 py-4 text-left transition-all duration-200 sm:px-5 sm:py-5 ${
        selected
          ? "border-[var(--measurable-blue)] bg-[rgba(23,73,255,0.06)] shadow-[0_10px_24px_rgba(23,73,255,0.12)]"
          : "border-[var(--border-soft)] bg-[var(--surface)] hover:border-[var(--border-blue-soft)] hover:bg-[var(--surface-soft)]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[var(--text-primary)] sm:text-[0.95rem]">
          {label}
        </span>
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-all duration-200 sm:h-5.5 sm:w-5.5 ${
            selected
              ? "border-[var(--measurable-blue)] bg-[var(--measurable-blue)] text-white"
              : "border-[var(--border-soft)] bg-white text-transparent"
          }`}
        >
          ✓
        </span>
      </div>
    </button>
  );
}
