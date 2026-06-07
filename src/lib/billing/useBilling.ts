"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createCheckoutSession,
  createPortalSession,
  fetchBillingSummary,
  type BillingSummary,
  type CheckoutSessionResult,
} from "@/lib/api/billing";
import {
  getBillingPlanDefinition,
  type BillingPlanCode,
  normalizeBillingPlanCode,
} from "@/lib/billing/plans";
import { trackEvent } from "@/lib/analytics";

function parsePlanValue(price: string) {
  const numericPrice = Number(price.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numericPrice) ? numericPrice : 0;
}

export function useBilling() {
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"success" | "info">("success");
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setNotice("");
      const summary = await fetchBillingSummary();
      setBilling(summary);
      return summary;
    } catch (loadError) {
      console.error("billing summary load error:", loadError);
      setError("We could not load billing information right now.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startCheckout = useCallback(async (planCode: BillingPlanCode) => {
    try {
      setCheckoutLoadingPlan(planCode);
      setError("");
      setNotice("");
      const result = await createCheckoutSession(normalizeBillingPlanCode(planCode));

      if (result.mode === "checkout") {
        if (!result.checkoutUrl) {
          throw new Error("Checkout URL missing");
        }

        const planDefinition = getBillingPlanDefinition(result.planCode);
        trackEvent("begin_checkout", {
          billing_plan: result.planCode,
          billing_cycle: "monthly",
          value: parsePlanValue(planDefinition.price),
          currency: "USD",
        });
        window.location.assign(result.checkoutUrl);
        return result;
      }

      await refresh();

      if (result.mode === "updated") {
        setNoticeTone("success");
        setNotice("Your plan has been updated.");
        return result;
      }

      if (result.mode === "already_on_plan") {
        setNoticeTone("info");
        setNotice("You're already on this plan.");
        return result;
      }

      return result satisfies CheckoutSessionResult;
    } catch (checkoutError) {
      console.error("billing checkout start error:", checkoutError);
      setError("We could not start checkout right now.");
      return null;
    } finally {
      setCheckoutLoadingPlan("");
    }
  }, [refresh]);

  const openPortal = useCallback(async () => {
    try {
      setPortalLoading(true);
      setError("");
      setNotice("");
      const portalUrl = await createPortalSession();

      if (!portalUrl) {
        throw new Error("Portal URL missing");
      }

      window.location.assign(portalUrl);
    } catch (portalError) {
      console.error("billing portal open error:", portalError);
      setError("We could not open the billing portal right now.");
    } finally {
      setPortalLoading(false);
    }
  }, []);

  return {
    billing,
    loading,
    error,
    notice,
    noticeTone,
    refresh,
    startCheckout,
    checkoutLoadingPlan,
    openPortal,
    portalLoading,
  };
}
