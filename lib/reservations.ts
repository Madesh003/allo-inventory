import { prisma } from "./prisma";
import { expireStaleReservations } from "./expiry";

const RESERVATION_TTL_MINUTES = 10;

export interface ReserveSuccess {
  success: true;
  reservation: any;
}

export interface ReserveError {
  success: false;
  code: "INSUFFICIENT_STOCK" | "NOT_FOUND" | "IDEMPOTENT_REPLAY";
  existingReservation?: any;
}

export type ReserveResult = ReserveSuccess | ReserveError;

export async function reserveUnits(
  productId: string,
  warehouseId: string,
  quantity: number,
  idempotencyKey?: string
): Promise<ReserveResult> {
  if (idempotencyKey) {
    const existing = await prisma.reservation.findUnique({
      where: { idempotencyKey },
      include: {
        product: { select: { name: true, sku: true, price: true } },
        warehouse: { select: { name: true, location: true } },
      },
    });

    if (existing) {
      return {
        success: false,
        code: "IDEMPOTENT_REPLAY",
        existingReservation: existing,
      };
    }
  }

  await expireStaleReservations();

  const result = await prisma.$transaction(
    async (tx) => {
      const updated = await tx.$executeRaw`
        UPDATE "Inventory"
        SET "reservedUnits" = "reservedUnits" + ${quantity},
            "updatedAt"     = NOW()
        WHERE "productId"   = ${productId}
          AND "warehouseId" = ${warehouseId}
          AND ("totalUnits" - "reservedUnits") >= ${quantity}
      `;

      if (updated === 0) {
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_warehouseId: {
              productId,
              warehouseId,
            },
          },
        });

        if (!inventory) {
          return {
            ok: false as const,
            reason: "NOT_FOUND" as const,
          };
        }

        return {
          ok: false as const,
          reason: "INSUFFICIENT_STOCK" as const,
        };
      }

      const expiresAt = new Date(
        Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000
      );

      const reservation = await tx.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          status: "PENDING",
          expiresAt,
          idempotencyKey: idempotencyKey ?? null,
        },
        include: {
          product: { select: { name: true, sku: true, price: true } },
          warehouse: { select: { name: true, location: true } },
        },
      });

      return {
        ok: true as const,
        reservation,
      };
    },
    {
      isolationLevel: "Serializable",
    }
  );

  if (!result.ok) {
    return {
      success: false,
      code: result.reason,
    };
  }

  return {
    success: true,
    reservation: result.reservation,
  };
}

export async function confirmReservation(id: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
  });

  if (!reservation) {
    return { error: "NOT_FOUND" as const };
  }

  if (reservation.status !== "PENDING") {
    return {
      error: "WRONG_STATUS" as const,
      status: reservation.status,
    };
  }

  if (reservation.expiresAt < new Date()) {
    await releaseInventory(
      reservation.productId,
      reservation.warehouseId,
      reservation.quantity,
      id,
      "RELEASED"
    );

    return { error: "EXPIRED" as const };
  }

  const confirmed = await prisma.$transaction(async (tx) => {
    const updated = await tx.reservation.updateMany({
      where: {
        id,
        status: "PENDING",
        expiresAt: {
          gte: new Date(),
        },
      },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      return null;
    }

    await tx.$executeRaw`
      UPDATE "Inventory"
      SET "totalUnits"    = "totalUnits" - ${reservation.quantity},
          "reservedUnits" = GREATEST(
            0,
            "reservedUnits" - ${reservation.quantity}
          ),
          "updatedAt"     = NOW()
      WHERE "productId"   = ${reservation.productId}
        AND "warehouseId" = ${reservation.warehouseId}
    `;

    return tx.reservation.findUnique({
      where: { id },
    });
  });

  if (!confirmed) {
    return { error: "EXPIRED" as const };
  }

  return { data: confirmed };
}

export async function releaseReservation(id: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
  });

  if (!reservation) {
    return { error: "NOT_FOUND" as const };
  }

  if (reservation.status !== "PENDING") {
    return {
      error: "WRONG_STATUS" as const,
      status: reservation.status,
    };
  }

  return releaseInventory(
    reservation.productId,
    reservation.warehouseId,
    reservation.quantity,
    id,
    "RELEASED"
  );
}

async function releaseInventory(
  productId: string,
  warehouseId: string,
  quantity: number,
  reservationId: string,
  newStatus: "RELEASED"
) {
  const released = await prisma.$transaction(async (tx) => {
    const updated = await tx.reservation.updateMany({
      where: {
        id: reservationId,
        status: "PENDING",
      },
      data: {
        status: newStatus,
        releasedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      return null;
    }

    await tx.$executeRaw`
      UPDATE "Inventory"
      SET "reservedUnits" = GREATEST(
            0,
            "reservedUnits" - ${quantity}
          ),
          "updatedAt"     = NOW()
      WHERE "productId"   = ${productId}
        AND "warehouseId" = ${warehouseId}
    `;

    return tx.reservation.findUnique({
      where: {
        id: reservationId,
      },
    });
  });

  if (!released) {
    return {
      error: "WRONG_STATUS" as const,
      status: "PENDING" as const,
    };
  }

  return {
    data: released,
  };
}