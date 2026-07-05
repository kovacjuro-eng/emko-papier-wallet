import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { addStamp } from "@/lib/services/stamps";

export async function POST(req: NextRequest) {
  try {
    const employee = await requireEmployee();
    const body = await req.json();
    const result = await addStamp({
      customerId: String(body.customer_id ?? ""),
      employeeId: employee.id,
      storeId: String(body.store_id ?? ""),
      amount: Number(body.amount),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
