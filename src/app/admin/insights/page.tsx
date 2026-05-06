"use client";

import { useEffect, useState } from "react";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { fetchAdminInsights, type AdminInsights } from "@/lib/api/admin";

function formatPercent(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function InsightSkeleton() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] shadow-[0_12px_30px_rgba(15,23,42,0.04)]" />
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-72 animate-pulse rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] shadow-[0_12px_30px_rgba(15,23,42,0.04)]" />
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="h-80 animate-pulse rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] shadow-[0_12px_30px_rgba(15,23,42,0.04)]" />
        <div className="h-80 animate-pulse rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] shadow-[0_12px_30px_rgba(15,23,42,0.04)]" />
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note: string;
}) {
  return (
    <article className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--measurable-blue)]">
        {label}
      </p>
      <p className="mt-4 text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{note}</p>
    </article>
  );
}

function DistributionCard({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: number }>;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <article className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--measurable-blue)]">
        {title}
      </p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{subtitle}</p>

      {items.length ? (
        <div className="mt-5 space-y-4">
          {items.map((item) => {
            const percent = formatPercent(item.value, total);

            return (
              <div key={item.label}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{item.label}</span>
                  <span className="text-sm text-[var(--text-secondary)]">
                    {item.value} · {percent}%
                  </span>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-[var(--surface-soft)]">
                  <div
                    className="h-2.5 rounded-full bg-[var(--measurable-blue)]"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-[18px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-8 text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">No distribution data yet</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            This section will populate as more responses come in.
          </p>
        </div>
      )}
    </article>
  );
}

function FeedbackCard({
  email,
  reason,
  details,
  createdAt,
}: {
  email: string;
  reason: string;
  details: string;
  createdAt: string;
}) {
  return (
    <article className="rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{email || "Unknown email"}</p>
        <span className="inline-flex rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
          {createdAt || "—"}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          {reason || "No reason"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        {details || "No additional feedback provided."}
      </p>
    </article>
  );
}

export default function AdminInsightsPage() {
  const [insights, setInsights] = useState<AdminInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadInsights() {
      try {
        const nextInsights = await fetchAdminInsights();

        if (!active) {
          return;
        }

        setInsights(nextInsights);
      } catch {
        if (!active) {
          return;
        }

        setError("We could not load admin insights right now.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInsights();

    return () => {
      active = false;
    };
  }, []);

  return (
    <AdminPageShell
      title="Insights"
      description="Understand activation, onboarding, and account deletion signals without leaving the admin workspace."
    >
      {loading ? (
        <InsightSkeleton />
      ) : error ? (
        <section className="rounded-[24px] border border-red-200 bg-red-50/80 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-8">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </section>
      ) : insights ? (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Onboarding completed"
              value={insights.onboarding.completed}
              note="Users who finished onboarding."
            />
            <MetricCard
              label="Onboarding pending"
              value={insights.onboarding.pending}
              note="Users still dropping before activation."
            />
            <MetricCard
              label="Completion rate"
              value={`${insights.onboarding.completionRate}%`}
              note="Overall activation completion rate."
            />
            <MetricCard
              label="Deletions last 7 days"
              value={insights.accountDeletion.deletionsLast7Days}
              note="Recent churn signal across the platform."
            />
          </section>

          <section className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--measurable-blue)]">
                Onboarding intelligence
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                Where activation is gaining or stalling
              </h2>
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              <DistributionCard
                title="User type distribution"
                subtitle="Which buyer profiles are entering the funnel."
                items={insights.onboarding.userTypes}
              />
              <DistributionCard
                title="Goals distribution"
                subtitle="What users say they want to achieve first."
                items={insights.onboarding.goals}
              />
              <DistributionCard
                title="Platforms distribution"
                subtitle="The connectors users expect to set up most often."
                items={insights.onboarding.platforms}
              />
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--measurable-blue)]">
                Account deletion intelligence
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                Churn reasons and direct feedback
              </h2>
            </div>
            <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
              <DistributionCard
                title="Reasons distribution"
                subtitle="Why users say they are leaving the platform."
                items={insights.accountDeletion.reasons}
              />
              <section className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--measurable-blue)]">
                  Recent feedback
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Recent account deletion messages from real users.
                </p>
                {insights.accountDeletion.recentFeedback.length ? (
                  <div className="mt-5 space-y-3">
                    {insights.accountDeletion.recentFeedback.map((item, index) => (
                      <FeedbackCard
                        key={`${item.email}-${item.createdAt}-${index}`}
                        email={item.email}
                        reason={item.reason}
                        details={item.details}
                        createdAt={item.createdAt}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[18px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-8 text-center">
                    <p className="text-sm font-medium text-[var(--text-primary)]">No feedback yet</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      This feed will populate once users leave structured deletion feedback.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </AdminPageShell>
  );
}
