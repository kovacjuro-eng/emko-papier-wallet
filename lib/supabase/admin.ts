import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side klient so service role kľúčom – obchádza RLS.
 * Nikdy nesmie byť importovaný do klientskeho (browser) kódu.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Chýba NEXT_PUBLIC_SUPABASE_URL alebo SUPABASE_SERVICE_ROLE_KEY (.env.local)."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
