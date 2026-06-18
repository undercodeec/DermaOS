import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helpers
const dAt = (offsetDays: number, hhmm = "09:00") => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const [h, m] = hhmm.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
};

// IDs estables para hacer referencias cruzadas y permitir re-seed determinista
const ID = {
  // Professionals
  prAndrade: "11111111-1111-4111-8111-111111111111",
  prCordero: "22222222-2222-4222-8222-222222222222",
  // Users
  uAdmin: "00000000-0000-4000-8000-000000000001",
  uRecepcion: "00000000-0000-4000-8000-000000000002",
  uAndrade: "00000000-0000-4000-8000-000000000003",
  uCordero: "00000000-0000-4000-8000-000000000004",
  uEstetica: "00000000-0000-4000-8000-000000000005",
  uContador: "00000000-0000-4000-8000-000000000006",
  // Services
  sConsulta: "a0000001-0000-4000-8000-000000000001",
  sControl: "a0000001-0000-4000-8000-000000000002",
  sAcne: "a0000001-0000-4000-8000-000000000003",
  sCrio: "a0000001-0000-4000-8000-000000000004",
  sBotox: "a0000001-0000-4000-8000-000000000005",
  sHA: "a0000001-0000-4000-8000-000000000006",
  sPeeling: "a0000001-0000-4000-8000-000000000007",
  sLaser: "a0000001-0000-4000-8000-000000000008",
  sDermato: "a0000001-0000-4000-8000-000000000009",
  // Patients
  p1: "cccccccc-0000-4000-8000-000000000001",
  p2: "cccccccc-0000-4000-8000-000000000002",
  p3: "cccccccc-0000-4000-8000-000000000003",
  p4: "cccccccc-0000-4000-8000-000000000004",
  p5: "cccccccc-0000-4000-8000-000000000005",
  p6: "cccccccc-0000-4000-8000-000000000006",
  // Consent templates
  ct1: "dddddddd-0000-4000-8000-000000000001",
  ct2: "dddddddd-0000-4000-8000-000000000002",
  ci1: "dddddddd-0000-4000-8000-000000000003",
  ci2: "dddddddd-0000-4000-8000-000000000004",
  // Packages
  pkBotox: "eeeeeeee-0000-4000-8000-000000000003",
  pkLaser: "eeeeeeee-0000-4000-8000-000000000001",
  pkAcne: "eeeeeeee-0000-4000-8000-000000000004",
  pkPeeling: "eeeeeeee-0000-4000-8000-000000000002",
  // Balances
  pb1: "ffffffff-0000-4000-8000-000000000001",
  pb2: "ffffffff-0000-4000-8000-000000000002",
  pb3: "ffffffff-0000-4000-8000-000000000003",
};

