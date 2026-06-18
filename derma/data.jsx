// DERMA-OS · store + datos simulados + utilidades (SRI, formato)
// ---------------------------------------------------------------

// ---------- Utilidades de fecha ----------
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const DIAS = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
const DIAS_CORTO = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function pad(n, l = 2) { return String(n).padStart(l, "0"); }

function dAt(offsetDays, hm) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const [h, m] = hm.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

const H = {
  uid: () => "id" + Math.random().toString(36).slice(2, 9),
  fmtDate(iso) { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; },
  fmtTime(iso) { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; },
  fmtDateLong(iso) { const d = new Date(iso); return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; },
  fmtDayShort(date) { return `${DIAS_CORTO[date.getDay()]}`; },
  fmtMoney(n) { return "$" + (n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); },
  age(birthIso) { const b = new Date(birthIso), t = new Date(); let a = t.getFullYear() - b.getFullYear(); if (t < new Date(t.getFullYear(), b.getMonth(), b.getDate())) a--; return a; },
  initials(p) { return (p.firstName[0] || "") + (p.lastName[0] || ""); },
  fullName(p) { return p ? `${p.firstName} ${p.lastName}` : "—"; },
  isToday(iso) { const d = new Date(iso), t = new Date(); return d.toDateString() === t.toDateString(); },
  sameDay(iso, date) { return new Date(iso).toDateString() === date.toDateString(); },
  nav(path) { location.hash = "#" + path; },

  calcTotals(lines) {
    let subtotal0 = 0, subtotal15 = 0;
    lines.forEach(l => {
      const amt = l.quantity * l.unitPrice;
      if (l.vatRate === 15) subtotal15 += amt; else subtotal0 += amt;
    });
    const vatAmount = subtotal15 * 0.15;
    return { subtotal0, subtotal15, vatAmount, total: subtotal0 + subtotal15 + vatAmount };
  },

  // Clave de acceso SRI · 49 dígitos con dígito verificador módulo 11
  accessKey(dateIso, seq) {
    const d = new Date(dateIso);
    const fecha = pad(d.getDate()) + pad(d.getMonth() + 1) + d.getFullYear();
    const base = fecha + "01" + EMISOR.ruc + "1" + "001001" + pad(seq, 9) + "17283946" + "1"; // 48 dígitos
    let sum = 0, mul = 2;
    for (let i = base.length - 1; i >= 0; i--) {
      sum += Number(base[i]) * mul;
      mul = mul === 7 ? 2 : mul + 1;
    }
    let dv = 11 - (sum % 11);
    if (dv === 11) dv = 0; if (dv === 10) dv = 1;
    return base + dv;
  },
};

const EMISOR = {
  razonSocial: "Derma Piel y Pelo Cía. Ltda.",
  nombreComercial: "Derma Piel y Pelo · Centro Dermatológico",
  ruc: "1792345678001",
  direccion: "Av. República de El Salvador N34-229 y Moscú, Quito",
  contribuyente: "Régimen General · Obligado a llevar contabilidad: SÍ",
};

const STATUS_META = {
  agendada:   { label: "Agendada",   color: "#8C7D6C", bg: "#F3EDE4" },
  confirmada: { label: "Confirmada", color: "#3E6B8C", bg: "#E9F0F5" },
  en_sala:    { label: "En sala",    color: "#B27A1F", bg: "#FAF0DB" },
  atendida:   { label: "Atendida",   color: "#3A8A5F", bg: "#E8F3EC" },
  no_show:    { label: "No asistió", color: "#BE4438", bg: "#FAE8E5" },
  cancelada:  { label: "Cancelada",  color: "#9A8D7D", bg: "#EFEAE3" },
};

const KIND_LABEL = { consulta_nueva: "Consulta nueva", control: "Control", procedimiento: "Procedimiento" };
const INVOICE_STATUS = {
  borrador:   { label: "Borrador",   cls: "bg-neutral" },
  generada:   { label: "Generada",   cls: "bg-info" },
  firmada:    { label: "Firmada",    cls: "bg-warn" },
  autorizada: { label: "Autorizada", cls: "bg-ok" },
  rechazada:  { label: "Rechazada",  cls: "bg-err" },
};
const CONSENT_STATUS = {
  pendiente: { label: "Pendiente de firma", cls: "bg-warn" },
  firmado:   { label: "Firmado",            cls: "bg-ok" },
  revocado:  { label: "Revocado",           cls: "bg-err" },
};

// M5 · Paquetes / bonos / abonos
const PAY_METHODS = {
  efectivo:      { label: "Efectivo" },
  tarjeta:       { label: "Tarjeta" },
  transferencia: { label: "Transferencia" },
  payphone:      { label: "Payphone" },
};

// M6 · Cobros / Payphone — conceptos y estados de un link de cobro
const PAY_CONCEPTS = {
  libre:     { label: "Cobro libre",          icon: "card" },
  deposito:  { label: "Depósito de reserva",  icon: "calendar" },
  paquete:   { label: "Paquete / bono",       icon: "layers" },
  factura:   { label: "Factura",              icon: "receipt" },
};
const PAY_STATUS = {
  pendiente: { label: "Pendiente", cls: "bg-warn" },
  pagado:    { label: "Pagado",    cls: "bg-ok" },
  anulado:   { label: "Anulado",   cls: "bg-neutral" },
};

// ---------- M1 · Roles, permisos y auditoría ----------
const ROLES = {
  admin:       { id: "admin",       label: "Dueño / Admin", short: "Admin",      color: "#00AC9A", mfa: true,  desc: "Acceso total al sistema y a la configuración." },
  recepcion:   { id: "recepcion",   label: "Recepción",     short: "Recepción",  color: "#0E7490", mfa: false, desc: "Agenda, pacientes, cobros y emisión de facturas." },
  profesional: { id: "profesional", label: "Profesional",   short: "Médico",     color: "#7A4A2B", mfa: false, desc: "Historia clínica, fotos y procedimientos." },
  esteticista: { id: "esteticista", label: "Esteticista",   short: "Estética",   color: "#B7791F", mfa: false, desc: "Procedimientos estéticos y evolución limitada." },
  contador:    { id: "contador",    label: "Contador",      short: "Contable",   color: "#5B6472", mfa: false, desc: "Facturación electrónica y reportes financieros." },
};

// Filas visibles de la matriz de permisos (orden de la especificación §7)
const PERM_MODULES = [
  { id: "agenda",          label: "Agenda" },
  { id: "pacientes",       label: "Pacientes (datos)" },
  { id: "historia",        label: "Historia clínica" },
  { id: "fotos",           label: "Fotos clínicas" },
  { id: "consentimientos", label: "Consentimientos" },
  { id: "paquetes",        label: "Paquetes / abonos" },
  { id: "pagos",           label: "Pagos / Payphone" },
  { id: "facturacion",     label: "Facturación SRI" },
  { id: "inventario",      label: "Inventario" },
  { id: "reportes",        label: "Reportes / KPIs" },
  { id: "sistema",         label: "Usuarios y auditoría" },
];

// Matriz de permisos. "—" = sin acceso. (procedimientos/servicios usados solo para la navegación)
const PERM = {
  admin:       { agenda: "Total", pacientes: "Total", historia: "Total", fotos: "Total", consentimientos: "Total", paquetes: "Total", pagos: "Total", facturacion: "Total", inventario: "Total", reportes: "Total", sistema: "Total", procedimientos: "Total", servicios: "Total" },
  recepcion:   { agenda: "Crear/editar", pacientes: "Crear/editar", historia: "—", fotos: "Miniaturas", consentimientos: "Gestionar firma", paquetes: "Vender/registrar", pagos: "Cobrar", facturacion: "Emitir", inventario: "Ver", reportes: "Limitado", sistema: "—", procedimientos: "Ver", servicios: "Ver" },
  profesional: { agenda: "Su agenda", pacientes: "Ver", historia: "Crear/editar", fotos: "Total", consentimientos: "Gestionar", paquetes: "Ver", pagos: "—", facturacion: "—", inventario: "Consumir", reportes: "Suyos", sistema: "—", procedimientos: "Total", servicios: "Ver" },
  esteticista: { agenda: "Su agenda", pacientes: "Ver", historia: "Limitado", fotos: "Subir/ver", consentimientos: "Gestionar", paquetes: "Ejecutar", pagos: "—", facturacion: "—", inventario: "Consumir", reportes: "Suyos", sistema: "—", procedimientos: "Total", servicios: "Ver" },
  contador:    { agenda: "Ver", pacientes: "Ver", historia: "—", fotos: "—", consentimientos: "—", paquetes: "Ver", pagos: "Ver/conciliar", facturacion: "Total", inventario: "Ver", reportes: "Financieros", sistema: "—", procedimientos: "—", servicios: "Ver" },
};

