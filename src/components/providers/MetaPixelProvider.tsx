"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { initMetaPixel, trackMetaEvent } from "@/lib/tracking/meta";

function shouldSkipPageView(pathname: string, searchParams: URLSearchParams) {
  if (pathname === "/integrations/meta/callback") {
    return true;
  }

  if (
    searchParams.has("error") ||
    searchParams.has("oauth_error") ||
    searchParams.has("meta_error")
  ) {
    return true;
  }

  return false;
}

export function MetaPixelProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedUrlRef = useRef("");

  useEffect(() => {
    initMetaPixel();
  }, []);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const currentSearch = searchParams.toString();
    const routeKey = currentSearch ? `${pathname}?${currentSearch}` : pathname;

    if (lastTrackedUrlRef.current === routeKey) {
      return;
    }

    lastTrackedUrlRef.current = routeKey;

    const params = new URLSearchParams(currentSearch);

    if (shouldSkipPageView(pathname, params)) {
      return;
    }

    void trackMetaEvent("PageView", {
      path: pathname,
      query: currentSearch || null,
    });
  }, [pathname, searchParams]);

  return null;
}
