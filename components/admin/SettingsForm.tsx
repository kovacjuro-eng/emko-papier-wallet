"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Settings } from "@/lib/types";

export default function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [minAmount, setMinAmount] = useState(String(settings.min_purchase_amount));
  const [stampsRequired, setStampsRequired] = useState(String(settings.stamps_required));
  const [discount, setDiscount] = useState(String(settings.discount_percent));
  const [validityDays, setValidityDays] = useState(String(settings.reward_validity_days));
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          min_purchase_amount: Number(minAmount.replace(",", ".")),
          stamps_required: Number(stampsRequired),
          discount_percent: Number(discount.replace(",", ".")),
          reward_validity_days: Number(validityDays),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Uloženie zlyhalo." });
        return;
      }
      setMessage({ type: "ok", text: "Nastavenia boli uložené." });
      router.refresh();
    } catch {
      setMessage({ type: "err", text: "Uloženie zlyhalo. Skúste znova." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-xl space-y-4">
      <h2 className="font-semibold">Pravidlá vernostného programu</h2>

      <div>
        <label htmlFor="min-amount" className="label">
          Minimálna suma nákupu pre pečiatku (€)
        </label>
        <input
          id="min-amount"
          type="text"
          inputMode="decimal"
          required
          className="input"
          value={minAmount}
          onChange={(e) => setMinAmount(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="stamps-required" className="label">
          Počet pečiatok potrebných na odmenu
        </label>
        <input
          id="stamps-required"
          type="number"
          min={1}
          max={50}
          required
          className="input"
          value={stampsRequired}
          onChange={(e) => setStampsRequired(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="discount" className="label">
          Zľava odmeny (%)
        </label>
        <input
          id="discount"
          type="text"
          inputMode="decimal"
          required
          className="input"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="validity" className="label">
          Platnosť odmeny (dni)
        </label>
        <input
          id="validity"
          type="number"
          min={1}
          max={730}
          required
          className="input"
          value={validityDays}
          onChange={(e) => setValidityDays(e.target.value)}
        />
      </div>

      {message && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.type === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Ukladám…" : "Uložiť nastavenia"}
      </button>

      <p className="text-xs text-stone-400">
        Zmeny platia pre nové pečiatky a odmeny; už vytvorené odmeny sa nemenia.
      </p>
    </form>
  );
}
