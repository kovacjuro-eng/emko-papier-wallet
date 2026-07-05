import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { UUID_RE, type Customer } from "@/lib/types";
import { checkRewardEligibility, getActiveReward } from "@/lib/services/rewards";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("sk-SK", { dateStyle: "medium" });

/**
 * Verejná vernostná karta zákazníka – bez prihlásenia.
 * Zákazník si ju uloží ako záložku alebo screenshot; QR obsahuje jeho ID.
 */
export default async function CardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const db = createAdminClient();
  const { data: customer } = await db
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!customer) notFound();

  const c = customer as Customer;
  const eligibility = await checkRewardEligibility(c.id);
  const activeReward = eligibility.hasActiveReward
    ? await getActiveReward(c.id)
    : null;

  const qrDataUrl = await QRCode.toDataURL(c.id, {
    width: 360,
    margin: 1,
    color: { dark: "#1c1917", light: "#ffffff" },
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-emerald-700 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-emerald-700">Emko Papier</h1>
          <p className="text-sm text-stone-500">Vernostná karta</p>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt="QR kód vernostnej karty"
          className="mx-auto mt-4 w-64 rounded-lg border border-stone-200"
        />

        <p className="mt-3 text-center text-lg font-semibold text-stone-800">
          {c.name}
        </p>

        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: eligibility.stampsRequired }, (_, i) => (
            <span
              key={i}
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm ${
                i < eligibility.stampCount
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-dashed border-stone-300 text-stone-300"
              }`}
            >
              ★
            </span>
          ))}
        </div>
        <p className="mt-2 text-center text-sm text-stone-500">
          {eligibility.stampCount} z {eligibility.stampsRequired} pečiatok
        </p>

        {activeReward && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-center">
            <p className="font-semibold text-emerald-800">
              🎁 Máte odmenu: zľava {Number(activeReward.discount_percent)} %
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              Platí do {dateFmt.format(new Date(activeReward.expires_at))} –
              ukážte kartu pri pokladni.
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-stone-400">
          Ukážte tento QR kód pri nákupe v ktorejkoľvek predajni Emko Papier.
        </p>
      </div>
    </main>
  );
}
