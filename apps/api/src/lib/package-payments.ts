import { Prisma } from "@prisma/client";
import { badRequest, notFound } from "./errors.js";

function cents(value: Prisma.Decimal | number | string) {
  return Math.round(Number(value) * 100);
}

export async function assertPackagePaymentFits(
  tx: Prisma.TransactionClient,
  balanceId: string,
  amount: Prisma.Decimal | number | string,
  options: { includePendingLinks?: boolean } = {},
) {
  await tx.$queryRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`package-balance:${balanceId}`}))`,
  );

  const balance = await tx.packageBalance.findUnique({
    where: { id: balanceId },
    select: { id: true, price: true, status: true },
  });
  if (!balance) throw notFound("Bono no encontrado");
  if (balance.status === "anulado") throw badRequest("No se reciben abonos sobre un bono anulado");

  const paid = await tx.packagePayment.aggregate({
    where: { balanceId },
    _sum: { amount: true },
  });
  let remainingCents = Math.max(0, cents(balance.price) - cents(paid._sum.amount ?? 0));
  if (options.includePendingLinks) {
    const pending = await tx.payment.aggregate({
      where: { conceptType: "paquete", conceptRefId: balanceId, status: "pendiente" },
      _sum: { amount: true },
    });
    remainingCents = Math.max(0, remainingCents - cents(pending._sum.amount ?? 0));
  }
  const amountCents = cents(amount);
  if (amountCents <= 0) throw badRequest("El abono debe ser mayor que cero");
  if (amountCents > remainingCents) {
    throw badRequest(`El abono supera el saldo pendiente de $${(remainingCents / 100).toFixed(2)}`);
  }

  return { balance, remainingCents };
}
