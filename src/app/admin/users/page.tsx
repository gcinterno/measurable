"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { fetchAdminUsers, type AdminUserRow } from "@/lib/api/admin";

function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
}

function formatRelativeTime(value: string) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffMs = date.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const minutes = Math.round(diffMs / (1000 * 60));

  if (Math.abs(minutes) < 60) {
    return rtf.format(minutes, "minute");
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return rtf.format(hours, "hour");
  }

  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) {
    return rtf.format(days, "day");
  }

  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) {
    return rtf.format(months, "month");
  }

  const years = Math.round(days / 365);
  return rtf.format(years, "year");
}

function StatusBadge({
  tone,
  label,
}: {
  tone: "success" | "muted" | "danger" | "neutral";
  label: string;
}) {
  const toneClasses =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "danger"
        ? "border-red-200 bg-red-50 text-red-700"
        : tone === "muted"
          ? "border-slate-200 bg-slate-50 text-slate-600"
          : "border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--text-secondary)]";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses}`}>
      {label}
    </span>
  );
}

function FiltersSkeleton() {
  return (
    <section className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-11 animate-pulse rounded-[16px] bg-[var(--surface-soft)]" />
        ))}
      </div>
    </section>
  );
}

function TableSkeleton() {
  return (
    <section className="mt-4 rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="space-y-3">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="h-14 animate-pulse rounded-[16px] bg-[var(--surface-soft)]" />
        ))}
      </div>
    </section>
  );
}

function CountBadge({
  value,
  tone,
}: {
  value: number;
  tone: "positive" | "warning" | "neutral";
}) {
  const toneClasses =
    tone === "positive"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--text-secondary)]";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses}`}>
      {value}
    </span>
  );
}

