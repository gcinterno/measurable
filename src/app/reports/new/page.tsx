import { redirect } from "next/navigation";

type NewReportPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function toQueryString(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === "string" && value) {
      query.set(key, value);
      return;
    }

    if (Array.isArray(value)) {
      value.filter(Boolean).forEach((entry) => query.append(key, entry));
    }
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export default async function NewReportPage({
  searchParams,
}: NewReportPageProps) {
  const params = (await searchParams) || {};
  redirect(`/reports/new/flow${toQueryString(params)}`);
}
