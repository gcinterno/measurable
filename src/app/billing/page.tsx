import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";

const paymentHistory = [
  {
    id: "INV-2026-003",
    date: "23 Mar 2026",
    amount: "USD 25.00",
    status: "Pagado",
    plan: "Core",
  },
  {
    id: "INV-2026-002",
    date: "23 Feb 2026",
    amount: "USD 25.00",
    status: "Pagado",
    plan: "Core",
  },
  {
    id: "INV-2026-001",
    date: "23 Ene 2026",
    amount: "USD 25.00",
    status: "Pagado",
    plan: "Core",
  },
] as const;

const paymentMethods = [
  {
    brand: "Visa",
    last4: "4242",
    expiry: "09/28",
    primary: true,
  },
  {
    brand: "Mastercard",
    last4: "5510",
    expiry: "01/29",
    primary: false,
  },
] as const;

export default function BillingPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
            Billing
          </p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Gestiona tu suscripcion y tu facturacion
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Consulta tu estado actual, revisa pagos anteriores, actualiza el metodo de cobro y decide si quieres cambiar o cancelar la membresia.
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Membresia actual
              </p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold text-slate-950">Core</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Renovacion automatica el 23 Abr 2026
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                  Activa
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Proximo cobro
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    USD 25.00
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Metodo principal
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    Visa 4242
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                  Payment history
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                  Historial de pagos
                </h3>
              </div>
              <button
                type="button"
                className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Descargar invoices
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {paymentHistory.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {payment.id}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {payment.date} · {payment.plan}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                      {payment.status}
                    </span>
                    <p className="text-sm font-semibold text-slate-950">
                      {payment.amount}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                Payment methods
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                Metodos de pago
              </h3>

              <div className="mt-6 space-y-3">
                {paymentMethods.map((method) => (
                  <div
                    key={`${method.brand}-${method.last4}`}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {method.brand} terminada en {method.last4}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Expira {method.expiry}
                        </p>
                      </div>
                      {method.primary ? (
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
                          Principal
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Agregar metodo de pago
                </button>
                <button
                  type="button"
                  className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Actualizar metodo principal
                </button>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                Membership actions
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                Acciones de membresia
              </h3>
              <div className="mt-6 grid gap-3">
                <Link
                  href="/plans"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Actualizar membresia
                </Link>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                >
                  Pausar renovacion automatica
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Cancelar membresia
                </button>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-500">
                Estos controles pueden conectarse despues con tu proveedor de pagos o portal de billing real.
              </p>
            </section>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