// ¿El rol tiene algún acceso al módulo?
function roleCan(roleId, moduleId) {
  const r = PERM[roleId];
  if (!r) return false;
  const v = r[moduleId];
  return !!v && v !== "—";
}

// Categorías de la bitácora de auditoría (para filtrar)
const AUDIT_CATS = {
  sesion:         { label: "Sesión",         color: "#5B6472" },
  historia:       { label: "Historia clínica", color: "#7A4A2B" },
  fotos:          { label: "Fotos clínicas", color: "#0E7490" },
  consentimiento: { label: "Consentimientos", color: "#B7791F" },
  facturacion:    { label: "Facturación",    color: "#1FA463" },
  paquetes:       { label: "Paquetes",       color: "#1A5C58" },
  pagos:          { label: "Cobros",         color: "#0E7490" },
  agenda:         { label: "Agenda",         color: "#00AC9A" },
  sistema:        { label: "Sistema",        color: "#E0414E" },
};

// ---------- Datos simulados ----------
function seed() {
  const professionals = [
    { id: "pr1", name: "Dra. Verónica Andrade", specialty: "Dermatología", registrationNo: "ACESS 1712-04-987654", color: "#7A4A2B" },
    { id: "pr2", name: "Dr. Esteban Cordero", specialty: "Dermatología", registrationNo: "ACESS 1709-11-123456", color: "#3E6B5C" },
  ];

  const services = [
    { id: "s1", name: "Consulta Dermatológica", category: "consulta", durationMin: 30, price: 40, vatRate: 0, active: true },
    { id: "s2", name: "Control Dermatológico", category: "consulta", durationMin: 20, price: 25, vatRate: 0, active: true },
    { id: "s3", name: "Tratamiento de Acné", category: "tratamiento", durationMin: 30, price: 55, vatRate: 0, active: true },
    { id: "s4", name: "Crioterapia (lesiones benignas)", category: "tratamiento", durationMin: 20, price: 45, vatRate: 0, active: true },
    { id: "s5", name: "Toxina Botulínica", category: "procedimiento_estetico", durationMin: 45, price: 320, vatRate: 15, active: true },
    { id: "s6", name: "Relleno con Ácido Hialurónico", category: "procedimiento_estetico", durationMin: 60, price: 380, vatRate: 15, active: true },
    { id: "s7", name: "Peeling Químico", category: "procedimiento_estetico", durationMin: 40, price: 90, vatRate: 15, active: true },
    { id: "s8", name: "Láser CO₂ Fraccionado", category: "procedimiento_estetico", durationMin: 60, price: 250, vatRate: 15, active: true },
    { id: "s9", name: "Dermatoscopia Digital", category: "estudio", durationMin: 30, price: 60, vatRate: 0, active: true },
  ];

  const patients = [
    { id: "p1", firstName: "María José", lastName: "Pérez Vallejo", idType: "cedula", idNumber: "1712345678", birthDate: "1991-03-14", sex: "F", email: "majo.perez@gmail.com", phone: "099 234 5678", city: "Quito", createdAt: dAt(-220, "09:00"), nextAppointment: dAt(0, "09:00"),
      background: { skinType: "III", usesSunscreen: true, sunscreenSpf: 50, allergies: ["Penicilina"], chronicConditions: [], currentMedications: ["Anticonceptivo oral"], familyHistory: ["Acné severo (madre)"], dermatologicalHistory: ["Acné moderado desde los 17 años"], smoker: false, notes: "Piel mixta con tendencia seborreica en zona T." } },
    { id: "p2", firstName: "Carlos Andrés", lastName: "Mora Sánchez", idType: "cedula", idNumber: "0926473811", birthDate: "1978-07-02", sex: "M", email: "camora78@hotmail.com", phone: "098 765 4321", city: "Quito", createdAt: dAt(-400, "09:00"), nextAppointment: dAt(1, "10:30"),
      background: { skinType: "IV", usesSunscreen: false, allergies: [], chronicConditions: ["Hipertensión arterial"], currentMedications: ["Losartán 50 mg"], familyHistory: [], dermatologicalHistory: ["Rosácea eritemato-telangiectásica"], smoker: true, notes: "Trabaja al aire libre; reforzar fotoprotección." } },
    { id: "p3", firstName: "Lucía Fernanda", lastName: "Ríos Cabrera", idType: "cedula", idNumber: "1804567231", birthDate: "1985-11-23", sex: "F", email: "lucia.rios@yahoo.com", phone: "096 112 3344", city: "Ambato", createdAt: dAt(-310, "09:00"), nextAppointment: dAt(0, "11:30"),
      background: { skinType: "II", usesSunscreen: true, sunscreenSpf: 100, allergies: ["Ácido acetilsalicílico"], chronicConditions: ["Hipotiroidismo"], currentMedications: ["Levotiroxina 75 µg"], familyHistory: ["Melasma (hermana)"], dermatologicalHistory: ["Melasma centrofacial"], smoker: false } },
    { id: "p4", firstName: "Jorge Luis", lastName: "Tapia Andrade", idType: "cedula", idNumber: "1758203946", birthDate: "2001-05-09", sex: "M", email: "jltapia01@gmail.com", phone: "099 887 6655", city: "Quito", createdAt: dAt(-90, "09:00"), nextAppointment: dAt(2, "15:00"),
      background: { skinType: "III", usesSunscreen: false, allergies: [], chronicConditions: [], currentMedications: [], familyHistory: [], dermatologicalHistory: ["Acné nódulo-quístico"], smoker: false, notes: "Candidato a isotretinoína si no responde a tópicos." } },
    { id: "p5", firstName: "Ana Cristina", lastName: "Velasco Puente", idType: "cedula", idNumber: "0103456789", birthDate: "1969-01-30", sex: "F", email: "acvelasco@gmail.com", phone: "098 443 2211", city: "Cuenca", createdAt: dAt(-700, "09:00"),
      background: { skinType: "II", usesSunscreen: true, sunscreenSpf: 50, allergies: ["Sulfas"], chronicConditions: ["Diabetes tipo 2"], currentMedications: ["Metformina 850 mg"], familyHistory: ["Melanoma (padre)"], dermatologicalHistory: ["Queratosis actínicas"], smoker: false, notes: "Control dermatoscópico anual por antecedente familiar de melanoma." } },
    { id: "p6", firstName: "Daniela Salomé", lastName: "Cueva León", idType: "cedula", idNumber: "1721987654", birthDate: "1996-09-17", sex: "F", email: "dani.cueva@gmail.com", phone: "097 556 6778", city: "Quito", createdAt: dAt(-45, "09:00"), nextAppointment: dAt(2, "10:00"),
      background: { skinType: "V", usesSunscreen: true, sunscreenSpf: 30, allergies: [], chronicConditions: ["Dermatitis atópica"], currentMedications: ["Cetirizina 10 mg PRN"], familyHistory: ["Atopia (madre y hermano)"], dermatologicalHistory: ["Dermatitis atópica desde la infancia", "Cicatrices post-acné"], smoker: false } },
  ];

  const prescriptionTemplates = [
    { id: "t1", name: "Fórmula Acné Severo", description: "Combinación tópica para acné inflamatorio", items: [
      { ingredients: [{ name: "Peróxido de benzoilo", concentration: "5%" }, { name: "Clindamicina", concentration: "1%" }], vehicle: "gel", quantity: "30 g", instructions: "Aplicar capa fina por las noches sobre piel limpia y seca. Usar protector solar en el día." } ] },
    { id: "t2", name: "Despigmentante Nocturno", description: "Fórmula para melasma e hiperpigmentación", items: [
      { ingredients: [{ name: "Hidroquinona", concentration: "4%" }, { name: "Tretinoína", concentration: "0.05%" }], vehicle: "crema base", quantity: "30 g", instructions: "Aplicar solo en las manchas por la noche, iniciar 3 veces por semana. Suspender si hay irritación. Fotoprotección estricta." } ] },
    { id: "t3", name: "Rosácea Tópica", description: "Mantenimiento de rosácea leve a moderada", items: [
      { ingredients: [{ name: "Metronidazol", concentration: "0.75%" }], vehicle: "gel", quantity: "30 g", instructions: "Aplicar en mejillas y nariz dos veces al día. Evitar desencadenantes: sol, alcohol, comidas picantes." } ] },
  ];

  const clinicalRecords = [
    // — María José (p1): acné · evoluciones + recetas
    { id: "cr1", patientId: "p1", type: "evolucion", date: dAt(-112, "09:30"), professionalId: "pr1",
      subjective: "Acude por brote de lesiones inflamatorias en mejillas y mentón de 3 semanas de evolución, dolorosas a la palpación.",
      objective: "Pápulas y pústulas en mejillas y mentón, comedones abiertos en frente. No nódulos. Seborrea moderada.",
      assessment: "Acné vulgar moderado, predominio inflamatorio.", cie10Codes: ["L70.0"],
      plan: "Inicia fórmula magistral (peróxido de benzoilo + clindamicina). Fotoprotección diaria. Control en 6 semanas." },
    { id: "cr2", patientId: "p1", type: "receta", date: dAt(-112, "09:45"), professionalId: "pr1",
      prescription: { templateId: "t1", items: prescriptionTemplates[0].items } },
    { id: "cr3", patientId: "p1", type: "evolucion", date: dAt(-56, "10:00"), professionalId: "pr1",
      subjective: "Refiere mejoría notable; menos lesiones nuevas. Leve resequedad perioral los primeros días.",
      objective: "Disminución ~60% de pápulas inflamatorias. Persisten comedones en frente. Sin efectos adversos relevantes.",
      assessment: "Acné vulgar en mejoría con tratamiento tópico.", cie10Codes: ["L70.0"],
      plan: "Continuar fórmula nocturna. Se agrega limpiador con ácido salicílico. Control en 8 semanas." },
    { id: "cr4", patientId: "p1", type: "receta", date: dAt(-56, "10:15"), professionalId: "pr1",
      prescription: { items: [ { ingredients: [{ name: "Ácido salicílico", concentration: "2%" }], vehicle: "gel limpiador", quantity: "120 ml", instructions: "Lavar rostro mañana y noche con agua tibia. Continuar fórmula nocturna habitual." } ] } },
    { id: "cr5", patientId: "p1", type: "evolucion", date: dAt(-3, "09:00"), professionalId: "pr1",
      subjective: "Asintomática. Le preocupan máculas residuales hiperpigmentadas en mejillas.",
      objective: "Piel sin lesiones inflamatorias activas. Máculas post-inflamatorias café claro en mejillas.",
      assessment: "Acné resuelto. Hiperpigmentación post-inflamatoria.", cie10Codes: ["L70.0", "L81.0"],
      plan: "Mantenimiento con retinoide suave. Valorar despigmentante si no aclara en 3 meses." },
    // — Carlos (p2): rosácea
    { id: "cr6", patientId: "p2", type: "evolucion", date: dAt(-30, "11:00"), professionalId: "pr2",
      subjective: "Enrojecimiento facial persistente con episodios de ardor, empeora con el sol y el ejercicio.",
      objective: "Eritema centrofacial con telangiectasias en mejillas y nariz. Escasas pápulas. No fimas.",
      assessment: "Rosácea eritemato-telangiectásica con componente papular leve.", cie10Codes: ["L71.0"],
      plan: "Metronidazol tópico, fotoprotección estricta, evitar desencadenantes. Control en 8 semanas." },
    { id: "cr7", patientId: "p2", type: "receta", date: dAt(-30, "11:15"), professionalId: "pr2",
      prescription: { templateId: "t3", items: prescriptionTemplates[2].items } },
    // — Lucía (p3): melasma + botox
    { id: "cr8", patientId: "p3", type: "evolucion", date: dAt(-70, "16:00"), professionalId: "pr1",
      subjective: "Consulta por manchas faciales que se acentuaron tras vacaciones en la playa.",
      objective: "Máculas café claro simétricas en frente, mejillas y labio superior. Patrón centrofacial. Luz de Wood: refuerzo epidérmico.",
      assessment: "Melasma centrofacial, componente epidérmico.", cie10Codes: ["L81.1"],
      plan: "Despigmentante nocturno + fotoprotector con color SPF 100 cada 3 horas. Fotos de control. Revaloración en 10 semanas." },
    { id: "cr9", patientId: "p3", type: "receta", date: dAt(-70, "16:15"), professionalId: "pr1",
      prescription: { templateId: "t2", items: prescriptionTemplates[1].items } },
    { id: "cr10", patientId: "p3", type: "evolucion", date: dAt(-7, "15:00"), professionalId: "pr1",
      subjective: "Nota aclaramiento de manchas. Solicita además tratamiento para líneas de expresión en tercio superior.",
      objective: "Melasma con aclaramiento parcial (~50%). Líneas dinámicas en frente y entrecejo, grado moderado.",
      assessment: "Melasma en mejoría. Ritides dinámicas de tercio superior.", cie10Codes: ["L81.1"],
      plan: "Continuar despigmentante. Se programa toxina botulínica en tercio superior; se entrega consentimiento informado." },
  ];

  const appointments = [
    { id: "a1", patientId: "p1", serviceId: "s2", professionalId: "pr1", start: dAt(0, "09:00"), end: dAt(0, "09:20"), kind: "control", status: "atendida" },
    { id: "a2", patientId: "p5", serviceId: "s9", professionalId: "pr2", start: dAt(0, "10:00"), end: dAt(0, "10:30"), kind: "control", status: "en_sala" },
    { id: "a3", patientId: "p3", serviceId: "s5", professionalId: "pr1", start: dAt(0, "11:30"), end: dAt(0, "12:15"), kind: "procedimiento", status: "confirmada", notes: "Toxina botulínica tercio superior. Consentimiento firmado." },
    { id: "a4", patientId: "p6", serviceId: "s1", professionalId: "pr2", start: dAt(0, "15:30"), end: dAt(0, "16:00"), kind: "consulta_nueva", status: "agendada" },
    { id: "a5", patientId: "p2", serviceId: "s2", professionalId: "pr2", start: dAt(1, "10:30"), end: dAt(1, "10:50"), kind: "control", status: "confirmada" },
    { id: "a6", patientId: "p4", serviceId: "s3", professionalId: "pr1", start: dAt(2, "15:00"), end: dAt(2, "15:30"), kind: "control", status: "agendada" },
    { id: "a7", patientId: "p6", serviceId: "s8", professionalId: "pr1", start: dAt(2, "10:00"), end: dAt(2, "11:00"), kind: "procedimiento", status: "agendada", notes: "Láser CO₂ para cicatrices post-acné. PENDIENTE consentimiento." },
    { id: "a8", patientId: "p5", serviceId: "s4", professionalId: "pr2", start: dAt(-1, "12:00"), end: dAt(-1, "12:20"), kind: "procedimiento", status: "atendida" },
    { id: "a9", patientId: "p4", serviceId: "s1", professionalId: "pr1", start: dAt(-1, "16:30"), end: dAt(-1, "17:00"), kind: "consulta_nueva", status: "no_show" },
    { id: "a10", patientId: "p2", serviceId: "s1", professionalId: "pr2", start: dAt(-2, "09:30"), end: dAt(-2, "10:00"), kind: "control", status: "cancelada", notes: "Reagendada por el paciente." },
    { id: "a11", patientId: "p1", serviceId: "s7", professionalId: "pr1", start: dAt(3, "11:00"), end: dAt(3, "11:40"), kind: "procedimiento", status: "agendada", notes: "Peeling para hiperpigmentación post-inflamatoria." },
  ];

  // Imágenes sintéticas (SVG → dataURL) — el demo no usa archivos reales, pero el slider y el lightbox sí muestran imagen
  const fakeSkin = (hue, spots, label) => {
    const dots = Array.from({ length: spots }, (_, i) => {
      const cx = 60 + ((i * 47) % 290), cy = 70 + ((i * 83) % 170);
      const r = 6 + (i % 5) * 2, op = 0.35 + ((i * 13) % 30) / 100;
      return `<circle cx='${cx}' cy='${cy}' r='${r}' fill='hsla(${hue},48%,32%,${op.toFixed(2)})'/>`;
    }).join("");
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' preserveAspectRatio='xMidYMid slice'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='hsl(${hue},38%,84%)'/><stop offset='1' stop-color='hsl(${hue},32%,70%)'/></linearGradient></defs><rect width='400' height='300' fill='url(#g)'/>${dots}<text x='14' y='290' font-family='sans-serif' font-size='11' font-weight='700' fill='rgba(0,0,0,.55)' letter-spacing='1'>${label}</text></svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  };
  const fakeLines = (hue, lines, label) => {
    const ls = Array.from({ length: lines }, (_, i) => {
      const y = 90 + i * 28, len = 240 - (i % 2) * 60, x = (400 - len) / 2;
      const dip = 8 + (i % 3) * 3;
      return `<path d='M${x},${y} q${len / 2},${-dip} ${len},0' stroke='hsla(${hue},45%,28%,.55)' stroke-width='2.3' fill='none'/>`;
    }).join("");
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' preserveAspectRatio='xMidYMid slice'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='hsl(${hue},38%,85%)'/><stop offset='1' stop-color='hsl(${hue},30%,72%)'/></linearGradient></defs><rect width='400' height='300' fill='url(#g)'/>${ls}<text x='14' y='290' font-family='sans-serif' font-size='11' font-weight='700' fill='rgba(0,0,0,.55)' letter-spacing='1'>${label}</text></svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  };

  const photos = [
    { id: "ph1", patientId: "p3", date: dAt(-70, "16:20"), bodyArea: "Rostro · frontal", lesionTag: "Melasma centrofacial", caption: "Basal, antes de despigmentante", kind: "basal",   url: fakeSkin(28, 22, "BASAL · semana 0") },
    { id: "ph2", patientId: "p3", date: dAt(-7,  "15:20"), bodyArea: "Rostro · frontal", lesionTag: "Melasma centrofacial", caption: "Control 9 semanas de tratamiento", kind: "control", url: fakeSkin(28, 6,  "CONTROL · semana 9") },
    { id: "ph3", patientId: "p3", date: dAt(-7,  "15:25"), bodyArea: "Tercio superior", lesionTag: "Toxina botulínica",    caption: "Antes del procedimiento", kind: "basal",   url: fakeLines(22, 5, "BASAL · sin gesto") },
    { id: "ph4", patientId: "p3", date: dAt(0,   "12:10"), bodyArea: "Tercio superior", lesionTag: "Toxina botulínica",    caption: "Inmediato post-aplicación", kind: "control", url: fakeLines(22, 1, "POST · día 0") },
    { id: "ph5", patientId: "p1", date: dAt(-112,"09:35"), bodyArea: "Mejillas",        lesionTag: "Acné vulgar",           caption: "Brote inflamatorio basal", kind: "basal",   url: fakeSkin(8,  18, "BASAL · brote") },
    { id: "ph6", patientId: "p1", date: dAt(-3,  "09:10"), bodyArea: "Mejillas",        lesionTag: "Acné vulgar",           caption: "Resolución de lesiones activas", kind: "control", url: fakeSkin(8,  3,  "CONTROL · 16 sem") },
  ];

  const consentTemplates = [
    { id: "ct1", kind: "clinico", title: "Consentimiento informado · Toxina Botulínica", procedureType: "Toxina Botulínica",
      body: "Declaro que he sido informada/o por el profesional tratante sobre la naturaleza del procedimiento de aplicación de toxina botulínica tipo A con fines estéticos, sus beneficios esperados, alternativas disponibles y riesgos posibles (equimosis, cefalea transitoria, asimetría temporal, ptosis palpebral infrecuente). Entiendo que los resultados son temporales (3–6 meses) y que puedo revocar este consentimiento antes del procedimiento. Se me ha permitido realizar preguntas, las cuales fueron respondidas a mi satisfacción. (Formulario 024 · Acuerdo Ministerial 5316, MSP Ecuador)." },
    { id: "ct2", kind: "clinico", title: "Consentimiento informado · Láser CO₂ Fraccionado", procedureType: "Láser CO₂",
      body: "Declaro haber sido informada/o sobre el procedimiento de láser CO₂ fraccionado, indicado para el tratamiento de cicatrices y fotoenvejecimiento, así como sus riesgos: eritema y edema transitorios, hiperpigmentación post-inflamatoria (mayor riesgo en fototipos altos), infección y cicatrización anómala infrecuentes. Me comprometo a cumplir las indicaciones de cuidado posterior y fotoprotección estricta. Puedo revocar este consentimiento antes del procedimiento. (Formulario 024 · Acuerdo Ministerial 5316, MSP Ecuador)." },
    { id: "ct3", kind: "clinico", title: "Consentimiento informado · Peeling Químico", procedureType: "Peeling Químico",
      body: "Declaro haber sido informada/o sobre el procedimiento de peeling químico (ácidos α-hidroxiácidos, salicílico o tricloroacético), sus beneficios y riesgos (eritema, descamación, hiperpigmentación, herpes simple recidivante, cicatriz infrecuente). Me comprometo a cumplir las indicaciones de cuidado posterior y fotoprotección estricta SPF 50+ durante al menos 30 días. Puedo revocar este consentimiento antes del procedimiento. (Formulario 024 · MSP Ecuador)." },
    { id: "ci1", kind: "imagen", title: "Cesión de derechos de imagen · Uso clínico-académico", procedureType: "Uso de imagen",
      body: "Autorizo al centro Derma Piel y Pelo a tomar, conservar y utilizar fotografías clínicas (rostro o área tratada) exclusivamente para historia clínica, control de evolución y discusión académica entre profesionales tratantes. Las imágenes NO serán publicadas en redes sociales, web ni medios de comunicación. Esta autorización puede revocarse por escrito en cualquier momento, sin que ello afecte a la atención médica recibida. (Ley Orgánica de Protección de Datos Personales · Ecuador, art. 21)." },
    { id: "ci2", kind: "imagen", title: "Cesión de derechos de imagen · Uso comercial / redes", procedureType: "Difusión de imagen",
      body: "Autorizo a Derma Piel y Pelo a utilizar mis fotografías de antes/después con fines de difusión en redes sociales, página web y material publicitario del centro, en condiciones que preserven mi identidad cuando así lo indique. Entiendo que el centro evitará identificarme por nombre y que puedo revocar esta autorización en cualquier momento; sin embargo, una vez publicado el contenido en plataformas de terceros, el centro no garantiza la eliminación inmediata fuera de sus canales propios. (LOPDP Ecuador · consentimiento expreso e informado)." },
  ];

  // Firmas manuscritas simuladas para los consentimientos ya firmados del seed
  const fakeSig = (slant) => {
    const path = `M10 50 Q40 ${20 + slant} 70 50 T130 ${50 - slant} T200 50 T260 ${50 + slant} L295 60`;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 80'><rect width='300' height='80' fill='#fff'/><path d='${path}' stroke='#1F2937' stroke-width='2.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  };

  const consents = [
    { id: "c1", patientId: "p3", templateId: "ct1", procedureId: "proc1", status: "firmado", signedAt: dAt(-7, "15:30"), signatureUrl: fakeSig(10) },
    { id: "c2", patientId: "p6", templateId: "ct2", status: "pendiente" },
    { id: "c3", patientId: "p3", templateId: "ci1", status: "firmado", signedAt: dAt(-70, "16:25"), signatureUrl: fakeSig(15) },
    { id: "c4", patientId: "p1", templateId: "ci2", status: "pendiente" },
  ];

  const procedures = [
    { id: "proc1", patientId: "p3", serviceId: "s5", professionalId: "pr1", date: dAt(0, "11:30"),
      productUsed: "Toxina botulínica tipo A (Botox®)", units: 24, lotNumber: "B7231-EC", expiry: "2027-02-01",
      injectionAreas: ["Frente", "Entrecejo", "Patas de gallo"], consentId: "c1", photoIds: ["ph3", "ph4"],
      notes: "Dilución 100 U / 2.5 ml. Sin complicaciones inmediatas. Control en 15 días." },
    { id: "proc2", patientId: "p6", serviceId: "s8", professionalId: "pr1", date: dAt(2, "10:00"),
      productUsed: "Láser CO₂ fraccionado", injectionAreas: ["Mejillas"], consentId: null, photoIds: [],
      notes: "Programado. BLOQUEADO: requiere consentimiento firmado antes de realizarse." },
  ];

  const inventory = [
    { id: "i1", name: "Toxina botulínica tipo A · vial 100 U", type: "vial", unit: "vial", stock: 4, minStock: 2, lotNumber: "B7231-EC", expiryDate: "2027-02-01" },
    { id: "i2", name: "Ácido hialurónico · jeringa 1 ml", type: "vial", unit: "jeringa", stock: 2, minStock: 2, lotNumber: "HA-5520", expiryDate: "2026-11-15" },
    { id: "i3", name: "Hidroquinona (materia prima)", type: "principio_activo", unit: "g", stock: 180, minStock: 50, lotNumber: "HQ-2210" },
    { id: "i4", name: "Tretinoína (materia prima)", type: "principio_activo", unit: "g", stock: 22, minStock: 10, lotNumber: "TR-0915" },
    { id: "i5", name: "Peróxido de benzoilo (materia prima)", type: "principio_activo", unit: "g", stock: 320, minStock: 100, lotNumber: "PB-1188" },
    { id: "i6", name: "Clindamicina (materia prima)", type: "principio_activo", unit: "g", stock: 38, minStock: 40, lotNumber: "CL-0744" },
    { id: "i7", name: "Agujas 30G ½\"", type: "insumo", unit: "unidad", stock: 12, minStock: 20 },
    { id: "i8", name: "Guantes de nitrilo M", type: "insumo", unit: "par", stock: 160, minStock: 50 },
    { id: "i9", name: "Ácido tricloroacético 20%", type: "farmaco", unit: "ml", stock: 45, minStock: 30, lotNumber: "TCA-3301", expiryDate: "2026-08-20" },
  ];

  const inv = (n, dateIso, patientId, lines, status) => {
    const t = H.calcTotals(lines);
    return { id: "f" + n, number: "001-001-" + pad(240 + n, 9), patientId, date: dateIso, lines,
      subtotal0: t.subtotal0, subtotal15: t.subtotal15, vatAmount: t.vatAmount, total: t.total,
      accessKey: H.accessKey(dateIso, 240 + n), status };
  };

  const invoices = [
    inv(1, dAt(-20, "10:00"), "p1", [{ serviceId: "s1", description: "Consulta Dermatológica", quantity: 1, unitPrice: 40, vatRate: 0 }], "autorizada"),
    inv(2, dAt(-6, "12:30"), "p3", [{ serviceId: "s5", description: "Toxina Botulínica · tercio superior", quantity: 1, unitPrice: 320, vatRate: 15 }], "autorizada"),
    inv(3, dAt(-1, "12:40"), "p5", [
      { serviceId: "s2", description: "Control Dermatológico", quantity: 1, unitPrice: 25, vatRate: 0 },
      { serviceId: "s4", description: "Crioterapia (2 lesiones)", quantity: 2, unitPrice: 45, vatRate: 0 },
      { serviceId: "s7", description: "Peeling Químico superficial", quantity: 1, unitPrice: 90, vatRate: 15 },
    ], "autorizada"),
  ];

  // M1 · Usuarios del sistema (RBAC simulado)
  const users = [
    { id: "u1", name: "Christopher Gallardo", role: "admin",       email: "admin@dermapielypelo.ec",         mfaEnabled: true,  active: true,  professionalId: null,  lastAccess: dAt(0, "08:12") },
    { id: "u2", name: "Gabriela Naranjo",     role: "recepcion",   email: "recepcion@dermapielypelo.ec",     mfaEnabled: false, active: true,  professionalId: null,  lastAccess: dAt(0, "07:50") },
    { id: "u3", name: "Dra. Verónica Andrade", role: "profesional", email: "v.andrade@dermapielypelo.ec",     mfaEnabled: true,  active: true,  professionalId: "pr1", lastAccess: dAt(-1, "17:40") },
    { id: "u4", name: "Dr. Esteban Cordero",  role: "profesional", email: "e.cordero@dermapielypelo.ec",     mfaEnabled: false, active: true,  professionalId: "pr2", lastAccess: dAt(0, "09:05") },
    { id: "u5", name: "Mishell Pazmiño",      role: "esteticista", email: "estetica@dermapielypelo.ec",      mfaEnabled: false, active: true,  professionalId: null,  lastAccess: dAt(-2, "12:10") },
    { id: "u6", name: "Andrés Salas",         role: "contador",    email: "contabilidad@dermapielypelo.ec",  mfaEnabled: false, active: false, professionalId: null,  lastAccess: dAt(-9, "15:20") },
  ];

  // M1 · Bitácora de auditoría (toda apertura de historia/foto/factura queda registrada)
  const auditLogs = [
    { id: "al1",  userId: "u1", action: "Inició sesión",                   cat: "sesion",         label: "MFA verificado",                     at: dAt(0, "08:12"),  ip: "190.95.142.10" },
    { id: "al2",  userId: "u4", action: "Abrió historia clínica",          cat: "historia",       label: "Ana Cristina Velasco Puente",        at: dAt(0, "09:06"),  ip: "192.168.1.24" },
    { id: "al3",  userId: "u3", action: "Registró evolución",              cat: "historia",       label: "María José Pérez Vallejo",           at: dAt(-3, "09:05"), ip: "192.168.1.31" },
    { id: "al4",  userId: "u2", action: "Agendó cita",                     cat: "agenda",         label: "Daniela Salomé Cueva León",          at: dAt(-1, "16:20"), ip: "192.168.1.12" },
    { id: "al5",  userId: "u1", action: "Emitió factura electrónica",      cat: "facturacion",    label: "Factura 001-001-000000243",          at: dAt(-1, "12:41"), ip: "190.95.142.10" },
    { id: "al6",  userId: "u3", action: "Firmó consentimiento",            cat: "consentimiento", label: "Toxina Botulínica · Lucía Ríos",     at: dAt(-7, "15:30"), ip: "192.168.1.31" },
    { id: "al7",  userId: "u2", action: "Intento de acceso denegado",      cat: "sistema",        label: "Historia clínica · sin permiso",     at: dAt(-2, "10:14"), ip: "192.168.1.12" },
    { id: "al8",  userId: "u5", action: "Visualizó fotos clínicas",        cat: "fotos",          label: "Lucía Fernanda Ríos Cabrera",        at: dAt(-2, "12:12"), ip: "192.168.1.40" },
    { id: "al9",  userId: "u4", action: "Inició sesión",                   cat: "sesion",         label: "Sesión iniciada",                    at: dAt(0, "09:05"), ip: "192.168.1.24" },
    { id: "al10", userId: "u1", action: "Modificó permisos de usuario",    cat: "sistema",        label: "Andrés Salas · desactivado",         at: dAt(-9, "15:25"), ip: "190.95.142.10" },
  ];

  // M5 · Catálogo de paquetes / bonos de sesiones
  const packages = [
    { id: "pk1", serviceId: "s8", name: "Láser CO₂ Fraccionado · 4 sesiones", sessions: 4, price: 850, intervalDays: 30, validityDays: 240, active: true },
    { id: "pk2", serviceId: "s7", name: "Peeling Químico · 6 sesiones",        sessions: 6, price: 450, intervalDays: 21, validityDays: 210, active: true },
    { id: "pk3", serviceId: "s5", name: "Toxina Botulínica · 3 aplicaciones",  sessions: 3, price: 840, intervalDays: 120, validityDays: 365, active: true },
    { id: "pk4", serviceId: "s3", name: "Tratamiento de Acné · 8 sesiones",    sessions: 8, price: 360, intervalDays: 14, validityDays: 180, active: true },
  ];

  // M5 · Paquetes vendidos a pacientes (saldo de sesiones + abonos)
  const packageBalances = [
    // Lucía (p3) · Botox 3 aplicaciones · 1 usada · abono parcial 50%
    { id: "pb1", patientId: "p3", packageId: "pk3", soldAt: dAt(-7, "15:35"), sellerProfessionalId: "pr1",
      sessionsTotal: 3, sessionsUsed: 1, price: 840, vencimiento: dAt(358, "23:59"),
      payments: [{ id: "py1", amount: 420, method: "transferencia", at: dAt(-7, "15:35"), note: "Abono inicial 50%" }],
      redemptions: [{ id: "rd1", at: dAt(-7, "15:40"), appointmentId: null, professionalId: "pr1", note: "1ª aplicación · tercio superior" }],
      status: "activo" },
    // Daniela (p6) · Láser CO₂ 4 sesiones · sin usar · pagado completo
    { id: "pb2", patientId: "p6", packageId: "pk1", soldAt: dAt(-12, "10:00"), sellerProfessionalId: "pr1",
      sessionsTotal: 4, sessionsUsed: 0, price: 850, vencimiento: dAt(228, "23:59"),
      payments: [{ id: "py2", amount: 850, method: "tarjeta", at: dAt(-12, "10:05"), note: "Pago total" }],
      redemptions: [], status: "activo" },
    // María José (p1) · Acné 8 sesiones · 3 usadas · abonos varios (saldo pendiente)
    { id: "pb3", patientId: "p1", packageId: "pk4", soldAt: dAt(-100, "09:50"), sellerProfessionalId: "pr1",
      sessionsTotal: 8, sessionsUsed: 3, price: 360, vencimiento: dAt(80, "23:59"),
      payments: [
        { id: "py3", amount: 180, method: "efectivo", at: dAt(-100, "09:50"), note: "Abono inicial" },
        { id: "py4", amount: 90, method: "transferencia", at: dAt(-56, "10:20"), note: "2º abono" },
      ],
      redemptions: [
        { id: "rd2", at: dAt(-100, "10:00"), appointmentId: null, professionalId: "pr1", note: "Sesión 1" },
        { id: "rd3", at: dAt(-72, "10:00"), appointmentId: null, professionalId: "pr1", note: "Sesión 2" },
        { id: "rd4", at: dAt(-44, "10:00"), appointmentId: null, professionalId: "pr1", note: "Sesión 3" },
      ],
      status: "activo" },
  ];

  // M6 · Cobros / links de pago Payphone (pagos parciales, depósitos, conciliación)
  const payments = [
    // Pagado · depósito de reserva (30%) para el láser CO₂ de Daniela
    { id: "pay1", patientId: "p6", concept: { type: "deposito", refId: "a7", label: "Depósito reserva · Láser CO₂ (30%)" }, amount: 75, method: "payphone", status: "pagado", payphoneLink: "https://ppls.me/dq7m2x", txId: "PP-2026061412", sentVia: "whatsapp", createdAt: dAt(-3, "11:20"), paidAt: dAt(-3, "11:34"), note: "" },
    // Pendiente · saldo del bono de acné de María José — al conciliar registra abono en pb3
    { id: "pay2", patientId: "p1", concept: { type: "paquete", refId: "pb3", label: "Saldo paquete · Tratamiento de Acné" }, amount: 90, method: "payphone", status: "pendiente", payphoneLink: "https://ppls.me/k4n8rt", txId: "PP-2026061533", sentVia: "whatsapp", createdAt: dAt(-1, "09:40"), paidAt: null, note: "" },
    // Pagado · factura electrónica autorizada (Ana Cristina)
    { id: "pay3", patientId: "p5", concept: { type: "factura", refId: "f3", label: "Factura 001-001-000000243" }, amount: 218.50, method: "payphone", status: "pagado", payphoneLink: "https://ppls.me/9whb6c", txId: "PP-2026061501", sentVia: "email", createdAt: dAt(-1, "12:42"), paidAt: dAt(-1, "12:55"), note: "" },
    // Pendiente · cobro libre, generado hoy y aún sin enviar (Carlos)
    { id: "pay4", patientId: "p2", concept: { type: "libre", refId: null, label: "Consulta + crioterapia (2 lesiones)" }, amount: 70, method: "payphone", status: "pendiente", payphoneLink: "https://ppls.me/m3z1pv", txId: "PP-2026061602", sentVia: null, createdAt: dAt(0, "08:30"), paidAt: null, note: "" },
    // Anulado · depósito que el paciente no completó (Jorge)
    { id: "pay5", patientId: "p4", concept: { type: "deposito", refId: null, label: "Depósito reserva · Consulta" }, amount: 15, method: "payphone", status: "anulado", payphoneLink: "https://ppls.me/t8x0qd", txId: "PP-2026061188", sentVia: "whatsapp", createdAt: dAt(-2, "16:10"), paidAt: null, note: "Link expirado, el paciente reagendó." },
  ];

  return {
    version: SEED_VERSION,
    professionals, services, patients, prescriptionTemplates, clinicalRecords,
    appointments, photos, consentTemplates, consents, procedures, inventory, invoices,
    packages, packageBalances, payments,
    users, auditLogs, session: { userId: null, ip: null },
    modal: null, sidebarCollapsed: false, invoiceSeq: 244,
  };
}

// ---------- Store (pub/sub + persistencia) ----------
const SEED_VERSION = 8;
const LS_KEY = "dermaos_demo_v1";

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s.version === SEED_VERSION) return { ...s, modal: null };
    }
  } catch (e) { /* re-seed */ }
  return seed();
}

let _state = loadState();
const _listeners = new Set();

function getState() { return _state; }
function set(patch) {
  _state = { ..._state, ...(typeof patch === "function" ? patch(_state) : patch) };
  try { localStorage.setItem(LS_KEY, JSON.stringify({ ..._state, modal: null })); } catch (e) {}
  _listeners.forEach(l => l());
}
function useStore() {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => { _listeners.add(force); return () => _listeners.delete(force); }, []);
  return _state;
}

