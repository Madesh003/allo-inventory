import { NextRequest, NextResponse } from "next/server";
import { CreateReservationSchema } from "@/lib/schemas";
import { reserveUnits } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const idempotencyKey = request.headers.get("Idempotency-Key") ?? undefined;
  const { productId, warehouseId, quantity } = parsed.data;
  const result = await reserveUnits(productId, warehouseId, quantity, idempotencyKey);

  if (!result.success) {
    if (result.code === "IDEMPOTENT_REPLAY") {
      return NextResponse.json(
        { reservation: result.existingReservation, replayed: true },
        { status: 200 }
      );
    }
    if (result.code === "INSUFFICIENT_STOCK") {
      return NextResponse.json(
        { error: "Not enough stock available for this product at this warehouse." },
        { status: 409 }
      );
    }
    if (result.code === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Product or warehouse not found." },
        { status: 404 }
      );
    }
  }

  if (result.success) {
    return NextResponse.json({ reservation: result.reservation }, { status: 201 });
  }

  return NextResponse.json({ error: "Unknown error" }, { status: 500 });
}
