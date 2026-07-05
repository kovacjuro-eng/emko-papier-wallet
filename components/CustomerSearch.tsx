"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Customer } from "@/lib/types";

export default function CustomerSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.customers ?? []);
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="card">
      <label htmlFor="search" className="label">
        Vyhľadať zákazníka
      </label>
      <input
        id="search"
        type="search"
        className="input"
        placeholder="Meno, e-mail, telefón alebo ID z QR kódu…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />

      {loading && <p className="mt-3 text-sm text-stone-500">Hľadám…</p>}

      {!loading && searched && results.length === 0 && (
        <p className="mt-3 text-sm text-stone-500">
          Žiadny zákazník sa nenašiel.{" "}
          <Link href="/customers/new" className="font-medium text-emerald-700 hover:underline">
            Zaregistrovať nového
          </Link>
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-3 divide-y divide-stone-100 overflow-hidden rounded-lg border border-stone-200">
          {results.map((c) => (
            <li key={c.id}>
              <Link
                href={`/customers/${c.id}`}
                className="flex items-center justify-between px-4 py-3 transition hover:bg-emerald-50"
              >
                <div>
                  <p className="font-medium text-stone-900">{c.name}</p>
                  <p className="text-sm text-stone-500">
                    {[c.email, c.phone].filter(Boolean).join(" · ") || "bez kontaktu"}
                  </p>
                </div>
                <span className="text-sm font-medium text-emerald-700">Otvoriť →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
