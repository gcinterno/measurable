"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import {
  createAdminReferralPartner,
  fetchAdminReferralSummary,
  type AdminReferralPartnerInput,
  type AdminReferralSummaryRow,
} from "@/lib/api/admin";

const partnerTypeOptions = ["agency", "creator", "affiliate", "customer"] as const;
const commissionTypeOptions = ["percent", "fixed"] as const;
const partnerStatusOptions = ["active", "paused", "draft"] as const;
const REFERRAL_BASE_URL = "https://measurableapp.com/signup";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function defaultFormState(): AdminReferralPartnerInput {
  return {
    name: "",
    code: "",
    type: "agency",
    commission_type: "percent",
    commission_value: 20,
    status: "active",
  };
}

export default function AdminReferralsPage() {
  const [rows, setRows] = useState<AdminReferralSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState<AdminReferralPartnerInput>(defaultFormState);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const nextRows = await fetchAdminReferralSummary();

        if (!active) {
          return;
        }

        setRows(nextRows);
      } catch {
        if (!active) {
          return;
        }

        setError("We could not load referral acquisition data right now.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const generatedLink = useMemo(() => {
    const code = form.code.trim();
    return code
      ? `${REFERRAL_BASE_URL}?ref=${encodeURIComponent(code)}`
      : `${REFERRAL_BASE_URL}?ref={code}`;
  }, [form.code]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.name.trim() || !form.code.trim()) {
      setFormError("Name and code are required.");
      return;
    }

    if (!Number.isFinite(form.commission_value) || form.commission_value < 0) {
      setFormError("Commission value must be zero or greater.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      setSuccessMessage("");
      await createAdminReferralPartner({
        ...form,
        name: form.name.trim(),
        code: form.code.trim(),
      });

      setSuccessMessage("Referral partner created.");
      setForm(defaultFormState());
      const nextRows = await fetchAdminReferralSummary();
      setRows(nextRows);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error && err.message
          ? err.message
          : "We could not create the referral partner."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPageShell
      title="Referral acquisition"
      description="Track partner performance and create referral links for agencies, affiliates, and distribution partners."
    >
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[0_10px_24px_rgba(15,23,42,0.035)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--measurable-blue)]">
            New partner
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Create referral partner
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Generate a referral code and keep commission settings simple.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="Agency X"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Code</span>
              <input
                type="text"
                value={form.code}
                onChange={(event) =>
                  setForm((current) => ({ ...current, code: event.target.value.toLowerCase() }))
                }
                className="w-full rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="agenciax"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Type</span>
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, type: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                >
                  {partnerTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Status</span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, status: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                >
                  {partnerStatusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Commission type</span>
                <select
                  value={form.commission_type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      commission_type: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                >
                  {commissionTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Commission</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={String(form.commission_value)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      commission_value: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </label>
            </div>

            <div className="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--measurable-blue)]">
                Referral link
              </p>
              <p className="mt-3 break-all text-sm font-medium text-[var(--text-primary)]">
                {generatedLink}
              </p>
            </div>

            {formError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            ) : null}
            {successMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? "Creating partner..." : "Create partner"}
            </button>
          </form>
        </section>

        <section className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[0_10px_24px_rgba(15,23,42,0.035)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--measurable-blue)]">
                Acquisition summary
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                Referral performance
              </h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              {rows.length} partner{rows.length === 1 ? "" : "s"} tracked
            </p>
          </div>

          {loading ? (
            <div className="mt-6 space-y-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-14 animate-pulse rounded-2xl bg-[var(--surface-soft)]"
                />
              ))}
            </div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              {error}
            </div>
          ) : rows.length === 0 ? (
            <div className="mt-6 rounded-[22px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] px-5 py-8 text-center">
              <p className="text-sm font-medium text-[var(--text-primary)]">No referral partners yet</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Create the first partner to start capturing referral clicks and signup attribution.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    <th className="px-3 py-2">Referral Code</th>
                    <th className="px-3 py-2">Partner</th>
                    <th className="px-3 py-2">Clicks</th>
                    <th className="px-3 py-2">Signups</th>
                    <th className="px-3 py-2">First Reports</th>
                    <th className="px-3 py-2">Paid Conversions</th>
                    <th className="px-3 py-2">Revenue</th>
                    <th className="px-3 py-2">Estimated Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.referralCode} className="rounded-[18px] bg-[var(--surface-soft)] text-sm text-[var(--text-primary)]">
                      <td className="rounded-l-[18px] px-3 py-4 font-semibold">{row.referralCode}</td>
                      <td className="px-3 py-4">{row.partner}</td>
                      <td className="px-3 py-4">{row.clicks}</td>
                      <td className="px-3 py-4">{row.signups}</td>
                      <td className="px-3 py-4">{row.firstReports}</td>
                      <td className="px-3 py-4">{row.paidConversions}</td>
                      <td className="px-3 py-4">{formatCurrency(row.revenue)}</td>
                      <td className="rounded-r-[18px] px-3 py-4">{formatCurrency(row.estimatedCommission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminPageShell>
  );
}
