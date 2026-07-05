import { getAdminStats } from "@/lib/services/stats";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("sk-SK", {
  dateStyle: "short",
  timeStyle: "short",
});

const actionLabels: Record<string, string> = {
  "stamp.added": "Pridaná pečiatka",
  "reward.created": "Vytvorená odmena",
  "reward.redeemed": "Uplatnená odmena",
  "reward.expired": "Odmena expirovala",
  "customer.created": "Nový zákazník",
  "customer.gdpr_export": "GDPR export",
  "customer.gdpr_deleted": "GDPR zmazanie",
  "settings.updated": "Zmena nastavení",
  "employee.created": "Nový zamestnanec",
  "employee.deleted": "Zmazaný zamestnanec",
  "export.generated": "Export dát",
};

export default async function AdminOverviewPage() {
  const stats = await getAdminStats();

  const cards = [
    { label: "Zákazníci", value: stats.totalCustomers },
    { label: "Pečiatky celkom", value: stats.totalStamps },
    { label: "Pečiatky za 30 dní", value: stats.stampsLast30Days },
    { label: "Aktívne odmeny", value: stats.activeRewards },
    { label: "Uplatnené odmeny", value: stats.usedRewards },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <p className="text-sm text-stone-500">{c.label}</p>
            <p className="mt-1 text-3xl font-bold text-emerald-700">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Pečiatky podľa predajní</h2>
          <ul className="divide-y divide-stone-100">
            {stats.storeStats.map((s) => (
              <li key={s.storeId} className="flex items-center justify-between py-2">
                <span className="text-sm">{s.storeName}</span>
                <span className="font-semibold">{s.stampCount}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Export dát</h2>
          <p className="mb-3 text-sm text-stone-500">
            Stiahnite si dáta pre účtovníctvo alebo analýzu.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a href="/api/admin/export?entity=customers&format=csv" className="btn-secondary">
              Zákazníci CSV
            </a>
            <a href="/api/admin/export?entity=customers&format=xlsx" className="btn-secondary">
              Zákazníci XLSX
            </a>
            <a href="/api/admin/export?entity=stamps&format=csv" className="btn-secondary">
              Pečiatky CSV
            </a>
            <a href="/api/admin/export?entity=stamps&format=xlsx" className="btn-secondary">
              Pečiatky XLSX
            </a>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Posledná aktivita (audit log)</h2>
        {stats.recentAuditLogs.length === 0 ? (
          <p className="text-sm text-stone-500">Zatiaľ žiadna aktivita.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-stone-500">
                  <th className="py-2 pr-4 font-medium">Čas</th>
                  <th className="py-2 pr-4 font-medium">Akcia</th>
                  <th className="py-2 pr-4 font-medium">Zamestnanec</th>
                  <th className="py-2 font-medium">Zákazník</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {stats.recentAuditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap py-2 pr-4">
                      {dateFmt.format(new Date(log.timestamp))}
                    </td>
                    <td className="py-2 pr-4">
                      {actionLabels[log.action] ?? log.action}
                    </td>
                    <td className="py-2 pr-4">{log.employee_name ?? "systém"}</td>
                    <td className="py-2 font-mono text-xs text-stone-500">
                      {log.customer_id ? log.customer_id.slice(0, 8) + "…" : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
