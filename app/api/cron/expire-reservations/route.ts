import { NextRequest, NextResponse } from "next/server";
import { expireStaleReservations } from "@/lib/expiry";

export const dynamic = "force-dynamic";

/**
 * Called by Vercel Cron every minute (see vercel.json).
 * Also callable manually for testing.
 */
export async function GET(req: NextRequest) {
  // Protect against random internet invocations in production
  const authHeader = req.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const released = await expireStaleReservations();
  return NextResponse.json({ released, timestamp: new Date().toISOString() });
}
