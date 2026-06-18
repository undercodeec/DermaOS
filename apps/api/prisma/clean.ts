// Vacía la base de datos y deja SOLO el usuario admin demo para poder loguearse.
// Uso: pnpm db:clean

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("[clean] eliminando todos los registros…");

  // Orden hijos → padres respetando FKs
  await prisma.auditLog.deleteMany();
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

  console.log("[clean] creando usuario admin demo…");

  await prisma.user.create({
    data: {
      email: "admin@dermapielypelo.ec",
      fullName: "Admin DERMA-OS",
      role: "admin",
      passwordHash: await bcrypt.hash("derma123", 10),
      mfaEnabled: false,
      active: true,
    },
  });

  console.log("[clean] ✔ base vacía. Login: admin@dermapielypelo.ec / derma123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
