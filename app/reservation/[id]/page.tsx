import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ReservationClient from "@/components/ReservationClient";

export const dynamic = "force-dynamic";

export default async function ReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      product: { select: { name: true, sku: true, price: true, imageUrl: true } },
      warehouse: { select: { name: true, location: true } },
    },
  });

  if (!reservation) notFound();

  return (
    <ReservationClient
      reservation={{
        ...reservation,
        product: {
          ...reservation.product,
          price: reservation.product.price.toString(),
        },
        expiresAt: reservation.expiresAt.toISOString(),
        confirmedAt: reservation.confirmedAt?.toISOString() ?? null,
        releasedAt: reservation.releasedAt?.toISOString() ?? null,
        createdAt: reservation.createdAt.toISOString(),
        updatedAt: reservation.updatedAt.toISOString(),
      }}
    />
  );
}
