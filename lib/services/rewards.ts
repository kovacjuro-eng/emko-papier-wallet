import { createAdminClient } from "@/lib/supabase/admin";
import { ServiceError, UUID_RE, type Reward } from "@/lib/types";
import { getSettings } from "@/lib/services/settings";
import { logAction } from "@/lib/services/audit";

/**
 * Označí expirované aktívne odmeny zákazníka a pri expirácii resetuje cyklus
 * (zákazník začína zbierať pečiatky odznova). Vráti true, ak niečo expirovalo.
 */
export async function expireRewards(customerId: string): Promise<boolean> {
  const db = createAdminClient();
  const { data } = await db
    .from("rewards")
    .update({ status: "expired" })
    .eq("customer_id", customerId)
    .eq("status", "active")
    .lt("expires_at", new Date().toISOString())
    .select("id");

  if (data && data.length > 0) {
    await resetCustomerCycle(customerId);
    await logAction({
      employeeId: null,
      action: "reward.expired",
      customerId,
      metadata: { reward_ids: data.map((r) => r.id) },
    });
    return true;
  }
  return false;
}

/** Aktívna (neexpirovaná) odmena zákazníka alebo null. */
export async function getActiveReward(customerId: string): Promise<Reward | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("rewards")
    .select("*")
    .eq("customer_id", customerId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Reward | null) ?? null;
}

/** Počet pečiatok v aktuálnom cykle zákazníka. */
export async function getCycleStampCount(
  customerId: string,
  cycleStartedAt: string
): Promise<number> {
  const db = createAdminClient();
  const { count } = await db
    .from("stamps")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .gte("created_at", cycleStartedAt);
  return count ?? 0;
}

export interface RewardEligibility {
  stampCount: number;
  stampsRequired: number;
  hasActiveReward: boolean;
  eligible: boolean;
}

export async function checkRewardEligibility(
  customerId: string
): Promise<RewardEligibility> {
  if (!UUID_RE.test(customerId)) {
    throw new ServiceError("CUSTOMER_NOT_FOUND", "Zákazník sa nenašiel.", 404);
  }
  await expireRewards(customerId);

  const db = createAdminClient();
  const { data: customer } = await db
    .from("customers")
    .select("id, cycle_started_at")
    .eq("id", customerId)
    .maybeSingle();
  if (!customer) {
    throw new ServiceError("CUSTOMER_NOT_FOUND", "Zákazník sa nenašiel.", 404);
  }

  const settings = await getSettings();
  const [stampCount, activeReward] = await Promise.all([
    getCycleStampCount(customerId, customer.cycle_started_at),
    getActiveReward(customerId),
  ]);

  return {
    stampCount,
    stampsRequired: settings.stamps_required,
    hasActiveReward: activeReward !== null,
    eligible: !activeReward && stampCount >= settings.stamps_required,
  };
}

/** Vytvorí aktívnu odmenu podľa aktuálnych nastavení programu. */
export async function createReward(
  customerId: string,
  employeeId: string | null
): Promise<Reward> {
  const settings = await getSettings();
  const db = createAdminClient();

  const expiresAt = new Date(
    Date.now() + settings.reward_validity_days * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await db
    .from("rewards")
    .insert({
      customer_id: customerId,
      status: "active",
      discount_percent: settings.discount_percent,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error || !data) {
    throw new ServiceError("REWARD_CREATE_FAILED", "Vytvorenie odmeny zlyhalo.", 500);
  }

  await logAction({
    employeeId,
    action: "reward.created",
    customerId,
    metadata: {
      reward_id: data.id,
      discount_percent: settings.discount_percent,
      expires_at: expiresAt,
    },
  });

  return data as Reward;
}

/** Uplatní aktívnu odmenu a resetuje cyklus pečiatok. */
export async function redeemReward(
  customerId: string,
  employeeId: string
): Promise<Reward> {
  await expireRewards(customerId);

  const reward = await getActiveReward(customerId);
  if (!reward) {
    throw new ServiceError(
      "NO_ACTIVE_REWARD",
      "Zákazník nemá aktívnu odmenu na uplatnenie."
    );
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("rewards")
    .update({ status: "used", used_at: new Date().toISOString() })
    .eq("id", reward.id)
    .eq("status", "active")
    .select()
    .single();

  if (error || !data) {
    throw new ServiceError("REWARD_REDEEM_FAILED", "Uplatnenie odmeny zlyhalo.", 500);
  }

  await resetCustomerCycle(customerId);

  await logAction({
    employeeId,
    action: "reward.redeemed",
    customerId,
    metadata: { reward_id: reward.id, discount_percent: reward.discount_percent },
  });

  return data as Reward;
}

/** Vynuluje zberný cyklus – staré pečiatky sa prestanú počítať. */
export async function resetCustomerCycle(customerId: string): Promise<void> {
  const db = createAdminClient();
  await db
    .from("customers")
    .update({ cycle_started_at: new Date().toISOString() })
    .eq("id", customerId);
}
