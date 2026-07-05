import Link from "next/link";
import CustomerSearch from "@/components/CustomerSearch";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Obsluha zákazníka</h1>
        <p className="mt-1 text-sm text-stone-500">
          Naskenujte QR kód zákazníka alebo ho vyhľadajte podľa mena či kontaktu.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/scan"
          className="card flex items-center gap-4 transition hover:border-emerald-300 hover:shadow"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-2xl">
            📷
          </span>
          <div>
            <p className="font-semibold">Skenovať QR kód</p>
            <p className="text-sm text-stone-500">Karta zákazníka cez kameru</p>
          </div>
        </Link>

        <Link
          href="/customers/new"
          className="card flex items-center gap-4 transition hover:border-emerald-300 hover:shadow"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-2xl">
            ➕
          </span>
          <div>
            <p className="font-semibold">Nový zákazník</p>
            <p className="text-sm text-stone-500">Registrácia do vernostného programu</p>
          </div>
        </Link>
      </div>

      <CustomerSearch />
    </div>
  );
}
