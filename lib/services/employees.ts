import { createAdminClient } from "@/lib/supabase/admin";
import { ServiceError, UUID_RE, type Employee, type Role } from "@/lib/types";
import { logAction } from "@/lib/services/audit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function listEmployees(): Promise<Employee[]> {
  const db = createAdminClient();
  const { data } = await db.from("employees").select("*").order("name");
  return (data as Employee[]) ?? [];
}

export interface CreateEmployeeInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

/** Vytvorí Auth používateľa aj riadok v employees. Iba pre admina. */
export async function createEmployee(
  input: CreateEmployeeInput,
  adminId: string
): Promise<Employee> {
  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim().toLowerCase();

  if (!name || name.length > 200) {
    throw new ServiceError("INVALID_NAME", "Zadajte meno zamestnanca.");
  }
  if (!EMAIL_RE.test(email)) {
    throw new ServiceError("INVALID_EMAIL", "E-mailová adresa nie je platná.");
  }
  if (!input.password || input.password.length < 8) {
    throw new ServiceError("WEAK_PASSWORD", "Heslo musí mať aspoň 8 znakov.");
  }
  if (input.role !== "employee" && input.role !== "admin") {
    throw new ServiceError("INVALID_ROLE", "Neplatná rola.");
  }

  const db = createAdminClient();

  const { data: authUser, error: authError } = await db.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    throw new ServiceError(
      "AUTH_CREATE_FAILED",
      authError?.message?.includes("already")
        ? "Používateľ s týmto e-mailom už existuje."
        : "Vytvorenie prihlasovacieho účtu zlyhalo.",
      400
    );
  }

  const { data, error } = await db
    .from("employees")
    .insert({ id: authUser.user.id, name, email, role: input.role })
    .select()
    .single();

  if (error || !data) {
    // rollback auth účtu, aby nezostal sirotský používateľ
    await db.auth.admin.deleteUser(authUser.user.id);
    throw new ServiceError("EMPLOYEE_CREATE_FAILED", "Vytvorenie zamestnanca zlyhalo.", 500);
  }

  await logAction({
    employeeId: adminId,
    action: "employee.created",
    metadata: { new_employee_id: data.id, role: input.role },
  });

  return data as Employee;
}

/** Zmaže zamestnanca vrátane Auth účtu. Admin nemôže zmazať sám seba. */
export async function deleteEmployee(
  employeeId: string,
  adminId: string
): Promise<void> {
  if (!UUID_RE.test(employeeId)) {
    throw new ServiceError("EMPLOYEE_NOT_FOUND", "Zamestnanec sa nenašiel.", 404);
  }
  if (employeeId === adminId) {
    throw new ServiceError("CANNOT_DELETE_SELF", "Nemôžete zmazať vlastný účet.");
  }

  const db = createAdminClient();
  const { data: employee } = await db
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .maybeSingle();
  if (!employee) {
    throw new ServiceError("EMPLOYEE_NOT_FOUND", "Zamestnanec sa nenašiel.", 404);
  }

  await logAction({
    employeeId: adminId,
    action: "employee.deleted",
    metadata: { deleted_employee_id: employeeId },
  });

  // zmazanie auth používateľa zmaže cez cascade aj riadok v employees
  const { error } = await db.auth.admin.deleteUser(employeeId);
  if (error) {
    throw new ServiceError("EMPLOYEE_DELETE_FAILED", "Zmazanie zamestnanca zlyhalo.", 500);
  }
}
