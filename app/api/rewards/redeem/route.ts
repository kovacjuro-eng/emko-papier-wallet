import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { redeemReward } from "@/lib/services/rewards";

export async function POST(req: NextRequest) {
  try {
    const employee = await requireEmployee();
    const body = await req.json();
    const reward = await redeemReward(String(body.customer_id ?? ""), employee.id);
    return NextResponse.json({ reward });
  } catch (e) {
    return errorResponse(e);
  }
}
