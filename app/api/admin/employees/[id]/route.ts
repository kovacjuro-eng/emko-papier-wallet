import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { deleteEmployee } from "@/lib/services/employees";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const admin = await requireEmployee("admin");
    const { id } = await params;
    await deleteEmployee(id, admin.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
