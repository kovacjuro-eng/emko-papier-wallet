"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let signInError: unknown = null;
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      signInError = error;
    } catch {
      setError(
        "Aplikácia nie je nakonfigurovaná – doplňte Supabase údaje do .env.local."
      );
      setLoading(false);
      return;
    }

    if (signInError) {
      setError("Nesprávny e-mail alebo heslo.");
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-emerald-700">Emko Papier</h1>
          <p className="mt-1 text-sm text-stone-500">
            Vernostný program – prihlásenie zamestnanca
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label htmlFor="email" className="label">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="label">
              Heslo
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Prihlasujem…" : "Prihlásiť sa"}
          </button>
        </form>
      </div>
    </main>
  );
}
