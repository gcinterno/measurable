import { apiFetch } from "@/lib/api";

export type AdminMetrics = {
  totalUsers: number;
  usersInPeriod: number;
  activeUsersInPeriod: number;
  reportsGenerated: number;
  reportsInPeriod: number;
  onboardingCompletedInPeriod: number;
  onboardingCompletionRate: number;
  freeUsers: number;
  paidUsers: number;
  mrr: number;
  dailyUsers: AdminMetricsSeriesPoint[];
  dailyReports: AdminMetricsSeriesPoint[];
  cumulativeUsers: AdminMetricsSeriesPoint[];
  growth: Partial<Record<AdminMetricGrowthKey, number | null>>;
  insights: AdminOverviewInsight[];
  funnel: AdminFunnelStep[];
  cohorts: AdminCohortRow[];
};

export type AdminMetricsTimeframe = "all" | "this_month" | "last_month" | "custom";

type FetchAdminMetricsInput = {
  timeframe?: AdminMetricsTimeframe;
  startDate?: string;
  endDate?: string;
};

export type AdminMetricsSeriesPoint = {
  label: string;
  value: number;
};

export type AdminMetricGrowthKey =
  | "totalUsers"
  | "usersInPeriod"
  | "activeUsersInPeriod"
  | "reportsGenerated"
  | "reportsInPeriod"
  | "onboardingCompletedInPeriod"
  | "onboardingCompletionRate"
  | "freeUsers"
  | "paidUsers"
  | "mrr";

export type AdminOverviewInsightSeverity =
  | "positive"
  | "warning"
  | "critical"
  | "neutral";

export type AdminOverviewInsight = {
  id: string;
  title: string;
  message: string;
  severity: AdminOverviewInsightSeverity;
};

export type AdminFunnelStep = {
  id: string;
  label: string;
  value: number;
};

export type AdminCohortRow = {
  id: string;
  label: string;
  cohortSize: number;
  day0: number;
  day1: number;
  day3: number;
  day7: number;
  day14: number;
  day30: number;
  retainedDay1: number;
  retainedDay3: number;
  retainedDay7: number;
  retainedDay14: number;
  retainedDay30: number;
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  authProvider: string;
  plan: string;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  reportsCount: number;
  reports7d: number;
  lastReportCreated: string;
  lastLogin: string;
  createdAt: string;
  status: string;
  deleted: boolean;
  healthScore: number;
  healthStatus: "healthy" | "active" | "at_risk" | "dormant";
  healthReasons: string[];
};

export type AdminInsights = {
  onboarding: {
    userTypes: Array<{ label: string; value: number }>;
    goals: Array<{ label: string; value: number }>;
    platforms: Array<{ label: string; value: number }>;
    completed: number;
    pending: number;
    completionRate: number;
  };
  accountDeletion: {
    totalDeletions: number;
    deletionsLast7Days: number;
    reasons: Array<{ label: string; value: number }>;
    recentFeedback: Array<{
      email: string;
      reason: string;
      details: string;
      createdAt: string;
    }>;
  };
};

function getNumber(value: unknown) {
  return typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value) || 0
      : 0;
}

function getOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getBoolean(value: unknown) {
  return Boolean(value);
}

function getArray<T = Record<string, unknown>>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeDistribution(value: unknown) {
  return getArray<Record<string, unknown>>(value).map((item) => ({
    label: getString(item.label || item.name || item.key || item.value, "Unknown"),
    value: getNumber(item.value || item.count || item.total),
  }));
}

function normalizeSeries(value: unknown) {
  return getArray<Record<string, unknown>>(value)
    .map((item) => ({
      label: getString(item.label || item.date || item.day || item.x, ""),
      value: getNumber(
        item.value ||
          item.count ||
          item.total ||
          item.users ||
          item.reports ||
          item.cumulative ||
          item.y
      ),
    }))
    .filter((item) => item.label);
}

function normalizeInsights(value: unknown) {
  return getArray<Record<string, unknown>>(value).map((item, index) => ({
    id: getString(item.id, `insight-${index}`),
    title: getString(item.title || item.label || item.category, "Insight"),
    message: getString(item.message || item.text || item.description, ""),
    severity: (() => {
      const raw = getString(item.severity, "neutral").toLowerCase();
      if (
        raw === "positive" ||
        raw === "warning" ||
        raw === "critical" ||
        raw === "neutral"
      ) {
        return raw;
      }

      return "neutral";
    })(),
  }));
}

function normalizeFunnel(value: unknown) {
  return getArray<Record<string, unknown>>(value).map((item, index) => ({
    id: getString(item.id || item.key, `step-${index}`),
    label: getString(item.label || item.name || item.step, `Step ${index + 1}`),
    value: getNumber(item.value || item.count || item.total || item.users),
  }));
}

