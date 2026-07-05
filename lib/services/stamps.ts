import { createAdminClient } from "@/lib/supabase/admin";
import { ServiceError, UUID_RE, type Reward } from "@/lib/types";
import { getSettings } from "@/lib/services/settings";
import {
  createReward,
  expireRewards,
  getActiveReward,
  getCycleStampCount,
} from "@/lib/services/rewards";
import { logAction } from "@/lib/services/audit";

export interface AddStampInput {
  customerId: string;
  employeeId: string;
  storeId: string;
  amount: number;
}

export interface AddStampResult {
  stampCount: number;
  stampsRequired: number;
  reward: Reward | null;
}

/**
 * Pridá pečiatku za nákup. Pravidlá:
 *  - suma musí dosiahnuť minimálnu hranicu z nastavení
 *  - pri aktívnej odmene sa pečiatky nepridávajú
 *  - po dosiahnutí potrebného počtu pečiatok automaticky vznikne odmena
 */
export async function addStamp(input: AddStampInput): Promise<AddStampResult> {
  if (!UUID_RE.test(input.customerId)) {
    throw new ServiceError("CUSTOMER_NOT_FOUND", "Zákazník sa nenašiel.", 404);
  }
  if (!UUID_RE.test(input.storeId)) {
    throw new ServiceError("STORE_NOT_FOUND", "Vyberte predajňu.", 400);
  }

  const settings = await getSettings();

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ServiceError("INVALID_AMOUNT", "Zadajte platnú sumu nákupu.");
  }
  if (amount < settings.min_purchase_amount) {
    throw new ServiceError(
      "AMOUNT_TOO_LOW",
      `Pečiatka sa udeľuje len za nákup od ${settings.min_purchase_amount.toFixed(2)} €.`
    );
  }

  const db = createAdminClient();

  // najprv expirácia, aby sme čítali aktuálny stav cyklu
  await expireRewards(input.customerId);

  const { data: customer } = await db
    .from("customers")
    .select("id, cycle_started_at")
    .eq("id", input.customerId)
    .maybeSingle();
  if (!customer) {
    throw new ServiceError("CUSTOMER_NOT_FOUND", "Zákazník sa nenašiel.", 404);
  }

  const activeReward = await getActiveReward(input.customerId);
  if (activeReward) {
    throw new ServiceError(
      "ACTIVE_REWARD",
      "Zákazník má aktívnu odmenu. Kým ju neuplatní, ďalšie pečiatky sa nepridávajú."
    );
  }

  const { data: store } = await db
    .from("stores")
    .select("id")
    .eq("id", input.storeId)
    .maybeSingle();
  if (!store) {
    throw new ServiceError("STORE_NOT_FOUND", "Predajňa sa nenašla.", 404);
  }

  const { data: stamp, error } = await db
    .from("stamps")
    .insert({
      customer_id: input.customerId,
      store_id: input.storeId,
      employee_id: input.employeeId,
      amount,
    })
    .select()
    .single();

  if (error || !stamp) {
    throw new ServiceError("STAMP_FAILED", "Pridanie pečiatky zlyhalo.", 500);
  }

  await logAction({
    employeeId: input.employeeId,
    action: "stamp.added",
    customerId: input.customerId,
    metadata: { stamp_id: stamp.id, store_id: input.storeId, amount },
  });

  const stampCount = await getCycleStampCount(
    input.customerId,
    customer.cycle_started_at
  );

  let reward: Reward | null = null;
  if (stampCount >= settings.stamps_required) {
    reward = await createReward(input.customerId, input.employeeId);
  }

  return { stampCount, stampsRequired: settings.stamps_required, reward };
}
