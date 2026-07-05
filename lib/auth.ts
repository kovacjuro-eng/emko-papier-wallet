import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ServiceError, type Employee, type Role } from "@/lib/types";

/** Vráti prihláseného zamestnanca (auth session + riadok v employees), inak null. */
export async function getCurrentEmployee(): Promise<Employee | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    // chýbajúca konfigurácia => správame sa ako neprihlásený (presmeruje na /login)
    return null;
  }
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const db = createAdminClient();
  const { data } = await db
    .from("employees")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Employee | null) ?? null;
}

/** Pre API routy: vyhodí ServiceError 401/403, ak požiadavka nemá potrebnú rolu. */
export async function requireEmployee(role?: Role): Promise<Employee> {
  const employee = await getCurrentEmployee();
  if (!employee) {
    throw new ServiceError("UNAUTHORIZED", "Prihláste sa, prosím.", 401);
  }
  if (role === "admin" && employee.role !== "admin") {
    throw new ServiceError(
      "FORBIDDEN",
      "Táto akcia vyžaduje administrátorské oprávnenie.",
      403
    );
  }
  return employee;
}
