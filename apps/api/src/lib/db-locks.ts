import { Prisma } from "@prisma/client";

/**
 * Acquires a transaction-scoped PostgreSQL advisory lock without returning the
 * database `void` type, which Prisma cannot deserialize.
 */
export async function acquireTransactionLock(tx: Prisma.TransactionClient, key: string) {
  await tx.$queryRaw<Array<{ acquired: number }>>(Prisma.sql`
    SELECT 1::int AS "acquired"
    FROM (SELECT pg_advisory_xact_lock(hashtext(${key}))) AS transaction_lock
  `);
}
