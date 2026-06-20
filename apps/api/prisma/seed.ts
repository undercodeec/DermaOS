import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ID = {
  prAndrade: "11111111-1111-4111-8111-111111111111",
  prCordero: "22222222-2222-4222-8222-222222222222",
  uAdmin:     "00000000-0000-4000-8000-000000000001",
  uRecepcion: "00000000-0000-4000-8000-000000000002",
  uAndrade:   "00000000-0000-4000-8000-000000000003",
  uCordero:   "00000000-0000-4000-8000-000000000004",
  uEstetica:  "00000000-0000-4000-8000-000000000005",
  uContador:  "00000000-0000-4000-8000-000000000006",
};

async function main() {
  console.log("[seed] limpiando datos previos…");
  await prisma.auditLog.deleteMany();
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

  console.log("[seed] profesionales (mínimos: referencias FK de usuarios)");
  await prisma.professional.createMany({
    data: [
      { id: ID.prAndrade, name: "Dra. Verónica Andrade", specialty: "Dermatología", registrationNo: "ACESS 1712-04-987654", color: "#7A4A2B" },
      { id: ID.prCordero, name: "Dr. Esteban Cordero",   specialty: "Dermatología", registrationNo: "ACESS 1709-11-123456", color: "#3E6B5C" },
    ],
  });

  console.log("[seed] usuarios (password: derma123)");
  const hash = await bcrypt.hash("derma123", 10);
  await prisma.user.createMany({
    data: [
      { id: ID.uAdmin,     fullName: "Christopher Gallardo", email: "admin@dermapielypelo.ec",       passwordHash: hash, role: "admin",       mfaEnabled: true,  active: true },
      { id: ID.uRecepcion, fullName: "Gabriela Naranjo",     email: "recepcion@dermapielypelo.ec",   passwordHash: hash, role: "recepcion",   mfaEnabled: false, active: true },
      { id: ID.uAndrade,   fullName: "Dra. Verónica Andrade",email: "v.andrade@dermapielypelo.ec",    passwordHash: hash, role: "profesional", mfaEnabled: true,  active: true, professionalId: ID.prAndrade },
      { id: ID.uCordero,   fullName: "Dr. Esteban Cordero",  email: "e.cordero@dermapielypelo.ec",    passwordHash: hash, role: "profesional", mfaEnabled: false, active: true, professionalId: ID.prCordero },
      { id: ID.uEstetica,  fullName: "Mishell Pazmiño",      email: "estetica@dermapielypelo.ec",     passwordHash: hash, role: "esteticista", mfaEnabled: false, active: true },
      { id: ID.uContador,  fullName: "Andrés Salas",         email: "contabilidad@dermapielypelo.ec", passwordHash: hash, role: "contador",    mfaEnabled: false, active: false },
    ],
  });

  console.log("[seed] ✔ listo — 6 usuarios + 2 profesionales");
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
