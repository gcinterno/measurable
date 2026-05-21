"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { captureAttributionFromCurrentUrl } from "@/lib/attribution";

export function AttributionTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    captureAttributionFromCurrentUrl();
  }, [pathname, search]);

  return null;
}
