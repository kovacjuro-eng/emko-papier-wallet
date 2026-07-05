import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { getCustomerDetail, gdprDeleteCustomer } from "@/lib/services/customers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireEmployee();
    const { id } = await params;
    const detail = await getCustomerDetail(id);
    return NextResponse.json(detail);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const employee = await requireEmployee("admin");
    const { id } = await params;
    await gdprDeleteCustomer(id, employee.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
