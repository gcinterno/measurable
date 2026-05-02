"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { ApiError } from "@/lib/api";
import { sendAssistantMessage } from "@/lib/api/assistant";
import { getToken } from "@/lib/auth/session";
import { formatDisplayNumber } from "@/lib/formatters";
import { getIntegrationReportContext } from "@/lib/integrations/session";
import {
  getReportChatContext,
  type ReportChatContext,
} from "@/lib/reports/chat-context";
import { usePreferencesStore } from "@/lib/store/preferences-store";
import { getActiveWorkspaceId } from "@/lib/workspace/session";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const starterPrompts = [
  "Give me a report summary",
  "Summarize the key results",
  "What are the main KPIs",
  "What changed the most",
  "What next step do you recommend",
  "What should I present first",
  "Where are the risks",
  "Turn this into an executive summary",
  "What actions should we take next",
] as const;

function shuffleArray<T>(items: readonly T[]) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[randomIndex]] = [
      nextItems[randomIndex],
      nextItems[index],
    ];
  }

  return nextItems;
}

function formatInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={`bold-${index}`} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <Fragment key={`text-${index}`}>{part}</Fragment>;
  });
}

function renderMarkdown(content: string) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const elements: React.ReactNode[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let tableLines: string[] = [];
  let key = 0;

  function flushParagraph() {
    if (paragraphLines.length === 0) {
      return;
    }

    elements.push(
      <p key={`paragraph-${key++}`} className="whitespace-pre-wrap">
        {paragraphLines.map((line, index) => (
          <Fragment key={`paragraph-line-${index}`}>
            {index > 0 ? <br /> : null}
            {formatInlineMarkdown(line)}
          </Fragment>
        ))}
      </p>
    );
    paragraphLines = [];
  }

  function flushList() {
    if (listItems.length === 0) {
      return;
    }

    elements.push(
      <ul key={`list-${key++}`} className="list-disc space-y-1 pl-5">
        {listItems.map((item, index) => (
          <li key={`list-item-${index}`}>{formatInlineMarkdown(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  }

  function flushTable() {
    if (tableLines.length < 2) {
      if (tableLines.length > 0) {
        paragraphLines.push(...tableLines);
      }
      tableLines = [];
      return;
    }

    const rows = tableLines.map((line) =>
      line
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean)
    );

    const [headerRow, separatorRow, ...bodyRows] = rows;

    if (
      !headerRow ||
      !separatorRow ||
      !separatorRow.every((cell) => /^:?-{3,}:?$/.test(cell))
    ) {
      paragraphLines.push(...tableLines);
      tableLines = [];
      return;
    }

    elements.push(
      <div key={`table-wrap-${key++}`} className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead>
            <tr>
              {headerRow.map((cell, index) => (
                <th
                  key={`table-head-${index}`}
                  className="border-b border-current/15 px-2 py-1.5 font-semibold"
                >
                  {formatInlineMarkdown(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, rowIndex) => (
              <tr key={`table-row-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={`table-cell-${rowIndex}-${cellIndex}`}
                    className="border-b border-current/10 px-2 py-1.5 align-top"
                  >
                    {formatInlineMarkdown(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableLines = [];
  }

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.includes("|")) {
      flushParagraph();
      flushList();
      tableLines.push(trimmedLine);
      continue;
    }

    flushTable();

    if (!trimmedLine) {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmedLine === "---") {
      flushParagraph();
      flushList();
      elements.push(
        <hr key={`divider-${key++}`} className="border-current/15" />
      );
      continue;
    }

    if (trimmedLine.startsWith("# ")) {
      flushParagraph();
      flushList();
      elements.push(
        <h1 key={`heading-1-${key++}`} className="text-base font-semibold">
          {formatInlineMarkdown(trimmedLine.slice(2))}
        </h1>
      );
      continue;
    }

    if (trimmedLine.startsWith("## ")) {
      flushParagraph();
      flushList();
      elements.push(
        <h2 key={`heading-2-${key++}`} className="text-sm font-semibold">
          {formatInlineMarkdown(trimmedLine.slice(3))}
        </h2>
      );
      continue;
    }

    if (trimmedLine.startsWith("### ")) {
      flushParagraph();
      flushList();
      elements.push(
        <h3 key={`heading-3-${key++}`} className="text-sm font-semibold">
          {formatInlineMarkdown(trimmedLine.slice(4))}
        </h3>
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmedLine)) {
      flushParagraph();
      listItems.push(trimmedLine.replace(/^[-*]\s+/, ""));
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushTable();
  flushParagraph();
  flushList();

  return elements;
}

function AssistantTypingBubble({ darkMode }: { darkMode: boolean }) {
  return (
    <div
      className={`max-w-[88%] rounded-[22px] px-4 py-3 ${
        darkMode
          ? "bg-white/5 text-slate-200 ring-1 ring-white/10"
          : "bg-white text-slate-700 ring-1 ring-slate-200"
      }`}
    >
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className={`h-2 w-2 rounded-full ${
              darkMode ? "bg-slate-300/80" : "bg-slate-400/80"
            } animate-[pulse_1.2s_ease-in-out_infinite]`}
            style={{ animationDelay: `${dot * 0.18}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function buildAssistantRequestMessage(
  question: string,
  context: ReportChatContext | null
) {
  if (!context) {
    return question;
  }

  const statsText =
    context.stats.length > 0
      ? context.stats
          .slice(0, 3)
          .map((stat) => `${stat.label}: ${formatDisplayNumber(stat.value)}`)
          .join(" | ")
      : "No visible KPIs loaded.";

  return [
    `Open report context: ${context.title}.`,
    context.summary ? `Visible summary: ${context.summary}` : "",
    `Visible KPIs: ${statsText}.`,
    `User question: ${question}`,
  ]
    .filter(Boolean)
    .join(" ");
}

function getCurrentRoute(pathname: string, searchParams: URLSearchParams) {
  const queryString = searchParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

function getRouteReportId(pathname: string, searchParams: URLSearchParams) {
  const queryReportId = searchParams.get("reportId");

  if (queryReportId) {
    return queryReportId;
  }

  const routeMatch = pathname.match(/^\/reports\/([^/]+)/);
  return routeMatch?.[1] || "";
}

function getAssistantErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.isAuthError) {
      return "Your session expired. Sign in again to use the AI Assistant.";
    }

    if (error.code === "ai_provider_unavailable") {
      return error.message || "The AI provider is currently unavailable.";
    }

    if (error.message) {
      return error.message;
    }
  }

  return "No se pudo obtener respuesta del assistant.";
}

export function AppAssistantBubble() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const counter = useRef(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [sending, setSending] = useState(false);
  const [visiblePrompts, setVisiblePrompts] = useState<string[]>([]);
  const theme = usePreferencesStore((state) => state.theme);
  const darkMode = theme === "dark";
  const context = getReportChatContext();
  const integrationContext = getIntegrationReportContext();
  const introMessage = "Lets chat with your data. Ask me anything";
  const introContent = useMemo(() => renderMarkdown(introMessage), [introMessage]);
  const currentRoute = getCurrentRoute(pathname || "/", new URLSearchParams(searchParams.toString()));
  const routeReportId = getRouteReportId(pathname || "/", new URLSearchParams(searchParams.toString()));
  const activeWorkspaceId = getActiveWorkspaceId() || integrationContext?.workspaceId || "";
  const reportId = context?.reportId || routeReportId;
  const datasetId = integrationContext?.datasetId || "";
  const pageContext = useMemo(
    () => ({
      report_title: context?.title || "",
      report_summary: context?.summary || "",
      visible_stats: context?.stats || [],
      integration_source: integrationContext?.source || "",
      pathname: pathname || "/",
    }),
    [context?.stats, context?.summary, context?.title, integrationContext?.source, pathname]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setVisiblePrompts(shuffleArray(starterPrompts).slice(0, 3));
  }, [open]);

  async function submitQuestion(input: string) {
    const trimmed = input.trim();

    if (!trimmed || sending) {
      return;
    }

    if (!getToken()) {
      const assistantId = `assistant-${counter.current}`;
      counter.current += 1;

      setMessages((current) => [
        ...current,
        {
          id: assistantId,
          role: "assistant",
          content: "You need an active session to use the AI Assistant.",
        },
      ]);
      return;
    }

    const userId = `user-${counter.current}`;
    counter.current += 1;

    setMessages((current) => [
      ...current,
      { id: userId, role: "user", content: trimmed },
    ]);
    setQuestion("");
    setOpen(true);

    try {
      setSending(true);
      const response = await sendAssistantMessage({
        message: buildAssistantRequestMessage(trimmed, context),
        conversationId: conversationId || undefined,
        workspaceId: activeWorkspaceId || undefined,
        reportId: reportId || undefined,
        datasetId: datasetId || undefined,
        currentRoute,
        pageContext,
      });
      const assistantId = `assistant-${counter.current}`;
      counter.current += 1;

      if (response.conversationId) {
        setConversationId(response.conversationId);
      }

      setMessages((current) => [
        ...current,
        {
          id: assistantId,
          role: "assistant",
          content:
            response.reply || "No se pudo obtener respuesta del assistant.",
        },
      ]);
    } catch (error) {
      console.error("assistant chat error:", error);
      const assistantId = `assistant-${counter.current}`;
      counter.current += 1;

      setMessages((current) => [
        ...current,
        {
          id: assistantId,
          role: "assistant",
          content: getAssistantErrorMessage(error),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {open ? (
        <section
          className={`fixed bottom-32 right-4 z-50 flex h-[min(68vh,620px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-[28px] shadow-[0_20px_80px_rgba(15,23,42,0.22)] sm:right-5 sm:w-[min(92vw,380px)] lg:bottom-5 ${
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
                {context ? "Using the open report context" : "Available throughout the app"}
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
              <div className="space-y-3 break-words">{introContent}</div>
            </div>
            {messages.map((message) => (
              <div
                key={message.id}
                className={message.role === "assistant" ? "max-w-[88%]" : "ml-auto max-w-[88%]"}
              >
                {message.role === "assistant" ? (
                  <>
                    <div className="mb-1.5 flex items-center gap-2 px-1">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full ${
                          darkMode
                            ? "bg-white/8 text-slate-300 ring-1 ring-white/10"
                            : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                        }`}
                      >
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 stroke-current">
                          <rect x="6" y="8" width="12" height="9" rx="3" strokeWidth="1.8" />
                          <path d="M12 4.5v2M9.5 13h.01M14.5 13h.01M10 16h4" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </span>
                      <span className={`text-[11px] font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Measurable AI Asisstant
                      </span>
                    </div>
                    <div
                      className={`rounded-[22px] px-4 py-3 text-sm leading-6 ${
                        darkMode
                          ? "bg-white/5 text-slate-200 ring-1 ring-white/10"
                          : "bg-white text-slate-700 ring-1 ring-slate-200"
                      }`}
                    >
                      <div className="space-y-3 break-words">
                        {renderMarkdown(message.content)}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-[22px] bg-slate-950 px-4 py-3 text-sm leading-6 text-white">
                    {message.content}
                  </div>
                )}
              </div>
            ))}

            {sending ? <AssistantTypingBubble darkMode={darkMode} /> : null}

            {context && messages.length === 0 ? (
              <div className="flex flex-wrap gap-2">
                {visiblePrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void submitQuestion(prompt)}
                    disabled={sending}
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
              void submitQuestion(question);
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
                placeholder="Ask something..."
                rows={3}
                className={`min-h-[84px] flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100 ${
                  darkMode
                    ? "border border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                    : "border border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
                }`}
              />
              <button
                type="submit"
                disabled={sending}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Send
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open AI assistant"
        className={`fixed bottom-32 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_18px_44px_rgba(15,23,42,0.24)] transition sm:right-5 lg:bottom-5 ${
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
