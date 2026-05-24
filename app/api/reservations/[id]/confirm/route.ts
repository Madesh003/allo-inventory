import { NextRequest, NextResponse } from "next/server";
import { confirmReservation } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await confirmReservation(id);

  if ("error" in result) {
    if (result.error === "NOT_FOUND") {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }
    if (result.error === "EXPIRED") {
      return NextResponse.json(
        { error: "This reservation has expired. The units have been released back to stock." },
        { status: 410 }
      );
    }
    if (result.error === "WRONG_STATUS") {
      return NextResponse.json(
        { error: `Reservation cannot be confirmed — current status: ${result.status}` },
        { status: 409 }
      );
    }
  }

  return NextResponse.json({ reservation: result.data });
}
