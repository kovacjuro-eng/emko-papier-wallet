import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth";

export const dynamic = "force-dynamic";

const tabs = [
  { href: "/admin", label: "Prehľad" },
  { href: "/admin/customers", label: "Zákazníci" },
  { href: "/admin/employees", label: "Zamestnanci" },
  { href: "/admin/settings", label: "Nastavenia" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const employee = await getCurrentEmployee();
  if (!employee || employee.role !== "admin") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Administrácia</h1>
        <nav className="mt-3 flex flex-wrap gap-1 border-b border-stone-200 pb-px">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="rounded-t-lg px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
