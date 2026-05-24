import { NextRequest, NextResponse } from "next/server";
import { releaseReservation } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await releaseReservation(id);

  if ("error" in result) {
    if (result.error === "NOT_FOUND") {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }
    if (result.error === "WRONG_STATUS") {
      return NextResponse.json(
        { error: `Reservation cannot be released — current status: ${result.status}` },
        { status: 409 }
      );
    }
  }

  return NextResponse.json({ reservation: result.data });
}
