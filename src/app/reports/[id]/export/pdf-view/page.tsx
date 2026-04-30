import { cookies, headers } from "next/headers";

import { ReportPdfView } from "@/components/reports/ReportPdfView";

type ReportPdfExportPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    token?: string;
    authToken?: string;
  }>;
};

export default async function ReportPdfExportPage({
  params,
  searchParams,
}: ReportPdfExportPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const requestHeaders = await headers();
  const requestCookies = await cookies();
  const exportAuthToken =
    query.token ||
    query.authToken ||
    requestHeaders.get("x-export-auth-token") ||
    requestHeaders.get("x-export-auth") ||
    requestCookies.get("export_auth_token")?.value ||
    requestCookies.get("report_export_token")?.value ||
    undefined;

  return <ReportPdfView reportId={id} exportAuthToken={exportAuthToken} />;
}
