"use client";

import { useEffect, useState } from "react";

import { fetchCurrentUser } from "@/lib/api/me";
import { useAuthStore } from "@/lib/store/auth-store";

type AdminGuardProps = {
  children: React.ReactNode;
};

export function AdminGuard({ children }: AdminGuardProps) {
  const setUser = useAuthStore((state) => state.setUser);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    let active = true;

    async function resolveAccess() {
      try {
        const currentUser = await fetchCurrentUser();

        if (!active) {
          return;
        }

        if (process.env.NODE_ENV !== "production") {
          console.info("AUTH_ME_DEBUG", {
            scope: "AdminGuard",
            email: currentUser.email,
            isAdmin: currentUser.isAdmin,
            role: currentUser.role || null,
          });
        }

        setUser(currentUser);
        setHasAccess(Boolean(currentUser.isAdmin));
      } catch {
        if (!active) {
          return;
        }

        setHasAccess(false);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void resolveAccess();

    return () => {
      active = false;
    };
  }, [setUser]);

  if (loading) {
    return (
      <section className="brand-card p-6 sm:p-8">
        <div className="h-6 w-40 animate-pulse rounded-full bg-[var(--surface-soft)]" />
        <div className="mt-4 h-24 animate-pulse rounded-[16px] bg-[var(--surface-soft)]" />
      </section>
    );
  }

  if (!hasAccess) {
    return (
      <section className="brand-card p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--measurable-blue)]">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
          You do not have access to this page
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
          This area is available only to Measurable administrators.
        </p>
      </section>
    );
  }

  return <>{children}</>;
}