// Selectors (regla §5.1: separación evolución / recetas a nivel de datos)
const SEL = {
  evolutionByPatient: (s, pid) => s.clinicalRecords.filter(r => r.patientId === pid && r.type === "evolucion").sort((a, b) => b.date.localeCompare(a.date)),
  prescriptionsByPatient: (s, pid) => s.clinicalRecords.filter(r => r.patientId === pid && r.type === "receta").sort((a, b) => b.date.localeCompare(a.date)),
  patient: (s, id) => s.patients.find(p => p.id === id),
  service: (s, id) => s.services.find(x => x.id === id),
  professional: (s, id) => s.professionals.find(x => x.id === id),
  signedConsentsByPatient: (s, pid) => s.consents.filter(c => c.patientId === pid && c.status === "firmado"),
  lowStock: (s) => s.inventory.filter(i => i.stock <= i.minStock),
  currentUser: (s) => s.session && s.session.userId ? s.users.find(u => u.id === s.session.userId) : null,
  user: (s, id) => s.users.find(u => u.id === id),
  // M5 · Paquetes
  package: (s, id) => s.packages.find(p => p.id === id),
  packageBalancesByPatient: (s, pid) => s.packageBalances.filter(b => b.patientId === pid).sort((a, b) => b.soldAt.localeCompare(a.soldAt)),
  // Bono activo del paciente que cubre un servicio y aún tiene sesiones disponibles
  activeBalanceForService: (s, pid, serviceId) => s.packageBalances.find(b => {
    if (b.patientId !== pid || b.status !== "activo" || b.sessionsUsed >= b.sessionsTotal) return false;
    if (new Date(b.vencimiento) < new Date()) return false;
    const pk = s.packages.find(p => p.id === b.packageId);
    return pk && pk.serviceId === serviceId;
  }),
  // Bono cuyo consumo quedó ligado a una cita concreta
  balanceByRedemptionAppt: (s, apptId) => s.packageBalances.find(b => b.redemptions.some(r => r.appointmentId === apptId)),
  // M6 · Cobros / Payphone
  payment: (s, id) => s.payments.find(p => p.id === id),
  paymentsByPatient: (s, pid) => s.payments.filter(p => p.patientId === pid).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
};

