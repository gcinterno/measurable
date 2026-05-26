"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { createSuggestion } from "@/lib/api/suggestions";

type UserSuggestionModalProps = {
  open: boolean;
  onClose: () => void;
};

const MAX_SUGGESTION_LENGTH = 1000;

export function UserSuggestionModal({ open, onClose }: UserSuggestionModalProps) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      setError("");
      setSuccess("");
      setSubmitting(false);
    }

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();

    if (!trimmed) {
      setError("Escribe una sugerencia antes de enviarla.");
      return;
    }

    if (trimmed.length > MAX_SUGGESTION_LENGTH) {
      setError(`La sugerencia debe tener máximo ${MAX_SUGGESTION_LENGTH} caracteres.`);
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      await createSuggestion(trimmed);
      setMessage("");
      setSuccess("Gracias, recibimos tu sugerencia.");
      closeTimerRef.current = window.setTimeout(() => {
        onClose();
      }, 1500);
    } catch (submitError) {
      console.error("suggestion submit error:", submitError);
      setError("No pudimos enviar tu sugerencia. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-end bg-slate-950/20 px-4 pb-28 pt-4 backdrop-blur-[2px] sm:px-5 lg:pb-24">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="w-full max-w-[380px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_80px_rgba(15,23,42,0.22)]"
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-950 px-4 py-4 text-white">
          <div>
            <h2 className="text-sm font-semibold">Enviar sugerencia</h2>
            <p className="mt-1 text-xs text-slate-300">
              Tu mensaje se envía al equipo de administración.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white hover:bg-white/15"
            aria-label="Cerrar sugerencia"
          >
            x
          </button>
        </div>

        <div className="space-y-4 bg-white p-4">
          <label className="block">
            <span className="sr-only">Mensaje sugerencia</span>
            <textarea
              value={message}
              onChange={(event) => {
                setMessage(event.target.value.slice(0, MAX_SUGGESTION_LENGTH));
                setError("");
                setSuccess("");
              }}
              placeholder="Mensaje sugerencia"
              rows={5}
              maxLength={MAX_SUGGESTION_LENGTH}
              className="min-h-[132px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
            <span className="mt-2 block text-right text-xs text-slate-400">
              {message.length}/{MAX_SUGGESTION_LENGTH}
            </span>
          </label>

          {error ? (
            <p className="rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !message.trim()}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              "Enviando..."
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-current">
                  <path
                    d="M4 12 19 5l-4.5 14-3.2-4.3L4 12Z"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M19 5 11.3 14.7"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Enviar recomendación</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
