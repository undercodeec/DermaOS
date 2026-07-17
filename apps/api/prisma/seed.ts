import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function deleteAllRecords() {
  await prisma.auditLog.deleteMany();
  await prisma.clinicPaymentProvider.deleteMany();
  await prisma.platformSubscriptionPayment.deleteMany();
  await prisma.clinicSubscription.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.packageRedemption.deleteMany();
  await prisma.packagePayment.deleteMany();
  await prisma.packageBalance.deleteMany();
  await prisma.package.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.procedure.deleteMany();
  await prisma.consent.deleteMany();
  await prisma.consentTemplate.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.clinicalRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.clinic.deleteMany();
}

async function main() {
  console.log("[seed] limpiando base sin crear datos precargados...");
  await deleteAllRecords();
  console.log("[seed] listo: base sin clinicas, usuarios ni registros demo.");
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
