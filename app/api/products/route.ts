import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { expireStaleReservations } from "@/lib/expiry";

export const dynamic = "force-dynamic";

export async function GET() {
  await expireStaleReservations();

  const products = await prisma.product.findMany({
    include: {
      inventories: {
        include: {
          warehouse: { select: { id: true, name: true, location: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatted = (products as any[]).map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    description: p.description,
    imageUrl: p.imageUrl,
    price: p.price.toString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inventories: p.inventories.map((inv: any) => ({
      warehouseId: inv.warehouseId,
      totalUnits: inv.totalUnits,
      reservedUnits: inv.reservedUnits,
      availableUnits: inv.totalUnits - inv.reservedUnits,
      warehouse: inv.warehouse,
    })),
  }));

  return NextResponse.json(formatted);
}
