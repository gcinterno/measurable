"use client";

import { useState } from "react";

import type { ReportBlock as ReportBlockType } from "@/types/report";

type ReportBlockProps = {
  block: ReportBlockType;
  onSave: (blockId: string, content: string) => Promise<void>;
};

function getBlockLabel(type: string) {
  switch (type) {
    case "heading":
      return "Heading";
    case "paragraph":
    case "text":
      return "Text";
    case "chart":
      return "Chart";
    case "metric":
      return "Metric";
    default:
      return type;
  }
}

export function ReportBlock({ block, onSave }: ReportBlockProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(block.content);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      await onSave(block.id, value);
      setEditing(false);
    } catch (err: any) {
      console.error("report block save error:", err);
      setError(
        "No pudimos guardar este bloque. Intenta nuevamente en unos segundos."
      );
    } finally {
      setSaving(false);
    }
  }

  function renderContent() {
    if (editing) {
      return (
        <div className="space-y-3">
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            rows={block.type === "heading" ? 2 : 5}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-400"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setValue(block.content);
                setError("");
              }}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      );
    }

    switch (block.type) {
      case "heading":
        return <h3 className="text-2xl font-semibold text-slate-950">{block.content}</h3>;
      case "metric":
        return (
          <div className="rounded-[24px] border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              {block.label || block.title || "Metric"}
            </p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              {block.content}
            </p>
          </div>
        );
      case "chart":
        return (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              {block.title || "Chart"}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {block.content || "El backend devolvio un bloque de grafica. Esta tarjeta reserva el espacio del chart sin inventar dashboards falsos."}
            </p>
          </div>
        );
      case "paragraph":
      case "text":
      default:
        return <p className="text-sm leading-7 text-slate-600">{block.content}</p>;
    }
  }

  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
            {getBlockLabel(block.type)}
          </p>
          {block.title && block.type !== "heading" ? (
            <h2 className="mt-2 text-lg font-semibold text-slate-950">
              {block.title}
            </h2>
          ) : null}
        </div>
        {block.editable ? (
          <button
            type="button"
            onClick={() => setEditing((current) => !current)}
            className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {editing ? "Cerrar editor" : "Editar"}
          </button>
        ) : null}
      </div>
      <div className="mt-5">{renderContent()}</div>
    </article>
  );
}
