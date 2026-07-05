"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Reward, Store } from "@/lib/types";

interface CustomerActionsProps {
  customerId: string;
  stores: Store[];
  hasActiveReward: boolean;
}

const STORE_KEY = "emko.selectedStore";

export default function CustomerActions({
  customerId,
  stores,
  hasActiveReward,
}: CustomerActionsProps) {
  const router = useRouter();
  const [storeId, setStoreId] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // predajňa sa pamätá medzi zákazníkmi (rovnaké zariadenie = rovnaká predajňa)
  useEffect(() => {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved && stores.some((s) => s.id === saved)) {
      setStoreId(saved);
    } else if (stores.length > 0) {
      setStoreId(stores[0].id);
    }
  }, [stores]);

  function selectStore(id: string) {
    setStoreId(id);
    localStorage.setItem(STORE_KEY, id);
  }

  async function handleAddStamp(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          store_id: storeId,
          amount: Number(amount.replace(",", ".")),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Pridanie pečiatky zlyhalo." });
        return;
      }

      const reward = data.reward as Reward | null;
      setMessage({
        type: "ok",
        text: reward
          ? `🎉 Pečiatka pridaná a zákazník získal odmenu: zľava ${Number(reward.discount_percent)} %!`
          : `Pečiatka pridaná (${data.stampCount} / ${data.stampsRequired}).`,
      });
      setAmount("");
      router.refresh();
    } catch {
      setMessage({ type: "err", text: "Pridanie pečiatky zlyhalo. Skúste znova." });
    } finally {
      setLoading(false);
    }
  }

  async function handleRedeem() {
    if (!confirm("Uplatniť odmenu zákazníka? Pečiatky sa vynulujú.")) return;
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customerId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Uplatnenie odmeny zlyhalo." });
        return;
      }

      setMessage({
        type: "ok",
        text: `Odmena uplatnená: zľava ${Number(data.reward.discount_percent)} %. Nový zberný cyklus začal.`,
      });
      router.refresh();
    } catch {
      setMessage({ type: "err", text: "Uplatnenie odmeny zlyhalo. Skúste znova." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card space-y-4">
      <h2 className="font-semibold">Akcie</h2>

      {hasActiveReward ? (
        <div className="space-y-3">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Zákazník má aktívnu odmenu – kým ju neuplatní, pečiatky sa nepridávajú.
          </p>
          <button onClick={handleRedeem} disabled={loading} className="btn-primary w-full">
            {loading ? "Uplatňujem…" : "✓ Uplatniť odmenu"}
          </button>
        </div>
      ) : (
        <form onSubmit={handleAddStamp} className="space-y-3">
          <div>
            <label htmlFor="store" className="label">
              Predajňa
            </label>
            <select
              id="store"
              required
              className="input"
              value={storeId}
              onChange={(e) => selectStore(e.target.value)}
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="amount" className="label">
              Suma nákupu (€)
            </label>
            <input
              id="amount"
              type="text"
              inputMode="decimal"
              required
              className="input"
              placeholder="napr. 12,50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading || !storeId} className="btn-primary w-full">
            {loading ? "Pridávam…" : "＋ Pridať pečiatku"}
          </button>
        </form>
      )}

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
    </div>
  );
}
