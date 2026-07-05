"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UUID_RE } from "@/lib/types";

const READER_ID = "qr-reader";

/** Vytiahne UUID zákazníka z obsahu QR (čisté ID alebo URL karty). */
function extractCustomerId(text: string): string | null {
  const match = text.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  return match ? match[0] : null;
}

export default function ScanClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const instance = new Html5Qrcode(READER_ID);
        scanner = instance;

        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (handledRef.current) return;
            const id = extractCustomerId(decodedText);
            if (!id) return;
            handledRef.current = true;
            instance
              .stop()
              .catch(() => {})
              .finally(() => router.push(`/customers/${id}`));
          },
          () => {
            // priebežné chyby dekódovania ignorujeme
          }
        );
      } catch {
        if (!cancelled) {
          setError(
            "Kameru sa nepodarilo spustiť. Povoľte prístup ku kamere alebo zadajte kód ručne."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, [router]);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = extractCustomerId(manualCode.trim());
    if (!id || !UUID_RE.test(id)) {
      setManualError("Zadaný kód nie je platné ID zákazníka.");
      return;
    }
    router.push(`/customers/${id}`);
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div
          id={READER_ID}
          className="mx-auto w-full max-w-md overflow-hidden rounded-lg"
        />
        {error && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {error}
          </p>
        )}
      </div>

      <form onSubmit={handleManualSubmit} className="card space-y-3">
        <label htmlFor="manual" className="label">
          Alebo zadajte ID zákazníka ručne
        </label>
        <div className="flex gap-2">
          <input
            id="manual"
            type="text"
            className="input"
            placeholder="napr. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0">
            Otvoriť
          </button>
        </div>
        {manualError && <p className="text-sm text-red-600">{manualError}</p>}
      </form>
    </div>
  );
}
