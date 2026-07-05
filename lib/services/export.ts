import ExcelJS from "exceljs";
import { createAdminClient } from "@/lib/supabase/admin";
import { ServiceError } from "@/lib/types";

export type ExportEntity = "customers" | "stamps";
export type ExportFormat = "csv" | "xlsx";

export interface ExportResult {
  filename: string;
  contentType: string;
  body: Buffer;
}

interface ExportTable {
  headers: string[];
  rows: (string | number | boolean | null)[][];
}

async function loadCustomersTable(): Promise<ExportTable> {
  const db = createAdminClient();
  const { data } = await db
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10000);

  return {
    headers: ["ID", "Meno", "E-mail", "Telefón", "GDPR súhlas", "Registrovaný"],
    rows: (data ?? []).map((c) => [
      c.id,
      c.name,
      c.email,
      c.phone,
      c.gdpr_consent ? "áno" : "nie",
      c.created_at,
    ]),
  };
}

async function loadStampsTable(): Promise<ExportTable> {
  const db = createAdminClient();
  const { data } = await db
    .from("stamps")
    .select("*, customers(name), stores(name), employees(name)")
    .order("created_at", { ascending: false })
    .limit(10000);

  return {
    headers: ["ID", "Zákazník", "Predajňa", "Zamestnanec", "Suma (€)", "Dátum"],
    rows: (data ?? []).map((s) => {
      const row = s as Record<string, unknown>;
      return [
        row.id as string,
        (row.customers as { name: string } | null)?.name ?? "",
        (row.stores as { name: string } | null)?.name ?? "",
        (row.employees as { name: string } | null)?.name ?? "",
        Number(row.amount),
        row.created_at as string,
      ];
    }),
  };
}

function toCsv(table: ExportTable): Buffer {
  const escape = (v: string | number | boolean | null): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    table.headers.map(escape).join(";"),
    ...table.rows.map((r) => r.map(escape).join(";")),
  ];
  // BOM, aby Excel správne otvoril UTF-8 s diakritikou
  return Buffer.from("﻿" + lines.join("\r\n"), "utf8");
}

async function toXlsx(table: ExportTable, sheetName: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(table.headers);
  sheet.getRow(1).font = { bold: true };
  table.rows.forEach((r) => sheet.addRow(r));
  sheet.columns.forEach((col) => {
    col.width = 24;
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}

export async function generateExport(
  entity: ExportEntity,
  format: ExportFormat
): Promise<ExportResult> {
  let table: ExportTable;
  let name: string;

  if (entity === "customers") {
    table = await loadCustomersTable();
    name = "zakaznici";
  } else if (entity === "stamps") {
    table = await loadStampsTable();
    name = "peciatky";
  } else {
    throw new ServiceError("INVALID_EXPORT", "Neznámy typ exportu.");
  }

  const date = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    return {
      filename: `emko-${name}-${date}.csv`,
      contentType: "text/csv; charset=utf-8",
      body: toCsv(table),
    };
  }
  if (format === "xlsx") {
    return {
      filename: `emko-${name}-${date}.xlsx`,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      body: await toXlsx(table, name),
    };
  }
  throw new ServiceError("INVALID_EXPORT", "Neznámy formát exportu.");
}
