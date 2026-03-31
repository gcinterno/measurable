"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MetaOption = {
  id: string;
  name: string;
};

type AdAccountSelectorProps = {
  accounts: MetaOption[];
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
};

export function AdAccountSelector({
  accounts,
  value,
  onChange,
  loading = false,
}: AdAccountSelectorProps) {
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
        Facebook Pages
      </p>
      <h3 className="mt-3 text-2xl font-semibold text-slate-950">
        Selecciona una pagina
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Elige la pagina de Facebook con la que quieres sincronizar insights.
      </p>

      <div ref={containerRef} className="relative mt-5">
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
              Pagina seleccionada
            </p>
            <p className="mt-1 truncate text-sm font-medium text-slate-950">
              {selectedAccount?.name || "Selecciona una pagina"}
            </p>
          </div>
          <span className="ml-4 text-slate-400">{open ? "▲" : "▼"}</span>
        </button>

        {open ? (
          <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-20 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.12)]">
            <div className="max-h-72 overflow-y-auto p-2">
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
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                      selected
                        ? "bg-sky-50 text-sky-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate text-sm font-medium">
                      {account.name}
                    </span>
                    {selected ? (
                      <span className="ml-3 text-xs font-semibold uppercase tracking-[0.16em]">
                        Actual
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
