import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { createCustomer, findCustomers } from "@/lib/services/customers";

export async function GET(req: NextRequest) {
  try {
    await requireEmployee();
    const q = req.nextUrl.searchParams.get("q") ?? "";
    const customers = await findCustomers(q);
    return NextResponse.json({ customers });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const employee = await requireEmployee();
    const body = await req.json();
    const customer = await createCustomer(
      {
        name: body.name,
        email: body.email,
        phone: body.phone,
        gdpr_consent: body.gdpr_consent,
      },
      employee.id
    );
    return NextResponse.json({ customer }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
