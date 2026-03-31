import { AppShell } from "@/components/layout/AppShell";
import ReportView from "@/components/reports/ReportView";

type ReportDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const { id } = await params;
  return (
    <AppShell>
      <ReportView reportId={id} />
    </AppShell>
  );
}
