import { createAdminClient } from "@/lib/supabase/admin";
import {
  ServiceError,
  UUID_RE,
  type Customer,
  type CustomerDetail,
  type Reward,
  type StampWithRelations,
} from "@/lib/types";
import { getSettings } from "@/lib/services/settings";
import {
  expireRewards,
  getActiveReward,
  getCycleStampCount,
} from "@/lib/services/rewards";
import { logAction } from "@/lib/services/audit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CreateCustomerInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  gdpr_consent: boolean;
}

export async function createCustomer(
  input: CreateCustomerInput,
  employeeId: string
): Promise<Customer> {
  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim() || null;
  const phone = (input.phone ?? "").trim() || null;

  if (!name || name.length > 200) {
    throw new ServiceError("INVALID_NAME", "Zadajte meno zákazníka (max. 200 znakov).");
  }
  if (email && !EMAIL_RE.test(email)) {
    throw new ServiceError("INVALID_EMAIL", "E-mailová adresa nie je platná.");
  }
  if (phone && phone.length > 30) {
    throw new ServiceError("INVALID_PHONE", "Telefónne číslo je príliš dlhé.");
  }
  if (input.gdpr_consent !== true) {
    throw new ServiceError(
      "GDPR_REQUIRED",
      "Bez súhlasu so spracovaním osobných údajov nie je možné zákazníka registrovať."
    );
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("customers")
    .insert({ name, email, phone, gdpr_consent: true })
    .select()
    .single();

  if (error || !data) {
    throw new ServiceError("CUSTOMER_CREATE_FAILED", "Registrácia zákazníka zlyhala.", 500);
  }

  await logAction({
    employeeId,
    action: "customer.created",
    customerId: data.id,
  });

  return data as Customer;
}

/** Vyhľadanie podľa mena, e-mailu, telefónu alebo priamo UUID z QR kódu. */
export async function findCustomers(query: string): Promise<Customer[]> {
  const q = (query ?? "").trim();
  if (!q) return [];

  const db = createAdminClient();

  if (UUID_RE.test(q)) {
    const { data } = await db.from("customers").select("*").eq("id", q);
    return (data as Customer[]) ?? [];
  }

  // odstránime znaky, ktoré by rozbili PostgREST "or" filter
  const safe = q.replace(/[,()%]/g, " ").trim();
  if (!safe) return [];

  const { data } = await db
    .from("customers")
    .select("*")
    .or(`name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data as Customer[]) ?? [];
}

/** Kompletný stav zákazníka pre detail: pečiatky, odmena, história. */
export async function getCustomerDetail(customerId: string): Promise<CustomerDetail> {
  if (!UUID_RE.test(customerId)) {
    throw new ServiceError("CUSTOMER_NOT_FOUND", "Zákazník sa nenašiel.", 404);
  }

  await expireRewards(customerId);

  const db = createAdminClient();
  const { data: customer } = await db
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .maybeSingle();
  if (!customer) {
    throw new ServiceError("CUSTOMER_NOT_FOUND", "Zákazník sa nenašiel.", 404);
  }

  const settings = await getSettings();

  const [stampCount, activeReward, stampsRes, rewardsRes] = await Promise.all([
    getCycleStampCount(customerId, customer.cycle_started_at),
    getActiveReward(customerId),
    db
      .from("stamps")
      .select("*, stores(name), employees(name)")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("rewards")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const stamps: StampWithRelations[] = (stampsRes.data ?? []).map((s) => {
    const row = s as Record<string, unknown>;
    const store = row.stores as { name: string } | null;
    const employee = row.employees as { name: string } | null;
    return {
      id: row.id as string,
      customer_id: row.customer_id as string,
      store_id: row.store_id as string,
      employee_id: row.employee_id as string,
      amount: Number(row.amount),
      created_at: row.created_at as string,
      store_name: store?.name ?? null,
      employee_name: employee?.name ?? null,
    };
  });

  return {
    customer: customer as Customer,
    stampCount,
    stampsRequired: settings.stamps_required,
    activeReward,
    stamps,
    rewards: (rewardsRes.data as Reward[]) ?? [],
  };
}

/** GDPR export – všetky dáta, ktoré o zákazníkovi evidujeme. */
export async function gdprExportCustomer(
  customerId: string,
  employeeId: string
): Promise<Record<string, unknown>> {
  if (!UUID_RE.test(customerId)) {
    throw new ServiceError("CUSTOMER_NOT_FOUND", "Zákazník sa nenašiel.", 404);
  }
  const db = createAdminClient();

  const { data: customer } = await db
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .maybeSingle();
  if (!customer) {
    throw new ServiceError("CUSTOMER_NOT_FOUND", "Zákazník sa nenašiel.", 404);
  }

  const [stamps, rewards, auditLogs] = await Promise.all([
    db.from("stamps").select("*").eq("customer_id", customerId).order("created_at"),
    db.from("rewards").select("*").eq("customer_id", customerId).order("created_at"),
    db.from("audit_logs").select("*").eq("customer_id", customerId).order("timestamp"),
  ]);

  await logAction({
    employeeId,
    action: "customer.gdpr_export",
    customerId,
  });

  return {
    exported_at: new Date().toISOString(),
    customer,
    stamps: stamps.data ?? [],
    rewards: rewards.data ?? [],
    audit_logs: auditLogs.data ?? [],
  };
}

/** GDPR zmazanie – zmaže zákazníka aj s pečiatkami a odmenami (cascade). */
export async function gdprDeleteCustomer(
  customerId: string,
  employeeId: string
): Promise<void> {
  if (!UUID_RE.test(customerId)) {
    throw new ServiceError("CUSTOMER_NOT_FOUND", "Zákazník sa nenašiel.", 404);
  }
  const db = createAdminClient();

  const { data: customer } = await db
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .maybeSingle();
  if (!customer) {
    throw new ServiceError("CUSTOMER_NOT_FOUND", "Zákazník sa nenašiel.", 404);
  }

  // log pred zmazaním; v metadátach ostane len pseudonymné UUID
  await logAction({
    employeeId,
    action: "customer.gdpr_deleted",
    customerId,
  });

  const { error } = await db.from("customers").delete().eq("id", customerId);
  if (error) {
    throw new ServiceError("CUSTOMER_DELETE_FAILED", "Zmazanie zákazníka zlyhalo.", 500);
  }
}

/** Zoznam zákazníkov pre admin panel (voliteľné vyhľadávanie). */
export async function listCustomers(query?: string): Promise<Customer[]> {
  if (query && query.trim()) return findCustomers(query);
  const db = createAdminClient();
  const { data } = await db
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data as Customer[]) ?? [];
}
