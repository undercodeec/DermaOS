// DERMA-OS · UI compartida: sidebar, header, modales globales, primitivas
const { useState, useEffect, useMemo } = React;

// ---------- Primitivas ----------
function Btn({ kind = "secondary", sm, icon, children, ...props }) {
  return (
    <button className={`btn btn-${kind}${sm ? " btn-sm" : ""}`} {...props}>
      {icon ? <Icon name={icon} size={sm ? 14 : 16} /> : null}{children}
    </button>
  );
}

function Badge({ cls = "bg-neutral", children }) {
  return <span className={`badge ${cls}`}>{children}</span>;
}

function StatusBadge({ status }) {
  const m = STATUS_META[status];
  return <span className="badge" style={{ background: m.bg, color: m.color }}>{m.label}</span>;
}

function Modal({ title, wide, onClose, children, foot }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal${wide ? " wide" : ""}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="mclose" onClick={onClose} aria-label="Cerrar"><Icon name="x" size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {foot ? <div className="modal-foot">{foot}</div> : null}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

function EmptyState({ icon = "file", children }) {
  return <div className="empty"><Icon name={icon} size={34} /><div>{children}</div></div>;
}

function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub ? <p className="page-sub">{sub}</p> : null}
      </div>
      <div style={{ display: "flex", gap: 10 }}>{children}</div>
    </div>
  );
}

// ---------- Sidebar ----------
const NAV_SECTIONS = [
  {
    label: "Principal", sub: "Operación diaria",
    items: [
      { path: "/", icon: "dashboard", label: "Dashboard", mod: "reportes" },
      { path: "/agenda", icon: "calendar", label: "Agenda", mod: "agenda" },
      { path: "/patients", icon: "users", label: "Pacientes", mod: "pacientes" },
    ],
  },
  {
    label: "Clínica", sub: "Atención y catálogo",
    items: [
      { path: "/services", icon: "flask", label: "Servicios", mod: "servicios" },
      { path: "/procedures", icon: "syringe", label: "Procedimientos", mod: "procedimientos" },
      { path: "/packages", icon: "layers", label: "Paquetes", mod: "paquetes" },
    ],
  },
  {
    label: "Administración", sub: "Cobros y stock",
    items: [
      { path: "/payments", icon: "card", label: "Cobros", mod: "pagos" },
      { path: "/billing", icon: "receipt", label: "Facturación", mod: "facturacion" },
      { path: "/inventory", icon: "box", label: "Inventario", mod: "inventario" },
    ],
  },
  {
    label: "Sistema", sub: "Seguridad y accesos",
    items: [
      { path: "/admin", icon: "lock", label: "Usuarios y auditoría", mod: "sistema" },
    ],
  },
];
// Compat: lista plana para cualquier consumidor externo
const NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items);

function Sidebar({ route }) {
  const s = useStore();
  const collapsed = s.sidebarCollapsed;
  const me = SEL.currentUser(s);
  const role = me ? me.role : "admin";
  const isActive = (p) => p === "/" ? route === "/" : route.startsWith(p);
  const sections = NAV_SECTIONS
    .map(sec => ({ ...sec, items: sec.items.filter(it => !it.mod || roleCan(role, it.mod)) }))
    .filter(sec => sec.items.length > 0);
  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="sb-brand">
        {collapsed ? (
          <div className="sb-monogram">D</div>
        ) : (
          <div className="sb-wordmark">
            <strong>DERMA<span className="wm-accent">·OS</span></strong>
            <span className="wm-sub">demo clínico</span>
          </div>
        )}
      </div>
      <nav className="sb-nav">
        {sections.map((sec, i) => (
          <ul key={i} className="menu-list">
            {!collapsed && (
              <li className="divider">
                <span className="label">{sec.label}</span>
                <span className="subtitle">{sec.sub}</span>
              </li>
            )}
            {sec.items.map(it => (
              <li key={it.path}>
                <button className={`m-link${isActive(it.path) ? " active" : ""}`}
                  onClick={() => H.nav(it.path)} title={it.label}
                  aria-current={isActive(it.path) ? "page" : undefined}>
                  <Icon name={it.icon} size={18} />
                  {!collapsed && <span className="m-label">{it.label}</span>}
                  {!collapsed && <Icon name="chevR" size={14} className="arrow" />}
                </button>
              </li>
            ))}
          </ul>
        ))}
      </nav>
      <div className="sb-foot">
        <button className="sb-collapse" onClick={A.toggleSidebar}>
          <Icon name={collapsed ? "chevR" : "chevL"} size={14} />{!collapsed && "Contraer menú"}
        </button>
        {!collapsed && (
          <React.Fragment>
            <span className="confid"><Icon name="lock" size={12} /> Datos sensibles · LOPDP</span>
            <button onClick={() => { if (confirm("¿Reiniciar los datos del demo?")) A.resetDemo(); }}>Reiniciar datos demo</button>
          </React.Fragment>
        )}
      </div>
    </aside>
  );
}

