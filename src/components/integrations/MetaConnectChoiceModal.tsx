"use client";

type MetaConnectChoiceModalProps = {
  open: boolean;
  onClose: () => void;
  onPagesOnly: () => void;
  onPagesWithInstagram: () => void;
  variant?: "facebook_pages" | "instagram_business";
};

function ChoiceCard(props: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  const { title, description, onClick } = props;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-white"
    >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-950">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          </div>
        <span className="mt-0.5 text-slate-400">›</span>
        </div>
      </button>
    );
  }

export function MetaConnectChoiceModal({
  open,
  onClose,
  onPagesOnly,
  onPagesWithInstagram,
  variant = "facebook_pages",
}: MetaConnectChoiceModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(7,17,31,0.52)] px-4 py-6 backdrop-blur-[2px]">
      <div className="flex max-h-[88vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:max-h-none">
        <div className="shrink-0 border-b border-slate-200 bg-[linear-gradient(135deg,#08111f_0%,#12306d_100%)] px-6 py-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">
            Meta connection
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            How do you want to connect Meta?
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:px-6 sm:py-6">
          <div className="space-y-3">
            {variant === "facebook_pages" ? (
              <ChoiceCard
                title="Facebook Pages only"
                description="Connect pages, page insights, engagement, followers, reactions and page views."
                onClick={onPagesOnly}
              />
            ) : null}
            <ChoiceCard
              title="Facebook Pages + linked Instagram"
              description="Connect Facebook Pages and detect Instagram Business accounts linked to those Pages."
              onClick={onPagesWithInstagram}
            />
          </div>
        </div>

        <div className="sticky bottom-0 shrink-0 border-t border-slate-200/70 bg-white/88 px-5 py-3 backdrop-blur-[10px] sm:static sm:border-t sm:bg-transparent sm:px-6 sm:py-6 sm:backdrop-blur-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
