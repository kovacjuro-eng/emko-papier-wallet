import { createAdminClient } from "@/lib/supabase/admin";
import type { AuditLog } from "@/lib/types";

export interface AdminStats {
  totalCustomers: number;
  totalStamps: number;
  stampsLast30Days: number;
  activeRewards: number;
  usedRewards: number;
  storeStats: { storeId: string; storeName: string; stampCount: number }[];
  recentAuditLogs: (AuditLog & { employee_name: string | null })[];
}

export async function getAdminStats(): Promise<AdminStats> {
  const db = createAdminClient();
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [customers, stamps, stamps30, activeRw, usedRw, stores, logs] =
    await Promise.all([
      db.from("customers").select("id", { count: "exact", head: true }),
      db.from("stamps").select("id", { count: "exact", head: true }),
      db
        .from("stamps")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since30),
      db
        .from("rewards")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      db
        .from("rewards")
        .select("id", { count: "exact", head: true })
        .eq("status", "used"),
      db.from("stores").select("*").order("name"),
      db
        .from("audit_logs")
        .select("*, employees(name)")
        .order("timestamp", { ascending: false })
        .limit(20),
    ]);

  const storeStats = await Promise.all(
    (stores.data ?? []).map(async (store) => {
      const { count } = await db
        .from("stamps")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id);
      return { storeId: store.id, storeName: store.name, stampCount: count ?? 0 };
    })
  );

  const recentAuditLogs = (logs.data ?? []).map((l) => {
    const row = l as Record<string, unknown>;
    const employee = row.employees as { name: string } | null;
    return {
      id: row.id as string,
      employee_id: row.employee_id as string | null,
      action: row.action as string,
      customer_id: row.customer_id as string | null,
      timestamp: row.timestamp as string,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      employee_name: employee?.name ?? null,
    };
  });

  return {
    totalCustomers: customers.count ?? 0,
    totalStamps: stamps.count ?? 0,
    stampsLast30Days: stamps30.count ?? 0,
    activeRewards: activeRw.count ?? 0,
    usedRewards: usedRw.count ?? 0,
    storeStats,
    recentAuditLogs,
  };
}
