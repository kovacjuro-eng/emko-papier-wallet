import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth";
import { listEmployees } from "@/lib/services/employees";
import EmployeeAdmin from "@/components/admin/EmployeeAdmin";

export const dynamic = "force-dynamic";

export default async function AdminEmployeesPage() {
  const admin = await getCurrentEmployee();
  if (!admin) redirect("/login");

  const employees = await listEmployees();

  return <EmployeeAdmin employees={employees} currentAdminId={admin.id} />;
}
