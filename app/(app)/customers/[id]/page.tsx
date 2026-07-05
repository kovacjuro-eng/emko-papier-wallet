import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerDetail } from "@/lib/services/customers";
import { listStores } from "@/lib/services/stores";
import { ServiceError } from "@/lib/types";
import StampProgress from "@/components/StampProgress";
import CustomerActions from "@/components/CustomerActions";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("sk-SK", {
  dateStyle: "medium",
  timeStyle: "short",
});

const statusLabels: Record<string, { label: string; className: string }> = {
  active: { label: "Aktívna", className: "bg-emerald-100 text-emerald-800" },
  used: { label: "Uplatnená", className: "bg-stone-200 text-stone-700" },
  expired: { label: "Expirovaná", className: "bg-red-100 text-red-700" },
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let detail;
  try {
    detail = await getCustomerDetail(id);
  } catch (e) {
    if (e instanceof ServiceError && e.status === 404) notFound();
    throw e;
  }
  const stores = await listStores();

  const { customer, stampCount, stampsRequired, activeReward, stamps, rewards } =
    detail;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {[customer.email, customer.phone].filter(Boolean).join(" · ") ||
              "Bez kontaktných údajov"}
          </p>
          <p className="text-xs text-stone-400">
            Registrovaný {dateFmt.format(new Date(customer.created_at))}
          </p>
        </div>
        <Link href={`/card/${customer.id}`} className="btn-secondary" target="_blank">
          Vernostná karta / QR
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card">
            <h2 className="mb-3 font-semibold">Pečiatky v aktuálnom cykle</h2>
            <StampProgress count={Math.min(stampCount, stampsRequired)} required={stampsRequired} />
          </div>

          {activeReward && (
            <div className="card border-emerald-300 bg-emerald-50">
              <h2 className="font-semibold text-emerald-900">🎁 Aktívna odmena</h2>
              <p className="mt-1 text-2xl font-bold text-emerald-700">
                Zľava {Number(activeReward.discount_percent)} %
              </p>
              <p className="mt-1 text-sm text-emerald-800">
                Platí do {dateFmt.format(new Date(activeReward.expires_at))}
              </p>
            </div>
          )}

          <div className="card">
            <h2 className="mb-3 font-semibold">História pečiatok</h2>
            {stamps.length === 0 ? (
              <p className="text-sm text-stone-500">Zatiaľ žiadne pečiatky.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-stone-500">
                      <th className="py-2 pr-4 font-medium">Dátum</th>
                      <th className="py-2 pr-4 font-medium">Predajňa</th>
                      <th className="py-2 pr-4 font-medium">Zamestnanec</th>
                      <th className="py-2 text-right font-medium">Suma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {stamps.map((s) => (
                      <tr key={s.id}>
                        <td className="py-2 pr-4">{dateFmt.format(new Date(s.created_at))}</td>
                        <td className="py-2 pr-4">{s.store_name ?? "–"}</td>
                        <td className="py-2 pr-4">{s.employee_name ?? "–"}</td>
                        <td className="py-2 text-right font-medium">
                          {s.amount.toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="mb-3 font-semibold">História odmien</h2>
            {rewards.length === 0 ? (
              <p className="text-sm text-stone-500">Zatiaľ žiadne odmeny.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {rewards.map((r) => {
                  const status = statusLabels[r.status] ?? statusLabels.expired;
                  return (
                    <li key={r.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium">
                          Zľava {Number(r.discount_percent)} %
                        </p>
                        <p className="text-xs text-stone-500">
                          Vytvorená {dateFmt.format(new Date(r.created_at))}
                          {r.used_at &&
                            ` · uplatnená ${dateFmt.format(new Date(r.used_at))}`}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div>
          <CustomerActions
            customerId={customer.id}
            stores={stores}
            hasActiveReward={activeReward !== null}
          />
        </div>
      </div>
    </div>
  );
}
