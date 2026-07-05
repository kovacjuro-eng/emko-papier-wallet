"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Employee } from "@/lib/types";

interface EmployeeAdminProps {
  employees: Employee[];
  currentAdminId: string;
}

export default function EmployeeAdmin({
  employees,
  currentAdminId,
}: EmployeeAdminProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"employee" | "admin">("employee");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Vytvorenie zlyhalo." });
        return;
      }
      setMessage({ type: "ok", text: `Zamestnanec ${data.employee.name} bol vytvorený.` });
      setName("");
      setEmail("");
      setPassword("");
      setRole("employee");
      router.refresh();
    } catch {
      setMessage({ type: "err", text: "Vytvorenie zlyhalo. Skúste znova." });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(employee: Employee) {
    if (!confirm(`Naozaj zmazať zamestnanca „${employee.name}"? Stratí prístup do systému.`)) {
      return;
    }
    const res = await fetch(`/api/admin/employees/${employee.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Zmazanie zlyhalo.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card">
        <h2 className="mb-3 font-semibold">Zoznam zamestnancov</h2>
        <ul className="divide-y divide-stone-100">
          {employees.map((emp) => (
            <li key={emp.id} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <p className="text-sm font-medium">
                  {emp.name}
                  {emp.id === currentAdminId && (
                    <span className="ml-2 text-xs text-stone-400">(vy)</span>
                  )}
                </p>
                <p className="text-xs text-stone-500">{emp.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    emp.role === "admin"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {emp.role === "admin" ? "Admin" : "Zamestnanec"}
                </span>
                {emp.id !== currentAdminId && (
                  <button
                    onClick={() => handleDelete(emp)}
                    className="rounded-lg border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    Zmazať
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={handleCreate} className="card space-y-3 self-start">
        <h2 className="font-semibold">Nový zamestnanec</h2>
        <div>
          <label htmlFor="emp-name" className="label">
            Meno a priezvisko
          </label>
          <input
            id="emp-name"
            type="text"
            required
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="emp-email" className="label">
            Prihlasovací e-mail
          </label>
          <input
            id="emp-email"
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="emp-password" className="label">
            Heslo (min. 8 znakov)
          </label>
          <input
            id="emp-password"
            type="password"
            required
            minLength={8}
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="emp-role" className="label">
            Rola
          </label>
          <select
            id="emp-role"
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value as "employee" | "admin")}
          >
            <option value="employee">Zamestnanec</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {message && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              message.type === "ok"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Vytváram…" : "Vytvoriť zamestnanca"}
        </button>
      </form>
    </div>
  );
}
