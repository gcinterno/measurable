"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { isAuthenticated } from "@/lib/auth/session";

type AuthGuardProps = {
  requireAuth: boolean;
  redirectTo: string;
  children: React.ReactNode;
};

export function AuthGuard({
  requireAuth,
  redirectTo,
  children,
}: AuthGuardProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const authenticated = isAuthenticated();

    if (requireAuth && !authenticated) {
      router.replace(redirectTo);
      return;
    }

    if (!requireAuth && authenticated) {
      router.replace(redirectTo);
      return;
    }

    setReady(true);
  }, [redirectTo, requireAuth, router]);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}
