-- Allo Inventory — initial schema
-- Run via: npx prisma migrate dev --name init

-- Products
CREATE TABLE "Product" (
  "id"          TEXT PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "sku"         TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "imageUrl"    TEXT,
  "price"       DECIMAL(10,2) NOT NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL
);

-- Warehouses
CREATE TABLE "Warehouse" (
  "id"        TEXT PRIMARY KEY,
  "name"      TEXT NOT NULL,
  "location"  TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inventory (stock levels per product per warehouse)
CREATE TABLE "Inventory" (
  "id"            TEXT PRIMARY KEY,
  "productId"     TEXT NOT NULL REFERENCES "Product"("id"),
  "warehouseId"   TEXT NOT NULL REFERENCES "Warehouse"("id"),
  "totalUnits"    INTEGER NOT NULL DEFAULT 0,
  "reservedUnits" INTEGER NOT NULL DEFAULT 0,
  "updatedAt"     TIMESTAMPTZ NOT NULL,
  UNIQUE("productId", "warehouseId")
);

CREATE INDEX "Inventory_productId_idx"   ON "Inventory"("productId");
CREATE INDEX "Inventory_warehouseId_idx" ON "Inventory"("warehouseId");

-- Reservation status enum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'RELEASED');

-- Reservations
CREATE TABLE "Reservation" (
  "id"             TEXT PRIMARY KEY,
  "productId"      TEXT NOT NULL REFERENCES "Product"("id"),
  "warehouseId"    TEXT NOT NULL REFERENCES "Warehouse"("id"),
  "quantity"       INTEGER NOT NULL,
  "status"         "ReservationStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt"      TIMESTAMPTZ NOT NULL,
  "confirmedAt"    TIMESTAMPTZ,
  "releasedAt"     TIMESTAMPTZ,
  "idempotencyKey" TEXT UNIQUE,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL
);

CREATE INDEX "Reservation_status_expiresAt_idx"     ON "Reservation"("status", "expiresAt");
CREATE INDEX "Reservation_productId_warehouseId_idx" ON "Reservation"("productId", "warehouseId");
