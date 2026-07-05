import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { getSettings, updateSettings } from "@/lib/services/settings";

export async function GET() {
  try {
    await requireEmployee("admin");
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const employee = await requireEmployee("admin");
    const body = await req.json();
    const settings = await updateSettings(
      {
        min_purchase_amount: body.min_purchase_amount,
        stamps_required: body.stamps_required,
        discount_percent: body.discount_percent,
        reward_validity_days: body.reward_validity_days,
      },
      employee.id
    );
    return NextResponse.json({ settings });
  } catch (e) {
    return errorResponse(e);
  }
}
