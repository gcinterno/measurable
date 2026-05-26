"use client";

type UpgradeCTAProps = {
  label: string;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
};

export function UpgradeCTA({
  label,
  onClick,
  loading = false,
  disabled = false,
  variant = "primary",
  className = "",
}: UpgradeCTAProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
        variant === "primary"
          ? "bg-[var(--measurable-blue)] text-white shadow-[0_14px_32px_rgba(23,73,255,0.22)] hover:bg-[var(--measurable-blue-hover)]"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      } ${className}`}
    >
      {loading ? "Loading..." : label}
    </button>
  );
}
