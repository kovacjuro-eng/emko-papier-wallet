import { createAdminClient } from "@/lib/supabase/admin";
import type { Store } from "@/lib/types";

export async function listStores(): Promise<Store[]> {
  const db = createAdminClient();
  const { data } = await db.from("stores").select("*").order("name");
  return (data as Store[]) ?? [];
}