function normalizeCohorts(value: unknown) {
  return getArray<Record<string, unknown>>(value).map((item, index) => {
    const cohortSize = getNumber(item.cohort_size || item.cohortSize || item.day_0_users || item.day0Users);

    return {
      id: getString(item.id || item.date || item.label, `cohort-${index}`),
      label: getString(item.label || item.date || item.signup_date || item.signupDate, `Cohort ${index + 1}`),
      cohortSize,
      day0: getNumber(item.day_0 || item.day0 || 100),
      day1: getNumber(item.day_1 || item.day1),
      day3: getNumber(item.day_3 || item.day3),
      day7: getNumber(item.day_7 || item.day7),
      day14: getNumber(item.day_14 || item.day14),
      day30: getNumber(item.day_30 || item.day30),
      retainedDay1: getNumber(item.retained_day_1 || item.retainedDay1 || item.day_1_users || item.day1Users),
      retainedDay3: getNumber(item.retained_day_3 || item.retainedDay3 || item.day_3_users || item.day3Users),
      retainedDay7: getNumber(item.retained_day_7 || item.retainedDay7 || item.day_7_users || item.day7Users),
      retainedDay14: getNumber(item.retained_day_14 || item.retainedDay14 || item.day_14_users || item.day14Users),
      retainedDay30: getNumber(item.retained_day_30 || item.retainedDay30 || item.day_30_users || item.day30Users),
    };
  });
}

export async function fetchAdminMetrics(input: FetchAdminMetricsInput = {}) {
  const params = new URLSearchParams();

  if (input.timeframe) {
    params.set("timeframe", input.timeframe);
  }

  if (input.timeframe === "custom") {
    if (input.startDate) {
      params.set("start_date", input.startDate);
    }

    if (input.endDate) {
      params.set("end_date", input.endDate);
    }
  }

  const query = params.toString();
  const payload = await apiFetch<Record<string, unknown>>(
    query ? `/admin/metrics?${query}` : "/admin/metrics"
  );
  const source =
    (payload.data as Record<string, unknown> | undefined) || payload;
  const growthSource =
    (source.growth as Record<string, unknown> | undefined) || source;

  return {
    totalUsers: getNumber(source.total_users || source.totalUsers),
    usersInPeriod: getNumber(
      source.users_in_period ||
        source.new_users_in_period ||
        source.new_users ||
        source.new_users_last_7_days ||
        source.newUsersInPeriod ||
        source.newUsersLast7Days
    ),
    activeUsersInPeriod: getNumber(
      source.active_users_in_period ||
        source.active_users ||
        source.active_users_last_7_days ||
        source.activeUsersInPeriod ||
        source.activeUsersLast7Days
    ),
    reportsGenerated: getNumber(source.reports_generated || source.reportsGenerated),
    reportsInPeriod: getNumber(
      source.reports_in_period ||
        source.reports_last_7_days ||
        source.reportsInPeriod ||
        source.reportsLast7Days
    ),
    onboardingCompletedInPeriod: getNumber(
      source.onboarding_completed_in_period ||
        source.onboarding_completed ||
        source.onboardingCompletedInPeriod
    ),
    onboardingCompletionRate: getNumber(source.onboarding_completion_rate || source.onboardingCompletionRate),
    freeUsers: getNumber(source.free_users || source.freeUsers),
    paidUsers: getNumber(source.paid_users || source.paidUsers),
    mrr: getNumber(source.mrr || source.monthly_recurring_revenue),
    dailyUsers: normalizeSeries(source.daily_users || source.dailyUsers),
    dailyReports: normalizeSeries(source.daily_reports || source.dailyReports),
    cumulativeUsers: normalizeSeries(
      source.cumulative_users || source.cumulativeUsers
    ),
    growth: {
      totalUsers: getOptionalNumber(
        growthSource.total_users_growth || growthSource.totalUsersGrowth
      ),
      usersInPeriod: getOptionalNumber(
        growthSource.users_in_period_growth ||
          growthSource.new_users_growth ||
          growthSource.usersInPeriodGrowth
      ),
      activeUsersInPeriod: getOptionalNumber(
        growthSource.active_users_in_period_growth ||
          growthSource.active_users_growth ||
          growthSource.activeUsersInPeriodGrowth
      ),
      reportsGenerated: getOptionalNumber(
        growthSource.reports_generated_growth ||
          growthSource.reportsGeneratedGrowth
      ),
      reportsInPeriod: getOptionalNumber(
        growthSource.reports_in_period_growth ||
          growthSource.reports_growth ||
          growthSource.reportsInPeriodGrowth
      ),
      onboardingCompletedInPeriod: getOptionalNumber(
        growthSource.onboarding_completed_in_period_growth ||
          growthSource.onboarding_completed_growth ||
          growthSource.onboardingCompletedInPeriodGrowth
      ),
      onboardingCompletionRate: getOptionalNumber(
        growthSource.onboarding_completion_rate_growth ||
          growthSource.onboardingCompletionRateGrowth
      ),
      freeUsers: getOptionalNumber(
        growthSource.free_users_growth || growthSource.freeUsersGrowth
      ),
      paidUsers: getOptionalNumber(
        growthSource.paid_users_growth || growthSource.paidUsersGrowth
      ),
      mrr: getOptionalNumber(growthSource.mrr_growth || growthSource.mrrGrowth),
    },
    insights: normalizeInsights(source.insights),
    funnel: normalizeFunnel(
      source.funnel ||
        source.funnel_steps ||
        source.funnelSteps
    ),
    cohorts: normalizeCohorts(
      source.cohorts ||
        source.cohort_retention ||
        source.cohortRetention
    ),
  } satisfies AdminMetrics;
}

