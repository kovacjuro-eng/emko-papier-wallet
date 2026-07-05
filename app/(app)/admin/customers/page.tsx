import { listCustomers } from "@/lib/services/customers";
import CustomerAdminRow from "@/components/admin/CustomerAdminRow";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const customers = await listCustomers(q);

  return (
    <div className="space-y-4">
      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Hľadať podľa mena, e-mailu alebo telefónu…"
          className="input max-w-md"
        />
        <button type="submit" className="btn-secondary shrink-0">
          Hľadať
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-500">
              <th className="py-2 pr-4 font-medium">Meno</th>
              <th className="py-2 pr-4 font-medium">E-mail</th>
              <th className="py-2 pr-4 font-medium">Telefón</th>
              <th className="py-2 pr-4 text-right font-medium">Akcie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {customers.map((c) => (
              <CustomerAdminRow key={c.id} customer={c} />
            ))}
          </tbody>
        </table>
        {customers.length === 0 && (
          <p className="py-4 text-sm text-stone-500">Žiadni zákazníci.</p>
        )}
      </div>
    </div>
  );
}
