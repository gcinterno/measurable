import { redirect } from "next/navigation";

import { buildGoogleOauthBackendUrl } from "@/lib/auth/google-oauth";

type GoogleStartPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function GoogleStartPage({ searchParams }: GoogleStartPageProps) {
  redirect(buildGoogleOauthBackendUrl("/auth/google/start", searchParams));
}