function formatHealthLabel(value: AdminUserRow["healthStatus"]) {
  if (value === "at_risk") {
    return "At risk";
  }

  if (value === "dormant") {
    return "Dormant";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function HealthBadge({
  status,
}: {
  status: AdminUserRow["healthStatus"];
}) {
  const toneClasses =
    status === "healthy"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "active"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : status === "at_risk"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-100 text-slate-600";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses}`}>
      {formatHealthLabel(status)}
    </span>
  );
}

function HealthMeter({
  user,
}: {
  user: AdminUserRow;
}) {
  const barClass =
    user.healthStatus === "healthy"
      ? "bg-emerald-500"
      : user.healthStatus === "active"
        ? "bg-sky-500"
        : user.healthStatus === "at_risk"
          ? "bg-amber-500"
          : "bg-slate-400";

  return (
    <div className="group relative min-w-[168px]">
      <div className="flex items-center justify-between gap-3">
        <HealthBadge status={user.healthStatus} />
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {user.healthScore}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]">
        <div
          className={`h-2 rounded-full transition-all duration-150 ease-out ${barClass}`}
          style={{ width: `${Math.max(6, Math.min(100, user.healthScore))}%` }}
        />
      </div>
      {user.healthReasons.length ? (
        <div className="pointer-events-none absolute left-0 top-[calc(100%+10px)] z-20 hidden w-[240px] rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 shadow-[0_14px_34px_rgba(5,8,22,0.12)] group-hover:block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            Health reasons
          </p>
          <div className="mt-2 space-y-1.5">
            {user.healthReasons.map((reason, index) => (
              <p key={`${reason}-${index}`} className="text-xs leading-5 text-[var(--text-secondary)]">
                {reason}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("all");
  const [onboarding, setOnboarding] = useState("all");
  const [plan, setPlan] = useState("all");
  const [status, setStatus] = useState("active");
  const [health, setHealth] = useState("all");

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      try {
        const nextUsers = await fetchAdminUsers();

        if (!active) {
          return;
        }

        setUsers(nextUsers);
      } catch {
        if (!active) {
          return;
        }

        setError("We could not load admin users right now.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      active = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const normalizedSearch = search.trim().toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        user.email.toLowerCase().includes(normalizedSearch) ||
        user.name.toLowerCase().includes(normalizedSearch);
      const matchesProvider =
        provider === "all" || user.authProvider === provider;
      const matchesOnboarding =
        onboarding === "all" ||
        (onboarding === "completed" && user.onboardingCompleted) ||
        (onboarding === "pending" && !user.onboardingCompleted);
      const matchesPlan = plan === "all" || user.plan === plan;
      const matchesStatus =
        status === "all" ||
        (status === "active" && !user.deleted) ||
        (status === "deleted" && user.deleted);
      const matchesHealth = health === "all" || user.healthStatus === health;

      return (
        matchesSearch &&
        matchesProvider &&
        matchesOnboarding &&
        matchesPlan &&
        matchesStatus &&
        matchesHealth
      );
    });
  }, [health, onboarding, plan, provider, search, status, users]);

  const providers = Array.from(new Set(users.map((user) => user.authProvider))).filter(Boolean);
  const plans = Array.from(new Set(users.map((user) => user.plan))).filter(Boolean);

  const resetFilters = () => {
    setSearch("");
    setProvider("all");
    setOnboarding("all");
    setPlan("all");
    setStatus("active");
    setHealth("all");
  };

  return (
    <AdminPageShell
      title="Users"
      description="Review acquisition, onboarding, plan mix, and activity across the Measurable customer base."
    >
      {loading ? (
        <>
          <FiltersSkeleton />
          <TableSkeleton />
        </>
      ) : error ? (
        <section className="rounded-[24px] border border-red-200 bg-red-50/80 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-8">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </section>
      ) : (
        <>
          <section className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--measurable-blue)]">
                  Filters
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Narrow the user base by auth provider, onboarding state, plan, and account status.
                </p>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-10 items-center justify-center rounded-[14px] border border-[var(--border-soft)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition-all duration-150 ease-out hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
              >
                Reset filters
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or email"
                className="brand-input h-11 px-4"
              />
              <select className="brand-input h-11 px-4" value={provider} onChange={(event) => setProvider(event.target.value)}>
                <option value="all">All providers</option>
                {providers.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select className="brand-input h-11 px-4" value={onboarding} onChange={(event) => setOnboarding(event.target.value)}>
                <option value="all">All onboarding</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
              </select>
              <select className="brand-input h-11 px-4" value={plan} onChange={(event) => setPlan(event.target.value)}>
                <option value="all">All plans</option>
                {plans.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select className="brand-input h-11 px-4" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="active">Active only</option>
                <option value="deleted">Deleted only</option>
                <option value="all">Active + deleted</option>
              </select>
              <select className="brand-input h-11 px-4" value={health} onChange={(event) => setHealth(event.target.value)}>
                <option value="all">All health</option>
                <option value="healthy">Healthy</option>
                <option value="active">Active</option>
                <option value="at_risk">At risk</option>
                <option value="dormant">Dormant</option>
              </select>
            </div>
          </section>

          <section className="mt-4 rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--measurable-blue)]">
                  Directory
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                  {filteredUsers.length} users matched
                </h2>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                Customer records are shown read-only in this first admin release.
              </p>
            </div>

            <div className="overflow-x-auto rounded-[18px] border border-[var(--border-soft)]">
              <table className="min-w-[1480px] w-full border-separate border-spacing-0 text-left">
                <thead className="sticky top-0 z-10 bg-[var(--surface)]">
                  <tr>
                    {[
                      "Name",
                      "Email",
                      "Auth provider",
                      "Plan",
                      "Email verified",
                      "Onboarding",
                      "Reports",
                      "Reports (7d)",
                      "Health",
                      "Last report created",
                      "Last login",
                      "Created at",
                      "Status",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="border-b border-[var(--border-soft)] px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-[var(--surface)]">
                  {filteredUsers.map((user) => {
                    const rowClass =
                      user.healthStatus === "dormant"
                        ? "bg-slate-50/80"
                        : user.healthStatus === "at_risk"
                          ? "bg-amber-50/45"
                          : "";

                    return (
                    <tr key={user.id} className={`transition-colors duration-150 ease-out hover:bg-[var(--surface-soft)] ${rowClass}`}>
                      <td className="border-b border-[var(--border-soft)] px-4 py-4 last:border-b-0">
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{user.name}</p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">ID: {user.id}</p>
                        </div>
                      </td>
                      <td className="border-b border-[var(--border-soft)] px-4 py-4 text-sm text-[var(--text-secondary)]">{user.email}</td>
                      <td className="border-b border-[var(--border-soft)] px-4 py-4">
                        <StatusBadge tone="neutral" label={user.authProvider} />
                      </td>
                      <td className="border-b border-[var(--border-soft)] px-4 py-4">
                        <StatusBadge tone="neutral" label={user.plan} />
                      </td>
                      <td className="border-b border-[var(--border-soft)] px-4 py-4">
                        <StatusBadge tone={user.emailVerified ? "success" : "muted"} label={user.emailVerified ? "Verified" : "Unverified"} />
                      </td>
                      <td className="border-b border-[var(--border-soft)] px-4 py-4">
                        <StatusBadge tone={user.onboardingCompleted ? "success" : "muted"} label={user.onboardingCompleted ? "Completed" : "Pending"} />
                      </td>
                      <td className="border-b border-[var(--border-soft)] px-4 py-4">
                        <CountBadge
                          value={user.reportsCount}
                          tone={user.reportsCount >= 10 ? "positive" : user.reportsCount === 0 ? "warning" : "neutral"}
                        />
                      </td>
                      <td className="border-b border-[var(--border-soft)] px-4 py-4">
                        <CountBadge
                          value={user.reports7d}
                          tone={user.reports7d >= 3 ? "positive" : user.reports7d === 0 ? "warning" : "neutral"}
                        />
                      </td>
                      <td className="border-b border-[var(--border-soft)] px-4 py-4">
                        <HealthMeter user={user} />
                      </td>
                      <td className="border-b border-[var(--border-soft)] px-4 py-4">
                        <div className="text-sm text-[var(--text-secondary)]">
                          {user.lastReportCreated ? formatRelativeTime(user.lastReportCreated) : "Never"}
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                          {user.lastReportCreated ? formatDate(user.lastReportCreated) : "No reports yet"}
                        </div>
                      </td>
                      <td className="border-b border-[var(--border-soft)] px-4 py-4">
                        <div className="text-sm text-[var(--text-secondary)]">
                          {formatRelativeTime(user.lastLogin)}
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                          {user.lastLogin ? formatDate(user.lastLogin) : "No login recorded"}
                        </div>
                      </td>
                      <td className="border-b border-[var(--border-soft)] px-4 py-4 text-sm text-[var(--text-secondary)]">{formatDate(user.createdAt)}</td>
                      <td className="border-b border-[var(--border-soft)] px-4 py-4">
                        <StatusBadge tone={user.deleted ? "danger" : "success"} label={user.deleted ? "Deleted" : "Active"} />
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </AdminPageShell>
  );
}
