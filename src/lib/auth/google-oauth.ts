import { apiUrl } from "@/lib/api/config";

type GoogleOauthSearchParams = Record<
  string,
  string | string[] | undefined
>;

function appendSearchParams(
  target: URL,
  searchParams: GoogleOauthSearchParams | undefined
) {
  if (!searchParams) {
    return;
  }

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      target.searchParams.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        target.searchParams.append(key, item);
      }
    }
  }
}

export function buildGoogleOauthBackendUrl(
  path: "/auth/google/start",
  searchParams?: GoogleOauthSearchParams
) {
  const target = new URL(apiUrl(path));
  appendSearchParams(target, searchParams);
  return target.toString();
}
