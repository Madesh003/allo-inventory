import { prisma } from "@/lib/prisma";
import { expireStaleReservations } from "@/lib/expiry";
import ProductGrid from "@/components/ProductGrid";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getProducts() {
  await expireStaleReservations();
  return prisma.product.findMany({
    include: {
      inventories: { include: { warehouse: true } },
    },
    orderBy: { name: "asc" },
  });
}

export default async function HomePage() {
  const products = await getProducts();

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
      warehouse: {
        id: inv.warehouse.id,
        name: inv.warehouse.name,
        location: inv.warehouse.location,
      },
    })),
  }));

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ marginBottom: 40 }}>
        <p style={{
          fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
          color: "var(--ink-muted)", marginBottom: 8, fontWeight: 500,
        }}>
          Live inventory
        </p>
        <h1 style={{ fontSize: 36, letterSpacing: "-0.02em", color: "var(--ink)" }}>
          Products
        </h1>
        <p style={{ color: "var(--ink-muted)", marginTop: 6, fontSize: 14 }}>
          Select a warehouse and reserve units. Holds expire after 10 minutes if unpurchased.
        </p>
      </div>
      <ProductGrid products={formatted} />
    </div>
  );
}
