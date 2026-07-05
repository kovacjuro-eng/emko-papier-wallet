import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { generateExport, type ExportEntity, type ExportFormat } from "@/lib/services/export";
import { logAction } from "@/lib/services/audit";
import { ServiceError } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const employee = await requireEmployee("admin");

    const entity = req.nextUrl.searchParams.get("entity") as ExportEntity;
    const format = req.nextUrl.searchParams.get("format") as ExportFormat;
    if (!["customers", "stamps"].includes(entity) || !["csv", "xlsx"].includes(format)) {
      throw new ServiceError("INVALID_EXPORT", "Neplatné parametre exportu.");
    }

    const result = await generateExport(entity, format);

    await logAction({
      employeeId: employee.id,
      action: "export.generated",
      metadata: { entity, format },
    });

    return new NextResponse(new Uint8Array(result.body), {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