// Helpers de cálculo para paquetes (importe abonado / saldos)
const PKG = {
  paid: (b) => b.payments.reduce((t, x) => t + (Number(x.amount) || 0), 0),
  econBalance: (b) => b.price - b.payments.reduce((t, x) => t + (Number(x.amount) || 0), 0),
  sessionsLeft: (b) => b.sessionsTotal - b.sessionsUsed,
  expired: (b) => new Date(b.vencimiento) < new Date(),
};

// IP de sesión simulada (LAN del consultorio)
function fakeIp() { return "192.168.1." + (10 + Math.floor(Math.random() * 60)); }

// Acciones de dominio (en Fase 2 → Supabase)
const A = {
  open(type, props = {}) { set({ modal: { type, props } }); },
  close() { set({ modal: null }); },
  toggleSidebar() { set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })); },
  resetDemo() { localStorage.removeItem(LS_KEY); _state = seed(); _listeners.forEach(l => l()); },

  // ---- M1 · Sesión + auditoría ----
  audit(action, cat, label) {
    const uid = _state.session && _state.session.userId;
    if (!uid) return;
    const ip = (_state.session && _state.session.ip) || fakeIp();
    set(s => ({ auditLogs: [{ id: H.uid(), userId: uid, action, cat: cat || "sistema", label: label || "", at: new Date().toISOString(), ip }, ...s.auditLogs] }));
  },
  login(userId) {
    const ip = fakeIp();
    const u = _state.users.find(x => x.id === userId);
    set(s => ({
      session: { userId, ip },
      users: s.users.map(x => x.id === userId ? { ...x, lastAccess: new Date().toISOString() } : x),
      auditLogs: [{ id: H.uid(), userId, action: "Inició sesión", cat: "sesion", label: u && u.mfaEnabled ? "MFA verificado" : "Sesión iniciada", at: new Date().toISOString(), ip }, ...s.auditLogs],
    }));
  },
  switchUser(userId) {
    const ip = fakeIp();
    set(s => ({
      session: { userId, ip },
      users: s.users.map(x => x.id === userId ? { ...x, lastAccess: new Date().toISOString() } : x),
      auditLogs: [{ id: H.uid(), userId, action: "Cambió de usuario activo", cat: "sesion", label: "Selector de rol (demo)", at: new Date().toISOString(), ip }, ...s.auditLogs],
    }));
    H.nav("/");
  },
  logout() {
    const uid = _state.session && _state.session.userId;
    set(s => ({
      session: { userId: null, ip: null },
      auditLogs: uid ? [{ id: H.uid(), userId: uid, action: "Cerró sesión", cat: "sesion", label: "", at: new Date().toISOString(), ip: (s.session && s.session.ip) || fakeIp() }, ...s.auditLogs] : s.auditLogs,
    }));
  },
  toggleUserActive(id) {
    let nowActive = null, name = "";
    set(s => ({ users: s.users.map(u => { if (u.id === id) { nowActive = !u.active; name = u.name; return { ...u, active: !u.active }; } return u; }) }));
    A.audit("Modificó permisos de usuario", "sistema", `${name} · ${nowActive ? "activado" : "desactivado"}`);
  },
  toggleUserMfa(id) {
    let name = "", on = null;
    set(s => ({ users: s.users.map(u => { if (u.id === id) { on = !u.mfaEnabled; name = u.name; return { ...u, mfaEnabled: !u.mfaEnabled }; } return u; }) }));
    A.audit("Modificó permisos de usuario", "sistema", `${name} · MFA ${on ? "activado" : "desactivado"}`);
  },

  addAppointment(a) {
    const appt = { ...a, id: H.uid(), status: a.status || "agendada" };
    set(s => ({
      appointments: [...s.appointments, appt],
      patients: s.patients.map(p => p.id === a.patientId && new Date(a.start) > new Date() && (!p.nextAppointment || a.start < p.nextAppointment)
        ? { ...p, nextAppointment: a.start } : p),
    }));
    A.audit("Agendó cita", "agenda", H.fullName(SEL.patient(_state, a.patientId)));
    return appt;
  },
  setAppointmentStatus(id, status) {
    set(s => ({ appointments: s.appointments.map(a => a.id === id ? { ...a, status } : a) }));
    if (status === "atendida") A._consumeForAppointment(id);
  },
  addPatient(p) {
    const pat = { ...p, id: H.uid(), createdAt: new Date().toISOString() };
    set(s => ({ patients: [...s.patients, pat] }));
    return pat;
  },
  addRecord(r) {
    if (r.type !== "evolucion" && r.type !== "receta") throw new Error("ClinicalRecord.type inválido");
    set(s => ({ clinicalRecords: [...s.clinicalRecords, { ...r, id: H.uid() }] }));
    A.audit(r.type === "receta" ? "Emitió receta" : "Registró evolución", "historia", H.fullName(SEL.patient(_state, r.patientId)));
  },
  addConsent(patientId, templateId) {
    set(s => ({ consents: [...s.consents, { id: H.uid(), patientId, templateId, status: "pendiente" }] }));
  },
  signConsent(id, signatureUrl) {
    const c = _state.consents.find(x => x.id === id);
    set(s => ({ consents: s.consents.map(c => c.id === id ? { ...c, status: "firmado", signedAt: new Date().toISOString(), signatureUrl: signatureUrl || null } : c) }));
    if (c) {
      const t = _state.consentTemplates.find(x => x.id === c.templateId);
      const tipo = t && t.kind === "imagen" ? "cesión de imagen" : "clínico";
      A.audit("Firmó consentimiento", "consentimiento", `${H.fullName(SEL.patient(_state, c.patientId))} · ${tipo}`);
    }
  },
  addProcedure(pr) {
    set(s => ({ procedures: [...s.procedures, { ...pr, id: H.uid() }] }));
  },

  // ---- M3 · Fotos clínicas ----
  addPhoto(ph) {
    const p = { id: H.uid(), date: new Date().toISOString(), kind: "basal", ...ph };
    set(s => ({ photos: [...s.photos, p] }));
    A.audit("Subió fotografía clínica", "fotos", `${p.lesionTag} · ${H.fullName(SEL.patient(_state, p.patientId))}`);
    return p;
  },
  deletePhoto(id) {
    const ph = _state.photos.find(x => x.id === id);
    if (!ph) return;
    set(s => ({ photos: s.photos.filter(x => x.id !== id) }));
    A.audit("Eliminó fotografía clínica", "fotos", `${ph.lesionTag} · ${H.fullName(SEL.patient(_state, ph.patientId))}`);
  },
  createInvoice(patientId, lines, customerName) {
    const t = H.calcTotals(lines);
    const dateIso = new Date().toISOString();
    let created = null;
    set(s => {
      const seq = s.invoiceSeq + 1;
      created = {
        id: H.uid(), number: "001-001-" + pad(seq, 9), patientId, customerName,
        date: dateIso, lines, ...t, accessKey: H.accessKey(dateIso, seq), status: "generada",
      };
      return { invoices: [...s.invoices, created], invoiceSeq: seq };
    });
    if (created) A.audit("Emitió factura electrónica", "facturacion", "Factura " + created.number);
    return created;
  },
  advanceInvoice(id) {
    set(s => ({ invoices: s.invoices.map(f => {
      if (f.id !== id) return f;
      const next = f.status === "generada" ? "firmada" : f.status === "firmada" ? "autorizada" : f.status;
      return { ...f, status: next };
    }) }));
  },
  addService(sv) {
    set(s => ({ services: [...s.services, { ...sv, id: H.uid() }] }));
  },
  toggleService(id) {
    set(s => ({ services: s.services.map(x => x.id === id ? { ...x, active: !x.active } : x) }));
  },
  adjustStock(id, delta) {
    set(s => ({ inventory: s.inventory.map(i => i.id === id ? { ...i, stock: Math.max(0, i.stock + delta) } : i) }));
  },

  // ---- M5 · Paquetes / bonos / abonos ----
  addPackage(pkg) {
    set(s => ({ packages: [...s.packages, { ...pkg, id: H.uid(), active: true }] }));
  },
  togglePackage(id) {
    set(s => ({ packages: s.packages.map(p => p.id === id ? { ...p, active: !p.active } : p) }));
  },
  // Vender un paquete a un paciente (copia precio/sesiones al momento de la venta)
  sellPackage({ patientId, packageId, sellerProfessionalId, initialPayment, method, note }) {
    const pk = _state.packages.find(p => p.id === packageId);
    if (!pk) return null;
    const soldAt = new Date().toISOString();
    const vencimiento = new Date(Date.now() + (pk.validityDays || 365) * 864e5).toISOString();
    const payments = [];
    if (initialPayment && Number(initialPayment) > 0) {
      payments.push({ id: H.uid(), amount: Number(initialPayment), method: method || "efectivo", at: soldAt, note: note || "Abono inicial" });
    }
    const bal = {
      id: H.uid(), patientId, packageId, soldAt, sellerProfessionalId: sellerProfessionalId || null,
      sessionsTotal: pk.sessions, sessionsUsed: 0, price: pk.price, vencimiento,
      payments, redemptions: [], status: "activo",
    };
    set(s => ({ packageBalances: [...s.packageBalances, bal] }));
    A.audit("Vendió paquete", "paquetes", `${pk.name} · ${H.fullName(SEL.patient(_state, patientId))}`);
    return bal;
  },
  // Registrar un abono (pago parcial) sobre un bono vendido
  addAbono(balanceId, amount, method, note) {
    let pkgName = "", patId = null;
    set(s => ({ packageBalances: s.packageBalances.map(b => {
      if (b.id !== balanceId) return b;
      patId = b.patientId;
      const pk = s.packages.find(p => p.id === b.packageId); pkgName = pk ? pk.name : "Paquete";
      return { ...b, payments: [...b.payments, { id: H.uid(), amount: Number(amount), method: method || "efectivo", at: new Date().toISOString(), note: note || "" }] };
    }) }));
    A.audit("Registró abono de paquete", "paquetes", `${pkgName} · ${H.fmtMoney(Number(amount))} · ${H.fullName(SEL.patient(_state, patId))}`);
  },
  // Descontar una sesión del saldo (manual o automático al atender)
  consumeSession(balanceId, { appointmentId, professionalId, note } = {}) {
    let consumed = null, pkgName = "", left = 0;
    set(s => ({ packageBalances: s.packageBalances.map(b => {
      if (b.id !== balanceId || b.sessionsUsed >= b.sessionsTotal) return b;
      const used = b.sessionsUsed + 1;
      consumed = b; left = b.sessionsTotal - used;
      const pk = s.packages.find(p => p.id === b.packageId); pkgName = pk ? pk.name : "Paquete";
      return { ...b, sessionsUsed: used, status: used >= b.sessionsTotal ? "completado" : b.status,
        redemptions: [...b.redemptions, { id: H.uid(), at: new Date().toISOString(), appointmentId: appointmentId || null, professionalId: professionalId || null, note: note || "" }] };
    }) }));
    if (consumed) A.audit("Consumió sesión de paquete", "paquetes", `${pkgName} · quedan ${left} · ${H.fullName(SEL.patient(_state, consumed.patientId))}`);
    return consumed;
  },
  // ---- M6 · Cobros / links de pago Payphone ----
  _genPayphone() {
    const abc = "abcdefghijkmnpqrstuvwxyz23456789";
    const token = Array.from({ length: 6 }, () => abc[Math.floor(Math.random() * abc.length)]).join("");
    return { link: "https://ppls.me/" + token, txId: "PP-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + String(Math.floor(Math.random()*90)+10) };
  },
  // Genera un link de cobro Payphone (cita / paquete / factura / depósito / libre)
  createPayLink({ patientId, conceptType, refId, label, amount, note }) {
    const { link, txId } = A._genPayphone();
    let created = null;
    set(s => {
      created = {
        id: H.uid(), patientId, concept: { type: conceptType || "libre", refId: refId || null, label: label || "" },
        amount: Number(amount) || 0, method: "payphone", status: "pendiente",
        payphoneLink: link, txId, sentVia: null, createdAt: new Date().toISOString(), paidAt: null, note: note || "",
      };
      return { payments: [created, ...s.payments] };
    });
    A.audit("Generó link de cobro Payphone", "pagos", `${H.fmtMoney(Number(amount) || 0)} · ${H.fullName(SEL.patient(_state, patientId))}`);
    return created;
  },
  // Marcar el link como enviado por WhatsApp / email (simulado)
  markPaymentSent(id, via) {
    set(s => ({ payments: s.payments.map(p => p.id === id ? { ...p, sentVia: via } : p) }));
    A.audit("Envió link de cobro", "pagos", via === "email" ? "por correo electrónico" : "por WhatsApp");
  },
  // Conciliar: marcar como pagado. Si el cobro corresponde a un paquete, registra el abono en M5.
  markPaymentPaid(id) {
    const pay = _state.payments.find(p => p.id === id);
    if (!pay || pay.status !== "pendiente") return;
    set(s => ({ payments: s.payments.map(p => p.id === id ? { ...p, status: "pagado", paidAt: new Date().toISOString() } : p) }));
    A.audit("Concilió cobro Payphone", "pagos", `${H.fmtMoney(pay.amount)} · ${H.fullName(SEL.patient(_state, pay.patientId))}`);
    if (pay.concept.type === "paquete" && pay.concept.refId) {
      const bal = _state.packageBalances.find(b => b.id === pay.concept.refId);
      if (bal) A.addAbono(bal.id, pay.amount, "payphone", "Pago Payphone conciliado");
    }
  },
  // Anular un link de cobro pendiente
  voidPayment(id) {
    set(s => ({ payments: s.payments.map(p => p.id === id && p.status === "pendiente" ? { ...p, status: "anulado" } : p) }));
    A.audit("Anuló link de cobro", "pagos", "");
  },

  // Al marcar una cita como atendida: descontar automáticamente una sesión del bono que cubra el servicio
  _consumeForAppointment(apptId) {
    const s = _state;
    const a = s.appointments.find(x => x.id === apptId);
    if (!a) return;
    if (SEL.balanceByRedemptionAppt(s, apptId)) return; // ya descontada
    const bal = SEL.activeBalanceForService(s, a.patientId, a.serviceId);
    if (bal) A.consumeSession(bal.id, { appointmentId: apptId, professionalId: a.professionalId, note: "Sesión descontada al atender la cita" });
  },
};

Object.assign(window, { H, A, SEL, useStore, getState, EMISOR, STATUS_META, KIND_LABEL, INVOICE_STATUS, CONSENT_STATUS, PAY_METHODS, PAY_CONCEPTS, PAY_STATUS, PKG, ROLES, PERM, PERM_MODULES, roleCan, AUDIT_CATS });