// ---------- Header ----------
function Header() {
  const s = useStore();
  const me = SEL.currentUser(s);
  const role = me ? me.role : "admin";
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    if (q.trim().length < 2) return [];
    const t = q.trim().toLowerCase();
    return s.patients.filter(p => H.fullName(p).toLowerCase().includes(t) || p.idNumber.includes(t)).slice(0, 6);
  }, [q, s.patients]);

  const canCita = ["Total", "Crear/editar", "Su agenda"].includes(PERM[role].agenda);
  const canPaciente = ["Total", "Crear/editar"].includes(PERM[role].pacientes);
  const canReceta = ["Total", "Crear/editar"].includes(PERM[role].historia);

  return (
    <header className="header">
      <div className="hd-search">
        <Icon name="search" size={17} />
        <input placeholder="Buscar paciente por nombre o cédula…" value={q}
          onChange={(e) => setQ(e.target.value)} />
        {results.length > 0 && (
          <div className="hd-results">
            {results.map(p => (
              <button key={p.id} className="hd-result"
                onClick={() => { setQ(""); H.nav(`/patients/${p.id}/antecedentes`); }}>
                <span>{H.fullName(p)}</span><small>{p.idNumber}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="hd-spacer"></div>
      <span className="hd-date">{H.fmtDateLong(new Date().toISOString())}</span>
      {canPaciente ? <Btn kind="ghost" icon="user" onClick={() => A.open("paciente")}>Paciente</Btn> : null}
      {canReceta ? <Btn kind="ghost" icon="pill" onClick={() => A.open("receta")}>Receta</Btn> : null}
      {canCita ? <Btn kind="primary" icon="plus" onClick={() => A.open("cita")}>Nueva Cita</Btn> : null}
      <div className="hd-userdivider"></div>
      <UserMenu />
    </header>
  );
}

// ---------- Modal: Nueva Cita (global, §5.2) ----------
// Construye el mensaje de recordatorio personalizado que se "envía" al paciente.
function buildCitaMsg({ patient, prof, svc, start }) {
  const fecha = H.fmtDateLong(start.toISOString());
  const hora = H.fmtTime(start.toISOString());
  const lines = [
    `Hola ${patient.firstName}, le saludamos de ${EMISOR.nombreComercial}. ✅`,
    "",
    "Su cita ha sido agendada con éxito:",
    `🗓️ ${fecha}`,
    `🕐 ${hora}`,
    `👩‍⚕️ ${prof ? prof.name : "Profesional asignado"}`,
  ];
  if (svc) lines.push(`💆 ${svc.name}`);
  lines.push(
    `📍 ${EMISOR.direccion}`,
    "",
    "Le pedimos llegar 10 minutos antes. Si necesita reagendar o cancelar, responda a este mensaje. ¡Le esperamos!",
  );
  return lines.join("\n");
}

function NuevaCitaModal({ props }) {
  const s = getState();
  const [f, setF] = useState(() => ({
    patientId: props.patientId || "",
    serviceId: "",
    professionalId: "pr1",
    date: props.date || new Date().toISOString().slice(0, 10),
    time: props.time || "09:00",
    kind: "consulta_nueva",
    notes: "",
  }));
  const [step, setStep] = useState("form");   // form → confirm → sent
  const [ctx, setCtx] = useState(null);        // { patient, prof, svc, start }
  const [msg, setMsg] = useState("");
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const svc = s.services.find(x => x.id === f.serviceId);
  const valid = f.patientId && f.serviceId && f.date && f.time;

  const goAgenda = () => { A.close(); H.nav("/agenda"); };

  const save = () => {
    const start = new Date(`${f.date}T${f.time}:00`);
    const end = new Date(start.getTime() + (svc ? svc.durationMin : 30) * 60000);
    A.addAppointment({ patientId: f.patientId, serviceId: f.serviceId, professionalId: f.professionalId,
      start: start.toISOString(), end: end.toISOString(), kind: f.kind, notes: f.notes });
    const patient = s.patients.find(p => p.id === f.patientId);
    const prof = s.professionals.find(p => p.id === f.professionalId);
    const c = { patient, prof, svc, start };
    setCtx(c);
    setMsg(buildCitaMsg(c));
    setStep("confirm");
  };

  const sendMsg = () => {
    setStep("sent");
    setTimeout(goAgenda, 1700);
  };

  // ----- Paso 2: confirmación + mensaje personalizado al paciente -----
  if (step === "confirm" && ctx) {
    const hasPhone = !!(ctx.patient && ctx.patient.phone);
    return (
      <Modal title="Cita agendada" onClose={goAgenda} foot={
        <React.Fragment>
          <Btn onClick={goAgenda}>Omitir y ver agenda</Btn>
          <Btn kind="primary" icon="send" disabled={!hasPhone} onClick={sendMsg}>Enviar recordatorio</Btn>
        </React.Fragment>
      }>
        <div className="cita-ok">
          <span className="cita-ok-icon"><Icon name="check" size={20} /></span>
          <div>
            <strong>Cita registrada para {H.fullName(ctx.patient)}</strong>
            <p className="muted" style={{ margin: "2px 0 0", fontSize: 13.5 }}>
              {H.fmtDateLong(ctx.start.toISOString())} · {H.fmtTime(ctx.start.toISOString())}
              {ctx.svc ? ` · ${ctx.svc.name}` : ""}
            </p>
          </div>
        </div>

        <div className="wa-meta">
          <Icon name="chat" size={15} />
          <span>Recordatorio por WhatsApp a&nbsp;</span>
          <strong className="tnum">{hasPhone ? ctx.patient.phone : "—"}</strong>
        </div>

        <div className="wa-preview">
          <div className="wa-bubble">
            <pre className="wa-text">{msg}</pre>
            <span className="wa-time">{H.fmtTime(new Date().toISOString())} ✓✓</span>
          </div>
        </div>

        <Field label="Personalizar mensaje">
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows="5" className="wa-editor"></textarea>
        </Field>
        {!hasPhone ? <p style={{ color: "var(--warn)", fontSize: 13, margin: "0 0 4px" }}>Este paciente no tiene número registrado; no se puede enviar el recordatorio.</p> : null}
      </Modal>
    );
  }

  // ----- Paso 3: mensaje enviado -----
  if (step === "sent" && ctx) {
    return (
      <Modal title="Recordatorio enviado" onClose={goAgenda}>
        <div className="cita-sent">
          <span className="cita-sent-ring"><Icon name="send" size={28} /></span>
          <strong style={{ fontSize: 17 }}>Mensaje enviado a {ctx.patient.firstName}</strong>
          <p className="muted tnum" style={{ margin: "4px 0 0" }}>WhatsApp · {ctx.patient.phone}</p>
          <p className="muted" style={{ margin: "10px 0 0", fontSize: 13.5 }}>Redirigiendo a la agenda…</p>
        </div>
      </Modal>
    );
  }

  // ----- Paso 1: formulario -----
  return (
    <Modal title="Nueva cita" onClose={A.close} foot={
      <React.Fragment>
        <Btn onClick={A.close}>Cancelar</Btn>
        <Btn kind="primary" icon="check" disabled={!valid} onClick={save}>Agendar cita</Btn>
      </React.Fragment>
    }>
      <Field label="Paciente">
        <select value={f.patientId} onChange={upd("patientId")}>
          <option value="">Seleccionar paciente…</option>
          {s.patients.map(p => <option key={p.id} value={p.id}>{H.fullName(p)} · {p.idNumber}</option>)}
        </select>
      </Field>
      <div className="frow">
        <Field label="Servicio">
          <select value={f.serviceId} onChange={upd("serviceId")}>
            <option value="">Seleccionar servicio…</option>
            {s.services.filter(x => x.active).map(x => <option key={x.id} value={x.id}>{x.name} · {x.durationMin} min · {H.fmtMoney(x.price)}</option>)}
          </select>
        </Field>
        <Field label="Profesional">
          <select value={f.professionalId} onChange={upd("professionalId")}>
            {s.professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="frow3">
        <Field label="Fecha"><input type="date" value={f.date} onChange={upd("date")} /></Field>
        <Field label="Hora"><input type="time" value={f.time} onChange={upd("time")} min="08:00" max="18:00" /></Field>
        <Field label="Tipo">
          <select value={f.kind} onChange={upd("kind")}>
            <option value="consulta_nueva">Consulta nueva</option>
            <option value="control">Control</option>
            <option value="procedimiento">Procedimiento</option>
          </select>
        </Field>
      </div>
      <Field label="Notas (opcional)"><textarea value={f.notes} onChange={upd("notes")} rows="2"></textarea></Field>
      {svc ? <p className="muted" style={{ fontSize: 13, margin: "0 0 8px" }}>Duración {svc.durationMin} min · {H.fmtMoney(svc.price)} · IVA {svc.vatRate}%</p> : null}
    </Modal>
  );
}

// ---------- Modal: Nuevo Paciente ----------
function NuevoPacienteModal() {
  const [f, setF] = useState({ firstName: "", lastName: "", idType: "cedula", idNumber: "", birthDate: "", sex: "F", email: "", phone: "", city: "Quito", skinType: "III", allergies: "" });
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const cedulaOk = f.idType !== "cedula" || /^\d{10}$/.test(f.idNumber);
  const valid = f.firstName && f.lastName && f.idNumber && f.birthDate && cedulaOk;

  const save = () => {
    const p = A.addPatient({
      firstName: f.firstName, lastName: f.lastName, idType: f.idType, idNumber: f.idNumber,
      birthDate: f.birthDate, sex: f.sex, email: f.email, phone: f.phone, city: f.city,
      background: { skinType: f.skinType, usesSunscreen: false, allergies: f.allergies ? f.allergies.split(",").map(x => x.trim()).filter(Boolean) : [], chronicConditions: [], currentMedications: [], familyHistory: [], dermatologicalHistory: [], smoker: false },
    });
    A.close();
    H.nav(`/patients/${p.id}/antecedentes`);
  };

  return (
    <Modal title="Nuevo paciente" onClose={A.close} foot={
      <React.Fragment>
        <Btn onClick={A.close}>Cancelar</Btn>
        <Btn kind="primary" icon="check" disabled={!valid} onClick={save}>Crear paciente</Btn>
      </React.Fragment>
    }>
      <div className="frow">
        <Field label="Nombres"><input value={f.firstName} onChange={upd("firstName")} placeholder="María José" /></Field>
        <Field label="Apellidos"><input value={f.lastName} onChange={upd("lastName")} placeholder="Pérez Vallejo" /></Field>
      </div>
      <div className="frow3">
        <Field label="Tipo de identificación">
          <select value={f.idType} onChange={upd("idType")}>
            <option value="cedula">Cédula</option><option value="pasaporte">Pasaporte</option><option value="ruc">RUC</option>
          </select>
        </Field>
        <Field label="Número"><input value={f.idNumber} onChange={upd("idNumber")} placeholder="10 dígitos" maxLength={f.idType === "ruc" ? 13 : 10} /></Field>
        <Field label="Fecha de nacimiento"><input type="date" value={f.birthDate} onChange={upd("birthDate")} /></Field>
      </div>
      {!cedulaOk && f.idNumber ? <p style={{ color: "var(--err)", fontSize: 13, marginTop: -8 }}>La cédula debe tener 10 dígitos.</p> : null}
      <div className="frow3">
        <Field label="Sexo">
          <select value={f.sex} onChange={upd("sex")}><option value="F">Femenino</option><option value="M">Masculino</option><option value="O">Otro</option></select>
        </Field>
        <Field label="Teléfono"><input value={f.phone} onChange={upd("phone")} placeholder="099 …" /></Field>
        <Field label="Ciudad"><input value={f.city} onChange={upd("city")} /></Field>
      </div>
      <Field label="Email"><input type="email" value={f.email} onChange={upd("email")} placeholder="correo@ejemplo.com" /></Field>
      <div className="frow">
        <Field label="Fototipo (Fitzpatrick)">
          <select value={f.skinType} onChange={upd("skinType")}>{["I","II","III","IV","V","VI"].map(x => <option key={x} value={x}>{x}</option>)}</select>
        </Field>
        <Field label="Alergias (separadas por coma)"><input value={f.allergies} onChange={upd("allergies")} placeholder="Penicilina, sulfas…" /></Field>
      </div>
    </Modal>
  );
}

// ---------- Editor de fórmula magistral (reutilizable) ----------
function RxItemsEditor({ items, setItems }) {
  const updItem = (i, patch) => setItems(items.map((it, k) => k === i ? { ...it, ...patch } : it));
  const updIng = (i, j, patch) => updItem(i, { ingredients: items[i].ingredients.map((g, k) => k === j ? { ...g, ...patch } : g) });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {items.map((it, i) => (
        <div key={i} className="rx-card" style={{ background: "var(--bg-subtle)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong style={{ fontSize: 13.5 }}>Fórmula {i + 1}</strong>
            {items.length > 1 ? <Btn sm kind="ghost" icon="trash" onClick={() => setItems(items.filter((_, k) => k !== i))}>Quitar</Btn> : null}
          </div>
          {it.ingredients.map((g, j) => (
            <div key={j} style={{ display: "grid", gridTemplateColumns: "1fr 110px 34px", gap: 8, marginBottom: 8 }}>
              <input value={g.name} placeholder="Principio activo" onChange={(e) => updIng(i, j, { name: e.target.value })} style={{ border: "1px solid var(--border-strong)", borderRadius: 7, padding: "7px 10px" }} />
              <input value={g.concentration} placeholder="Conc." onChange={(e) => updIng(i, j, { concentration: e.target.value })} style={{ border: "1px solid var(--border-strong)", borderRadius: 7, padding: "7px 10px" }} />
              <button className="mclose" title="Quitar principio activo" onClick={() => updItem(i, { ingredients: it.ingredients.filter((_, k) => k !== j) })}><Icon name="x" size={14} /></button>
            </div>
          ))}
          <Btn sm kind="ghost" icon="plus" onClick={() => updItem(i, { ingredients: [...it.ingredients, { name: "", concentration: "" }] })}>Principio activo</Btn>
          <div className="frow" style={{ marginTop: 10 }}>
            <Field label="Vehículo"><input value={it.vehicle || ""} placeholder="gel, crema base…" onChange={(e) => updItem(i, { vehicle: e.target.value })} /></Field>
            <Field label="Cantidad"><input value={it.quantity || ""} placeholder="30 g" onChange={(e) => updItem(i, { quantity: e.target.value })} /></Field>
          </div>
          <Field label="Instrucciones de uso">
            <textarea value={it.instructions} rows="2" placeholder="Aplicar capa fina por las noches…" onChange={(e) => updItem(i, { instructions: e.target.value })}></textarea>
          </Field>
        </div>
      ))}
      <Btn sm icon="plus" onClick={() => setItems([...items, { ingredients: [{ name: "", concentration: "" }], vehicle: "", quantity: "", instructions: "" }])}>Agregar otra fórmula</Btn>
    </div>
  );
}

// ---------- Modal: Nueva Receta (global, §5.3) ----------
function NuevaRecetaModal({ props }) {
  const s = getState();
  const [patientId, setPatientId] = useState(props.patientId || "");
  const [professionalId, setProfessionalId] = useState("pr1");
  const [templateId, setTemplateId] = useState("");
  const [items, setItems] = useState([{ ingredients: [{ name: "", concentration: "" }], vehicle: "", quantity: "", instructions: "" }]);

  const pickTemplate = (id) => {
    setTemplateId(id);
    const t = s.prescriptionTemplates.find(x => x.id === id);
    if (t) setItems(JSON.parse(JSON.stringify(t.items)));
  };

  const valid = patientId && items.some(it => it.ingredients.some(g => g.name.trim()) && it.instructions.trim());

  const save = () => {
    A.addRecord({
      patientId, type: "receta", date: new Date().toISOString(), professionalId,
      prescription: { templateId: templateId || undefined, items: items.filter(it => it.ingredients.some(g => g.name.trim())) },
    });
    A.close();
    H.nav(`/patients/${patientId}/recetas`);
  };

  return (
    <Modal title="Nueva receta · fórmula magistral" wide onClose={A.close} foot={
      <React.Fragment>
        <Btn onClick={A.close}>Cancelar</Btn>
        <Btn kind="primary" icon="check" disabled={!valid} onClick={save}>Guardar receta</Btn>
      </React.Fragment>
    }>
      <div className="frow3">
        <Field label="Paciente">
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="">Seleccionar…</option>
            {s.patients.map(p => <option key={p.id} value={p.id}>{H.fullName(p)}</option>)}
          </select>
        </Field>
        <Field label="Profesional">
          <select value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}>
            {s.professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Desde plantilla">
          <select value={templateId} onChange={(e) => pickTemplate(e.target.value)}>
            <option value="">— Receta en blanco —</option>
            {s.prescriptionTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
      </div>
      <RxItemsEditor items={items} setItems={setItems} />
      <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>La receta se guarda como registro clínico tipo <code>receta</code> y aparece únicamente en la pestaña Recetas del paciente (nunca en la evolución).</p>
    </Modal>
  );
}

Object.assign(window, {
  Btn, Badge, StatusBadge, Modal, Field, EmptyState, PageHead, Sidebar, Header,
  NuevaCitaModal, NuevoPacienteModal, NuevaRecetaModal, RxItemsEditor, NAV_ITEMS,
});
