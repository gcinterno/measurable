"use client";

import { useRef, useState } from "react";

import {
  getReportChatContext,
  type ReportChatContext,
} from "@/lib/reports/chat-context";
import { usePreferencesStore } from "@/lib/store/preferences-store";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const starterPrompts = [
  "Dame un resumen del reporte",
  "Cuales son los KPIs principales",
  "Que siguiente paso recomiendas",
] as const;

function buildReply(question: string, context: ReportChatContext | null) {
  const normalized = question.toLowerCase();
  const reportName = context?.title || "tu reporte";
  const statsText =
    context?.stats.length
      ? context.stats
          .slice(0, 3)
          .map((stat) => `${stat.label}: ${stat.value}`)
          .join(" | ")
      : "Todavia no tengo KPIs cargados de un reporte abierto.";

  if (!context) {
    return "Puedo ayudarte en toda la app, pero para responder sobre resultados concretos necesito que abras un reporte. Cuando entres a uno, usare sus KPIs y resumen visibles.";
  }

  if (
    normalized.includes("resumen") ||
    normalized.includes("summary") ||
    normalized.includes("que paso") ||
    normalized.includes("qué pasó")
  ) {
    return `Resumen de ${reportName}: ${context.summary || "No hay resumen textual disponible, asi que uso los KPIs visibles."} KPIs clave: ${statsText}.`;
  }

  if (
    normalized.includes("kpi") ||
    normalized.includes("metrica") ||
    normalized.includes("métrica") ||
    normalized.includes("resultado")
  ) {
    return `Los resultados mas visibles de ${reportName} son: ${statsText}.`;
  }

  if (
    normalized.includes("recomend") ||
    normalized.includes("siguiente paso") ||
    normalized.includes("accion")
  ) {
    return `Siguiente paso sugerido para ${reportName}: tomar los indicadores mas fuertes (${statsText}) y convertirlos en una accion o decision concreta del siguiente ciclo.`;
  }

  return `Puedo ayudarte con ${reportName}. Ahora mismo tengo este contexto: ${statsText}. Preguntame por resumen, KPIs o siguientes pasos.`;
}

export function AppAssistantBubble() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const counter = useRef(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const theme = usePreferencesStore((state) => state.theme);
  const darkMode = theme === "dark";
  const context = getReportChatContext();
  const introMessage = context
    ? `Estoy listo para ayudarte con ${context.title}.`
    : "Soy tu asistente AI. Puedo guiarte dentro de la app y analizar resultados cuando abras un reporte.";

  function submitQuestion(input: string) {
    const trimmed = input.trim();

    if (!trimmed) {
      return;
    }

    const userId = `user-${counter.current}`;
    counter.current += 1;
    const assistantId = `assistant-${counter.current}`;
    counter.current += 1;

    setMessages((current) => [
      ...current,
      { id: userId, role: "user", content: trimmed },
      {
        id: assistantId,
        role: "assistant",
        content: buildReply(trimmed, context),
      },
    ]);
    setQuestion("");
    setOpen(true);
  }

  return (
    <>
      {open ? (
        <section
          className={`fixed bottom-24 right-4 z-50 flex h-[min(68vh,620px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-[28px] shadow-[0_20px_80px_rgba(15,23,42,0.22)] sm:right-5 sm:w-[min(92vw,380px)] lg:bottom-5 ${
            darkMode
              ? "border border-white/10 bg-[#0f172a]"
              : "border border-slate-200 bg-white"
          }`}
        >
          <div
            className={`flex items-center justify-between px-4 py-4 ${
              darkMode
                ? "border-b border-white/10 bg-slate-950 text-white"
                : "border-b border-slate-200 bg-slate-950 text-white"
            }`}
          >
            <div>
              <p className="text-sm font-semibold">AI Assistant</p>
              <p className="text-xs text-slate-300">
                {context ? "Con contexto del reporte abierto" : "Disponible en toda la app"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              x
            </button>
          </div>

          <div
            className={`flex-1 space-y-3 overflow-y-auto p-4 ${
              darkMode ? "bg-[#111827]" : "bg-slate-50"
            }`}
          >
            <div
              className={`max-w-[88%] rounded-[22px] px-4 py-3 text-sm leading-6 ${
                darkMode
                  ? "bg-white/5 text-slate-200 ring-1 ring-white/10"
                  : "bg-white text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              {introMessage}
            </div>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[88%] rounded-[22px] px-4 py-3 text-sm leading-6 ${
                  message.role === "assistant"
                    ? darkMode
                      ? "bg-white/5 text-slate-200 ring-1 ring-white/10"
                      : "bg-white text-slate-700 ring-1 ring-slate-200"
                    : "ml-auto bg-slate-950 text-white"
                }`}
              >
                {message.content}
              </div>
            ))}

            {context ? (
              <div className="flex flex-wrap gap-2">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => submitQuestion(prompt)}
                    className={`rounded-full px-3 py-2 text-xs font-medium transition ${
                      darkMode
                        ? "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitQuestion(question);
            }}
            className={`p-4 ${
              darkMode
                ? "border-t border-white/10 bg-[#0f172a]"
                : "border-t border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-end gap-3">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Pregunta algo..."
                rows={3}
                className={`min-h-[84px] flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100 ${
                  darkMode
                    ? "border border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                    : "border border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
                }`}
              />
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Enviar
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir asistente AI"
        className={`fixed bottom-24 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_18px_44px_rgba(15,23,42,0.24)] transition sm:right-5 lg:bottom-5 ${
          darkMode
            ? "border border-white/10 bg-slate-950 hover:bg-slate-900"
            : "bg-slate-950 hover:bg-slate-800"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 stroke-current">
          <rect x="6" y="8" width="12" height="9" rx="3" strokeWidth="1.8" />
          <path d="M12 4.5v2M9.5 13h.01M14.5 13h.01M10 16h4" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </>
  );
}
