"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "@/components/providers/LanguageProvider";

type MetaOption = {
  id: string;
  name: string;
};

type AdAccountSelectorProps = {
  accounts: MetaOption[];
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  emptyMessage?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  selectedLabel?: string;
};

export function AdAccountSelector({
  accounts,
  value,
  onChange,
  loading = false,
  emptyMessage,
  eyebrow,
  title,
  description,
  selectedLabel,
}: AdAccountSelectorProps) {
  const { messages } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === value) || null,
    [accounts, value]
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const disabled = loading || accounts.length === 0;

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
        {eyebrow || messages.integrationsPage.facebookPages}
      </p>
      <h3 className="mt-3 text-2xl font-semibold text-slate-950">
        {title || messages.integrationsPage.selectPage}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description || messages.integrationsPage.selectPageDescription}
      </p>

      {accounts.length === 0 ? (
        <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-sm leading-6 text-slate-600">
            {emptyMessage || "No Facebook Pages were authorized. Please reconnect and select at least one page."}
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="relative z-10 mt-5 isolate">
          <button
            type="button"
            onClick={() => {
              if (!disabled) {
                setOpen((current) => !current);
              }
            }}
            disabled={disabled}
            className="flex w-full items-center justify-between rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-left shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {selectedLabel || messages.integrationsPage.selectedPage}
              </p>
              <p className="mt-1 truncate text-sm font-medium text-slate-950">
                {selectedAccount?.name || title || messages.integrationsPage.selectPage}
              </p>
            </div>
            <span className="ml-4 text-slate-400">{open ? "▲" : "▼"}</span>
          </button>

          {open ? (
            <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-[24px] border border-slate-200/90 bg-white/95 shadow-[0_26px_70px_rgba(15,23,42,0.14)] backdrop-blur-sm">
              <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95)_0%,rgba(255,255,255,0.98)_100%)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {selectedLabel || messages.integrationsPage.selectedPage}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Choose the asset you want to sync.
                </p>
              </div>
              <div className="max-h-72 overflow-y-auto bg-slate-50/80 p-2">
                {accounts.map((account) => {
                  const selected = account.id === value;

                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => {
                        onChange(account.id);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                        selected
                          ? "border-sky-200 bg-white text-sky-700 shadow-[0_10px_24px_rgba(14,165,233,0.08)]"
                          : "border-transparent bg-transparent text-slate-700 hover:border-slate-200 hover:bg-white"
                      }`}
                    >
                      <span className="truncate text-sm font-medium">
                        {account.name}
                      </span>
                      {selected ? (
                        <span className="ml-3 text-xs font-semibold uppercase tracking-[0.16em]">
                          {messages.integrationsPage.current}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
