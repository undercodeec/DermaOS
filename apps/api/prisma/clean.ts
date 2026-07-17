// Vacia todos los registros de negocio. No crea usuarios, clinicas ni datos demo.
// Uso: pnpm db:clean

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("[clean] eliminando todos los registros...");

  await prisma.auditLog.deleteMany();
  await prisma.clinicPaymentProvider.deleteMany();
  await prisma.platformSubscriptionPayment.deleteMany();
  await prisma.clinicSubscription.deleteMany();
  await prisma.packageRedemption.deleteMany();
  await prisma.packagePayment.deleteMany();
  await prisma.packageBalance.deleteMany();
  await prisma.package.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.consent.deleteMany();
  await prisma.consentTemplate.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.procedure.deleteMany();
  await prisma.clinicalRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.service.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.user.deleteMany();
  await prisma.clinic.deleteMany();

  console.log("[clean] listo: base sin clinicas, usuarios ni registros demo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