export async function fetchAdminUsers() {
  const payload = await apiFetch<Record<string, unknown> | Array<Record<string, unknown>>>(
    "/admin/users"
  );
  const list = Array.isArray(payload)
    ? payload
    : getArray<Record<string, unknown>>(payload.data || payload.users || payload.items);

  return list.map((item) => ({
    id: getString(item.id, crypto.randomUUID?.() || "user"),
    name: getString(item.name || item.full_name, "Unknown"),
    email: getString(item.email),
    authProvider: getString(item.auth_provider || item.authProvider, "email"),
    plan: getString(item.plan || item.plan_name, "free"),
    emailVerified: getBoolean(item.email_verified ?? item.emailVerified),
    onboardingCompleted: getBoolean(
      item.onboarding_completed ?? item.onboardingCompleted
    ),
    reportsCount: getNumber(item.reports_count || item.reportsCount),
    reports7d: getNumber(item.reports_7d || item.reportsLast7Days || item.reports_last_7_days),
    lastReportCreated: getString(item.last_report_created || item.lastReportCreated),
    lastLogin: getString(item.last_login || item.lastLogin),
    createdAt: getString(item.created_at || item.createdAt),
    status: getString(item.status, getBoolean(item.deleted) ? "deleted" : "active"),
    deleted: getBoolean(item.deleted || item.is_deleted),
    healthScore: getNumber(item.health_score || item.healthScore),
    healthStatus: (() => {
      const raw = getString(item.health_status || item.healthStatus, "").toLowerCase();
      if (raw === "healthy" || raw === "active" || raw === "at_risk" || raw === "dormant") {
        return raw;
      }

      const derivedScore = getNumber(item.health_score || item.healthScore);
      if (derivedScore >= 80) {
        return "healthy";
      }
      if (derivedScore >= 55) {
        return "active";
      }
      if (derivedScore >= 25) {
        return "at_risk";
      }
      return "dormant";
    })(),
    healthReasons: getArray<string>(
      item.health_reasons || item.healthReasons
    ).map((reason) => String(reason)),
  })) satisfies AdminUserRow[];
}

export async function fetchAdminInsights() {
  const payload = await apiFetch<Record<string, unknown>>("/admin/insights");
  const source =
    (payload.data as Record<string, unknown> | undefined) || payload;
  const onboarding =
    (source.onboarding as Record<string, unknown> | undefined) || source;
  const deletions =
    (source.account_deletion as Record<string, unknown> | undefined) ||
    (source.accountDeletion as Record<string, unknown> | undefined) ||
    {};

  return {
    onboarding: {
      userTypes: normalizeDistribution(
        onboarding.user_type_distribution || onboarding.userTypes
      ),
      goals: normalizeDistribution(
        onboarding.goals_distribution || onboarding.goals
      ),
      platforms: normalizeDistribution(
        onboarding.platforms_distribution || onboarding.platforms
      ),
      completed: getNumber(onboarding.completed),
      pending: getNumber(onboarding.pending),
      completionRate: getNumber(
        onboarding.completion_rate || onboarding.completionRate
      ),
    },
    accountDeletion: {
      totalDeletions: getNumber(
        deletions.total_deletions || deletions.totalDeletions
      ),
      deletionsLast7Days: getNumber(
        deletions.deletions_last_7_days || deletions.deletionsLast7Days
      ),
      reasons: normalizeDistribution(
        deletions.reasons_distribution || deletions.reasons
      ),
      recentFeedback: getArray<Record<string, unknown>>(
        deletions.recent_feedback || deletions.recentFeedback
      ).map((item) => ({
        email: getString(item.email),
        reason: getString(item.reason),
        details: getString(item.details),
        createdAt: getString(item.created_at || item.createdAt),
      })),
    },
  } satisfies AdminInsights;
}
