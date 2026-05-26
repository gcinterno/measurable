import { PublicSharedReportView } from "@/components/reports/PublicSharedReportView";

type PublicSharedReportPageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams?: Promise<{
    export?: string;
  }>;
};

export default async function PublicSharedReportPage({
  params,
  searchParams,
}: PublicSharedReportPageProps) {
  const { token } = await params;
  const query = searchParams ? await searchParams : undefined;

  return <PublicSharedReportView token={token} exportMode={query?.export === "pdf"} />;
}
