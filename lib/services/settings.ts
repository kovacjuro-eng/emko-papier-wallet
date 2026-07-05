import { createAdminClient } from "@/lib/supabase/admin";
import { ServiceError, type Settings } from "@/lib/types";
import { logAction } from "@/lib/services/audit";

export async function getSettings(): Promise<Settings> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error || !data) {
    throw new ServiceError(
      "SETTINGS_MISSING",
      "Nastavenia programu sa nenašli. Spustili ste supabase/schema.sql?",
      500
    );
  }
  return data as Settings;
}

export interface SettingsInput {
  min_purchase_amount: number;
  stamps_required: number;
  discount_percent: number;
  reward_validity_days: number;
}

export async function updateSettings(
  input: SettingsInput,
  employeeId: string
): Promise<Settings> {
  const min = Number(input.min_purchase_amount);
  const stamps = Number(input.stamps_required);
  const discount = Number(input.discount_percent);
  const validity = Number(input.reward_validity_days);

  if (!Number.isFinite(min) || min < 0) {
    throw new ServiceError("INVALID_INPUT", "Minimálna suma nákupu musí byť 0 alebo viac.");
  }
  if (!Number.isInteger(stamps) || stamps < 1 || stamps > 50) {
    throw new ServiceError("INVALID_INPUT", "Počet pečiatok musí byť celé číslo od 1 do 50.");
  }
  if (!Number.isFinite(discount) || discount < 1 || discount > 100) {
    throw new ServiceError("INVALID_INPUT", "Zľava musí byť medzi 1 a 100 %.");
  }
  if (!Number.isInteger(validity) || validity < 1 || validity > 730) {
    throw new ServiceError("INVALID_INPUT", "Platnosť odmeny musí byť 1 až 730 dní.");
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("settings")
    .update({
      min_purchase_amount: min,
      stamps_required: stamps,
      discount_percent: discount,
      reward_validity_days: validity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select()
    .single();

  if (error || !data) {
    throw new ServiceError("SETTINGS_UPDATE_FAILED", "Uloženie nastavení zlyhalo.", 500);
  }

  await logAction({
    employeeId,
    action: "settings.updated",
    metadata: { min_purchase_amount: min, stamps_required: stamps, discount_percent: discount, reward_validity_days: validity },
  });

  return data as Settings;
}
