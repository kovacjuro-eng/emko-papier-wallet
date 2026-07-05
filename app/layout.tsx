import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Emko Papier – Vernostný program",
  description: "Digitálna vernostná karta siete papiernictiev Emko Papier",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sk">
      <body className="min-h-screen bg-stone-100 text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
