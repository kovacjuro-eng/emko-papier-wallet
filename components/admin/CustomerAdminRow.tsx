"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Customer } from "@/lib/types";

export default function CustomerAdminRow({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `Naozaj zmazať zákazníka „${customer.name}" vrátane všetkých pečiatok a odmien? Táto akcia je nevratná (GDPR zmazanie).`
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Zmazanie zlyhalo.");
        return;
      }
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <tr>
      <td className="py-2 pr-4">
        <Link
          href={`/customers/${customer.id}`}
          className="font-medium text-emerald-700 hover:underline"
        >
          {customer.name}
        </Link>
      </td>
      <td className="py-2 pr-4 text-stone-600">{customer.email ?? "–"}</td>
      <td className="py-2 pr-4 text-stone-600">{customer.phone ?? "–"}</td>
      <td className="py-2 pr-4">
        <div className="flex flex-wrap justify-end gap-2">
          <a
            href={`/api/customers/${customer.id}/export`}
            className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
          >
            GDPR export
          </a>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? "Mažem…" : "Zmazať"}
          </button>
        </div>
      </td>
    </tr>
  );
}
