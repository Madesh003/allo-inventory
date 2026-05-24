/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const warehouses = await Promise.all([
    prisma.warehouse.upsert({
      where: { id: "wh-mumbai" },
      update: {},
      create: { id: "wh-mumbai", name: "Mumbai Fulfillment Centre", location: "Mumbai, MH" },
    }),
    prisma.warehouse.upsert({
      where: { id: "wh-delhi" },
      update: {},
      create: { id: "wh-delhi", name: "Delhi NCR Hub", location: "Gurugram, HR" },
    }),
    prisma.warehouse.upsert({
      where: { id: "wh-bangalore" },
      update: {},
      create: { id: "wh-bangalore", name: "Bangalore South", location: "Bengaluru, KA" },
    }),
  ]);
  console.log(`✅ ${warehouses.length} warehouses`);

  const productData = [
    {
      id: "prod-001",
      name: "Arc Leather Backpack",
      sku: "BAG-ARC-BLK",
      description: "Full-grain leather backpack with padded 15\" laptop sleeve and YKK zippers.",
      imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
      price: "8499.00",
      stock: [
        { warehouseId: "wh-mumbai", total: 12 },
        { warehouseId: "wh-delhi", total: 8 },
        { warehouseId: "wh-bangalore", total: 3 },
      ],
    },
    {
      id: "prod-002",
      name: "Merino Wool Crewneck",
      sku: "APP-MRN-NVY-L",
      description: "190gsm superfine merino. Temperature-regulating, machine washable.",
      imageUrl: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=400",
      price: "3299.00",
      stock: [
        { warehouseId: "wh-mumbai", total: 25 },
        { warehouseId: "wh-delhi", total: 18 },
        { warehouseId: "wh-bangalore", total: 1 },
      ],
    },
    {
      id: "prod-003",
      name: "Ceramic Pour-Over Set",
      sku: "KIT-CAFE-WHT",
      description: "Hand-thrown ceramic dripper + 500ml carafe. For V60-style brewing.",
      imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400",
      price: "2199.00",
      stock: [
        { warehouseId: "wh-mumbai", total: 6 },
        { warehouseId: "wh-bangalore", total: 4 },
      ],
    },
    {
      id: "prod-004",
      name: "Titanium Field Watch",
      sku: "WTC-TI-40MM",
      description: "Grade 5 titanium case, sapphire crystal, 200m WR. Miyota 9015 movement.",
      imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
      price: "24999.00",
      stock: [
        { warehouseId: "wh-mumbai", total: 2 },
        { warehouseId: "wh-delhi", total: 1 },
      ],
    },
    {
      id: "prod-005",
      name: "Modular Desk Organiser",
      sku: "DSK-MOD-OAK",
      description: "CNC-machined oak + powder-coated steel. Holds 6 modules, tool-free assembly.",
      imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400",
      price: "4799.00",
      stock: [
        { warehouseId: "wh-mumbai", total: 9 },
        { warehouseId: "wh-delhi", total: 7 },
        { warehouseId: "wh-bangalore", total: 5 },
      ],
    },
  ];

  for (const p of productData) {
    const product = await prisma.product.upsert({
      where: { id: p.id },
      update: { name: p.name, description: p.description, imageUrl: p.imageUrl },
      create: {
        id: p.id,
        name: p.name,
        sku: p.sku,
        description: p.description,
        imageUrl: p.imageUrl,
        price: p.price,
      },
    });

    for (const s of p.stock) {
      await prisma.inventory.upsert({
        where: { productId_warehouseId: { productId: product.id, warehouseId: s.warehouseId } },
        update: { totalUnits: s.total, reservedUnits: 0 },
        create: {
          productId: product.id,
          warehouseId: s.warehouseId,
          totalUnits: s.total,
          reservedUnits: 0,
        },
      });
    }
  }

  console.log(`✅ ${productData.length} products with inventory`);
  console.log("🎉 Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