async function main() {
  console.log("[seed] limpiando datos previos…");
  // Orden de borrado por FK
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

  console.log("[seed] profesionales");
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

  console.log("[seed] servicios");
  await prisma.service.createMany({
    data: [
      { id: ID.sConsulta, name: "Consulta Dermatológica",          category: "consulta",               durationMin: 30, price: 40,  vatRate: 0,  active: true },
      { id: ID.sControl,  name: "Control Dermatológico",           category: "consulta",               durationMin: 20, price: 25,  vatRate: 0,  active: true },
      { id: ID.sAcne,     name: "Tratamiento de Acné",             category: "tratamiento",            durationMin: 30, price: 55,  vatRate: 0,  active: true },
      { id: ID.sCrio,     name: "Crioterapia (lesiones benignas)", category: "tratamiento",            durationMin: 20, price: 45,  vatRate: 0,  active: true },
      { id: ID.sBotox,    name: "Toxina Botulínica",               category: "procedimiento_estetico", durationMin: 45, price: 320, vatRate: 15, active: true },
      { id: ID.sHA,       name: "Relleno con Ácido Hialurónico",   category: "procedimiento_estetico", durationMin: 60, price: 380, vatRate: 15, active: true },
      { id: ID.sPeeling,  name: "Peeling Químico",                 category: "procedimiento_estetico", durationMin: 40, price: 90,  vatRate: 15, active: true },
      { id: ID.sLaser,    name: "Láser CO₂ Fraccionado",           category: "procedimiento_estetico", durationMin: 60, price: 250, vatRate: 15, active: true },
      { id: ID.sDermato,  name: "Dermatoscopia Digital",           category: "estudio",                durationMin: 30, price: 60,  vatRate: 0,  active: true },
    ],
  });

  console.log("[seed] pacientes");
  await prisma.patient.createMany({
    data: [
      { id: ID.p1, firstName: "María José",     lastName: "Pérez Vallejo",  idType: "cedula", idNumber: "1712345678", birthDate: new Date("1991-03-14"), sex: "F", email: "majo.perez@gmail.com",  phone: "099 234 5678", city: "Quito",
        background: { skinType: "III", usesSunscreen: true, sunscreenSpf: 50, allergies: ["Penicilina"], chronicConditions: [], currentMedications: ["Anticonceptivo oral"], familyHistory: ["Acné severo (madre)"], dermatologicalHistory: ["Acné moderado desde los 17 años"], smoker: false, notes: "Piel mixta con tendencia seborreica en zona T." } },
      { id: ID.p2, firstName: "Carlos Andrés",  lastName: "Mora Sánchez",   idType: "cedula", idNumber: "0926473811", birthDate: new Date("1978-07-02"), sex: "M", email: "camora78@hotmail.com", phone: "098 765 4321", city: "Quito",
        background: { skinType: "IV", usesSunscreen: false, allergies: [], chronicConditions: ["Hipertensión arterial"], currentMedications: ["Losartán 50 mg"], familyHistory: [], dermatologicalHistory: ["Rosácea eritemato-telangiectásica"], smoker: true, notes: "Trabaja al aire libre; reforzar fotoprotección." } },
      { id: ID.p3, firstName: "Lucía Fernanda", lastName: "Ríos Cabrera",   idType: "cedula", idNumber: "1804567231", birthDate: new Date("1985-11-23"), sex: "F", email: "lucia.rios@yahoo.com", phone: "096 112 3344", city: "Ambato",
        background: { skinType: "II", usesSunscreen: true, sunscreenSpf: 100, allergies: ["Ácido acetilsalicílico"], chronicConditions: ["Hipotiroidismo"], currentMedications: ["Levotiroxina 75 µg"], familyHistory: ["Melasma (hermana)"], dermatologicalHistory: ["Melasma centrofacial"], smoker: false } },
      { id: ID.p4, firstName: "Jorge Luis",     lastName: "Tapia Andrade",  idType: "cedula", idNumber: "1758203946", birthDate: new Date("2001-05-09"), sex: "M", email: "jltapia01@gmail.com", phone: "099 887 6655", city: "Quito",
        background: { skinType: "III", usesSunscreen: false, allergies: [], chronicConditions: [], currentMedications: [], familyHistory: [], dermatologicalHistory: ["Acné nódulo-quístico"], smoker: false, notes: "Candidato a isotretinoína si no responde a tópicos." } },
      { id: ID.p5, firstName: "Ana Cristina",   lastName: "Velasco Puente", idType: "cedula", idNumber: "0103456789", birthDate: new Date("1969-01-30"), sex: "F", email: "acvelasco@gmail.com", phone: "098 443 2211", city: "Cuenca",
        background: { skinType: "II", usesSunscreen: true, sunscreenSpf: 50, allergies: ["Sulfas"], chronicConditions: ["Diabetes tipo 2"], currentMedications: ["Metformina 850 mg"], familyHistory: ["Melanoma (padre)"], dermatologicalHistory: ["Queratosis actínicas"], smoker: false, notes: "Control dermatoscópico anual por antecedente familiar de melanoma." } },
      { id: ID.p6, firstName: "Daniela Salomé", lastName: "Cueva León",     idType: "cedula", idNumber: "1721987654", birthDate: new Date("1996-09-17"), sex: "F", email: "dani.cueva@gmail.com", phone: "097 556 6778", city: "Quito",
        background: { skinType: "V", usesSunscreen: true, sunscreenSpf: 30, allergies: [], chronicConditions: ["Dermatitis atópica"], currentMedications: ["Cetirizina 10 mg PRN"], familyHistory: ["Atopia (madre y hermano)"], dermatologicalHistory: ["Dermatitis atópica desde la infancia", "Cicatrices post-acné"], smoker: false } },
    ],
  });

  console.log("[seed] historia clínica");
  await prisma.clinicalRecord.createMany({
    data: [
      { patientId: ID.p1, professionalId: ID.prAndrade, type: "evolucion", date: dAt(-112, "09:30"),
        subjective: "Acude por brote de lesiones inflamatorias en mejillas y mentón de 3 semanas de evolución.",
        objective: "Pápulas y pústulas en mejillas y mentón, comedones abiertos en frente.",
        assessment: "Acné vulgar moderado, predominio inflamatorio.",
        plan: "Inicia fórmula magistral. Fotoprotección diaria. Control en 6 semanas.",
        cie10Codes: ["L70.0"] },
      { patientId: ID.p3, professionalId: ID.prAndrade, type: "evolucion", date: dAt(-70, "16:00"),
        subjective: "Consulta por manchas faciales tras vacaciones.",
        objective: "Máculas café claro simétricas en frente, mejillas y labio superior.",
        assessment: "Melasma centrofacial, componente epidérmico.",
        plan: "Despigmentante nocturno + SPF 100. Revaloración en 10 semanas.",
        cie10Codes: ["L81.1"] },
      { patientId: ID.p1, professionalId: ID.prAndrade, type: "receta", date: dAt(-112, "09:45"),
        prescription: { items: [{ ingredients: [{ name: "Peróxido de benzoilo", concentration: "5%" }, { name: "Clindamicina", concentration: "1%" }], vehicle: "gel", quantity: "30 g", instructions: "Aplicar capa fina por las noches." }] } as any },
      { patientId: ID.p3, professionalId: ID.prAndrade, type: "receta", date: dAt(-70, "16:15"),
        prescription: { items: [{ ingredients: [{ name: "Hidroquinona", concentration: "4%" }, { name: "Tretinoína", concentration: "0.05%" }], vehicle: "crema base", quantity: "30 g", instructions: "Aplicar solo en las manchas por la noche. Fotoprotección estricta." }] } as any },
    ],
  });

  console.log("[seed] agenda");
  await prisma.appointment.createMany({
    data: [
      { patientId: ID.p1, serviceId: ID.sControl,  professionalId: ID.prAndrade, startAt: dAt(0, "09:00"), endAt: dAt(0, "09:20"), kind: "control",        status: "atendida" },
      { patientId: ID.p5, serviceId: ID.sDermato,  professionalId: ID.prCordero, startAt: dAt(0, "10:00"), endAt: dAt(0, "10:30"), kind: "control",        status: "en_sala" },
      { patientId: ID.p3, serviceId: ID.sBotox,    professionalId: ID.prAndrade, startAt: dAt(0, "11:30"), endAt: dAt(0, "12:15"), kind: "procedimiento",  status: "confirmada" },
      { patientId: ID.p6, serviceId: ID.sConsulta, professionalId: ID.prCordero, startAt: dAt(0, "15:30"), endAt: dAt(0, "16:00"), kind: "consulta_nueva", status: "agendada" },
      { patientId: ID.p2, serviceId: ID.sControl,  professionalId: ID.prCordero, startAt: dAt(1, "10:30"), endAt: dAt(1, "10:50"), kind: "control",        status: "confirmada" },
      { patientId: ID.p6, serviceId: ID.sLaser,    professionalId: ID.prAndrade, startAt: dAt(2, "10:00"), endAt: dAt(2, "11:00"), kind: "procedimiento",  status: "agendada", notes: "BLOQUEADO: requiere consentimiento firmado." },
    ],
  });

  console.log("[seed] consentimientos");
  await prisma.consentTemplate.createMany({
    data: [
      { id: ID.ct1, kind: "clinico", title: "Consentimiento informado · Toxina Botulínica", procedureType: "Toxina Botulínica",
        body: "Declaro que he sido informada/o sobre la aplicación de toxina botulínica tipo A, sus beneficios y riesgos." },
      { id: ID.ct2, kind: "clinico", title: "Consentimiento informado · Láser CO₂ Fraccionado", procedureType: "Láser CO₂",
        body: "Declaro haber sido informada/o sobre el procedimiento de láser CO₂ fraccionado y sus riesgos." },
      { id: ID.ci1, kind: "imagen", title: "Cesión de derechos de imagen · Uso clínico-académico", procedureType: "Uso de imagen",
        body: "Autorizo el uso de fotografías clínicas para historia y discusión académica únicamente." },
      { id: ID.ci2, kind: "imagen", title: "Cesión de derechos de imagen · Uso comercial / redes", procedureType: "Difusión de imagen",
        body: "Autorizo el uso de fotografías para difusión en redes sociales y material publicitario." },
    ],
  });
  await prisma.consent.createMany({
    data: [
      { patientId: ID.p3, templateId: ID.ct1, status: "firmado",   signedAt: dAt(-7, "15:30") },
      { patientId: ID.p6, templateId: ID.ct2, status: "pendiente" },
      { patientId: ID.p3, templateId: ID.ci1, status: "firmado",   signedAt: dAt(-70, "16:25") },
      { patientId: ID.p1, templateId: ID.ci2, status: "pendiente" },
    ],
  });

  console.log("[seed] inventario");
  await prisma.inventoryItem.createMany({
    data: [
      { name: "Toxina botulínica tipo A · vial 100 U", type: "vial", unit: "vial", stock: 4, minStock: 2, lotNumber: "B7231-EC", expiryDate: new Date("2027-02-01") },
      { name: "Ácido hialurónico · jeringa 1 ml",      type: "vial", unit: "jeringa", stock: 2, minStock: 2, lotNumber: "HA-5520", expiryDate: new Date("2026-11-15") },
      { name: "Hidroquinona (materia prima)",          type: "principio_activo", unit: "g", stock: 180, minStock: 50, lotNumber: "HQ-2210" },
      { name: "Tretinoína (materia prima)",            type: "principio_activo", unit: "g", stock: 22,  minStock: 10, lotNumber: "TR-0915" },
      { name: "Agujas 30G ½\"",                        type: "insumo", unit: "unidad", stock: 12, minStock: 20 },
    ],
  });

  console.log("[seed] paquetes y bonos");
  await prisma.package.createMany({
    data: [
      { id: ID.pkLaser,   serviceId: ID.sLaser,   name: "Láser CO₂ Fraccionado · 4 sesiones", sessions: 4, price: 850, intervalDays: 30,  validityDays: 240, active: true },
      { id: ID.pkPeeling, serviceId: ID.sPeeling, name: "Peeling Químico · 6 sesiones",        sessions: 6, price: 450, intervalDays: 21,  validityDays: 210, active: true },
      { id: ID.pkBotox,   serviceId: ID.sBotox,   name: "Toxina Botulínica · 3 aplicaciones",  sessions: 3, price: 840, intervalDays: 120, validityDays: 365, active: true },
      { id: ID.pkAcne,    serviceId: ID.sAcne,    name: "Tratamiento de Acné · 8 sesiones",    sessions: 8, price: 360, intervalDays: 14,  validityDays: 180, active: true },
    ],
  });
  await prisma.packageBalance.createMany({
    data: [
      { id: ID.pb1, patientId: ID.p3, packageId: ID.pkBotox, soldAt: dAt(-7, "15:35"),  sellerProfessionalId: ID.prAndrade, sessionsTotal: 3, sessionsUsed: 1, price: 840, vencimiento: dAt(358, "23:59"), status: "activo" },
      { id: ID.pb2, patientId: ID.p6, packageId: ID.pkLaser, soldAt: dAt(-12, "10:00"), sellerProfessionalId: ID.prAndrade, sessionsTotal: 4, sessionsUsed: 0, price: 850, vencimiento: dAt(228, "23:59"), status: "activo" },
      { id: ID.pb3, patientId: ID.p1, packageId: ID.pkAcne,  soldAt: dAt(-100,"09:50"), sellerProfessionalId: ID.prAndrade, sessionsTotal: 8, sessionsUsed: 3, price: 360, vencimiento: dAt(80, "23:59"),  status: "activo" },
    ],
  });
  await prisma.packagePayment.createMany({
    data: [
      { balanceId: ID.pb1, amount: 420, method: "transferencia", at: dAt(-7, "15:35"),   note: "Abono inicial 50%" },
      { balanceId: ID.pb2, amount: 850, method: "tarjeta",       at: dAt(-12, "10:05"),  note: "Pago total" },
      { balanceId: ID.pb3, amount: 180, method: "efectivo",      at: dAt(-100, "09:50"), note: "Abono inicial" },
      { balanceId: ID.pb3, amount: 90,  method: "transferencia", at: dAt(-56, "10:20"),  note: "2º abono" },
    ],
  });

  console.log("[seed] cobros Payphone");
  await prisma.payment.createMany({
    data: [
      { patientId: ID.p6, conceptType: "deposito", conceptLabel: "Depósito reserva · Láser CO₂ (30%)",  amount: 75,    status: "pagado",    payphoneLink: "https://ppls.me/dq7m2x", txId: "PP-2026061412", sentVia: "whatsapp", createdAt: dAt(-3, "11:20"), paidAt: dAt(-3, "11:34") },
      { patientId: ID.p1, conceptType: "paquete",  conceptRefId: ID.pb3, conceptLabel: "Saldo paquete · Tratamiento de Acné", amount: 90, status: "pendiente", payphoneLink: "https://ppls.me/k4n8rt", txId: "PP-2026061533", sentVia: "whatsapp", createdAt: dAt(-1, "09:40") },
      { patientId: ID.p2, conceptType: "libre",    conceptLabel: "Consulta + crioterapia",               amount: 70,    status: "pendiente", payphoneLink: "https://ppls.me/m3z1pv", txId: "PP-2026061602", createdAt: dAt(0, "08:30") },
    ],
  });

  console.log("[seed] facturas SRI");
  await prisma.invoice.createMany({
    data: [
      { number: "001-001-000000241", patientId: ID.p1, customerName: "María José Pérez Vallejo",  date: dAt(-20, "10:00"),
        lines: [{ serviceId: ID.sConsulta, description: "Consulta Dermatológica", quantity: 1, unitPrice: 40, vatRate: 0 }] as any,
        subtotal0: 40, subtotal15: 0, vatAmount: 0, total: 40,   accessKey: "_demo_001", status: "autorizada" },
      { number: "001-001-000000242", patientId: ID.p3, customerName: "Lucía Fernanda Ríos Cabrera", date: dAt(-6, "12:30"),
        lines: [{ serviceId: ID.sBotox, description: "Toxina Botulínica · tercio superior", quantity: 1, unitPrice: 320, vatRate: 15 }] as any,
        subtotal0: 0, subtotal15: 320, vatAmount: 48, total: 368, accessKey: "_demo_002", status: "autorizada" },
    ],
  });

  console.log("[seed] ✔ listo");
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
