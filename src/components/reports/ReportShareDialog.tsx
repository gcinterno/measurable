"use client";

type ReportShareDialogProps = {
  open: boolean;
  title: string;
  description: string;
  shareUrl: string;
  closeLabel: string;
  onClose: () => void;
};

export function ReportShareDialog({
  open,
  title,
  description,
  shareUrl,
  closeLabel,
  onClose,
}: ReportShareDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
        <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        <input
          readOnly
          value={shareUrl}
          onFocus={(event) => event.currentTarget.select()}
          className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none"
        />
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
