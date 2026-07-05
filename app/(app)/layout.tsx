import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth";
import Nav from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const employee = await getCurrentEmployee();
  if (!employee) redirect("/login");

  return (
    <div className="min-h-screen">
      <Nav employeeName={employee.name} isAdmin={employee.role === "admin"} />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
