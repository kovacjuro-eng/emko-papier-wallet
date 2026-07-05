"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

interface NavProps {
  employeeName: string;
  isAdmin: boolean;
}

const links = [
  { href: "/dashboard", label: "Prehľad" },
  { href: "/scan", label: "Skenovať QR" },
  { href: "/customers/new", label: "Nový zákazník" },
];

export default function Nav({ employeeName, isAdmin }: NavProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const allLinks = isAdmin ? [...links, { href: "/admin", label: "Admin" }] : links;

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/dashboard" className="text-lg font-bold text-emerald-700">
          Emko Papier
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          {allLinks.map((link) => {
            const active =
              link.href === "/admin"
                ? pathname.startsWith("/admin")
                : pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm text-stone-500 sm:inline">
            {employeeName}
          </span>
          <button
            onClick={handleLogout}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-stone-100"
          >
            Odhlásiť
          </button>
        </div>
      </div>
    </header>
  );
}
