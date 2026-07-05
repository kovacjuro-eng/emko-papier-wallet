"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function NewCustomerPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gdprConsent, setGdprConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email || null,
          phone: phone || null,
          gdpr_consent: gdprConsent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registrácia zlyhala.");
        setLoading(false);
        return;
      }
      router.push(`/customers/${data.customer.id}?created=1`);
    } catch {
      setError("Registrácia zlyhala. Skúste to znova.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nový zákazník</h1>
        <p className="mt-1 text-sm text-stone-500">
          Registrácia do vernostného programu Emko Papier.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label htmlFor="name" className="label">
            Meno a priezvisko *
          </label>
          <input
            id="name"
            type="text"
            required
            maxLength={200}
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="email" className="label">
            E-mail (nepovinné)
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="phone" className="label">
            Telefón (nepovinné)
          </label>
          <input
            id="phone"
            type="tel"
            maxLength={30}
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
          <input
            type="checkbox"
            required
            checked={gdprConsent}
            onChange={(e) => setGdprConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm text-stone-700">
            Zákazník súhlasí so spracovaním osobných údajov na účely vernostného
            programu Emko Papier (GDPR). *
          </span>
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Registrujem…" : "Zaregistrovať zákazníka"}
        </button>
      </form>
    </div>
  );
}
