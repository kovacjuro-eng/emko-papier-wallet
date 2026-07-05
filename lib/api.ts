import { NextResponse } from "next/server";
import { ServiceError } from "@/lib/types";

/** Jednotné spracovanie chýb v API routách. */
export function errorResponse(e: unknown): NextResponse {
  if (e instanceof ServiceError) {
    return NextResponse.json(
      { error: e.message, code: e.code },
      { status: e.status }
    );
  }
  console.error("Neošetrená chyba API:", e);
  return NextResponse.json(
    { error: "Interná chyba servera.", code: "INTERNAL" },
    { status: 500 }
  );
}
