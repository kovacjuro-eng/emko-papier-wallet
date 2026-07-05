import ScanClient from "@/components/ScanClient";

export const dynamic = "force-dynamic";

export default function ScanPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Skenovať QR kód</h1>
        <p className="mt-1 text-sm text-stone-500">
          Namierte kameru na vernostnú kartu zákazníka.
        </p>
      </div>
      <ScanClient />
    </div>
  );
}
