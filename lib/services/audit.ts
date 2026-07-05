import { createAdminClient } from "@/lib/supabase/admin";

interface LogParams {
  employeeId: string | null;
  action: string;
  customerId?: string | null;
  metadata?: Record<string, unknown>;
}

/** Zapíše akciu do audit_logs. Chyba logovania nesmie zhodiť hlavnú akciu. */
export async function logAction(params: LogParams): Promise<void> {
  try {
    const db = createAdminClient();
    await db.from("audit_logs").insert({
      employee_id: params.employeeId,
      action: params.action,
      customer_id: params.customerId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (e) {
    console.error("Zápis do audit logu zlyhal:", e);
  }
}
