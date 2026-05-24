import { prisma } from "./prisma";

export async function expireStaleReservations(): Promise<number> {
  const now = new Date();

  const expired = await prisma.reservation.findMany({
    where: { status: "PENDING", expiresAt: { lt: now } },
    select: { id: true, productId: true, warehouseId: true, quantity: true },
  });

  if (expired.length === 0) return 0;

  await prisma.$transaction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expired.map((r: any) =>
      prisma.$executeRaw`
        UPDATE "Reservation"
        SET status = 'RELEASED', "releasedAt" = NOW(), "updatedAt" = NOW()
        WHERE id = ${r.id} AND status = 'PENDING'
      `
    )
  );

  const grouped = new Map<string, { productId: string; warehouseId: string; qty: number }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of expired as any[]) {
    const key = `${r.productId}:${r.warehouseId}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.qty += r.quantity;
    } else {
      grouped.set(key, { productId: r.productId, warehouseId: r.warehouseId, qty: r.quantity });
    }
  }

  await prisma.$transaction(
    Array.from(grouped.values()).map(({ productId, warehouseId, qty }) =>
      prisma.$executeRaw`
        UPDATE "Inventory"
        SET "reservedUnits" = GREATEST(0, "reservedUnits" - ${qty}), "updatedAt" = NOW()
        WHERE "productId" = ${productId} AND "warehouseId" = ${warehouseId}
      `
    )
  );

  return expired.length;
}
