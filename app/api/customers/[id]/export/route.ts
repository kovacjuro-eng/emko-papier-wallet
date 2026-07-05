import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { gdprExportCustomer } from "@/lib/services/customers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const employee = await requireEmployee("admin");
    const { id } = await params;
    const data = await gdprExportCustomer(id, employee.id);
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="gdpr-export-${id}.json"`,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
