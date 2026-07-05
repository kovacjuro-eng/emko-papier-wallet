import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { createEmployee, listEmployees } from "@/lib/services/employees";

export async function GET() {
  try {
    await requireEmployee("admin");
    const employees = await listEmployees();
    return NextResponse.json({ employees });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireEmployee("admin");
    const body = await req.json();
    const employee = await createEmployee(
      {
        name: body.name,
        email: body.email,
        password: body.password,
        role: body.role,
      },
      admin.id
    );
    return NextResponse.json({ employee }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
