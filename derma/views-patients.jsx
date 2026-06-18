// DERMA-OS · Pacientes: listado + ficha con 7 pestañas
function PatientsList() {
  const s = useStore();
  const [q, setQ] = React.useState("");
  const list = s.patients.filter(p => {
    const t = q.trim().toLowerCase();
    return !t || H.fullName(p).toLowerCase().includes(t) || p.idNumber.includes(t);
  });

  return (
    <div className="content-inner">
      <PageHead title="Pacientes" sub={`${s.patients.length} pacientes registrados`}>
        <Btn kind="primary" icon="plus" onClick={() => A.open("paciente")}>Nuevo Paciente</Btn>
      </PageHead>
      <div className="card">
        <div className="card-pad" style={{ paddingBottom: 0 }}>
          <div className="hd-search" style={{ width: 340 }}>
            <Icon name="search" size={17} />
            <input placeholder="Filtrar por nombre o cédula…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <table className="tbl" style={{ marginTop: 12 }}>
          <thead>
            <tr><th>Paciente</th><th>Cédula</th><th>Edad</th><th>Fototipo</th><th>Alergias</th><th>Próxima cita</th></tr>
          </thead>
          <tbody>
            {list.map(p => (
              <tr key={p.id} className="rowlink" onClick={() => H.nav(`/patients/${p.id}/antecedentes`)}>
                <td><strong>{H.fullName(p)}</strong><div className="muted" style={{ fontSize: 12.5 }}>{p.city} · {p.phone}</div></td>
                <td className="tnum">{p.idNumber}</td>
                <td className="tnum">{H.age(p.birthDate)}</td>
                <td><Badge cls="bg-brand">{p.background.skinType}</Badge></td>
                <td>{p.background.allergies.length ? <Badge cls="bg-err">{p.background.allergies.join(", ")}</Badge> : <span className="muted">—</span>}</td>
                <td className="tnum">{p.nextAppointment && new Date(p.nextAppointment) >= new Date(new Date().toDateString()) ? `${H.fmtDate(p.nextAppointment)} ${H.fmtTime(p.nextAppointment)}` : <span className="muted">—</span>}</td>
              </tr>
            ))}
            {list.length === 0 ? <tr><td colSpan="6"><EmptyState icon="users">Sin resultados para «{q}».</EmptyState></td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Ficha de paciente ----------
const PTABS = [
  { id: "antecedentes", label: "Antecedentes" },
  { id: "evolucion", label: "Evolución" },
  { id: "recetas", label: "Recetas" },
  { id: "fotos", label: "Fotos" },
  { id: "consentimientos", label: "Consentimientos" },
  { id: "procedimientos", label: "Procedimientos" },
  { id: "paquetes", label: "Paquetes" },
  { id: "facturas", label: "Facturas" },
];

// Permiso por pestaña según rol
const TAB_MOD = { antecedentes: "pacientes", evolucion: "historia", recetas: "historia", fotos: "fotos", consentimientos: "consentimientos", procedimientos: "procedimientos", paquetes: "paquetes", facturas: "facturacion" };

function PatientDetail({ id, tab }) {
  const s = useStore();
  const p = SEL.patient(s, id);
  const me = SEL.currentUser(s);
  const role = me ? me.role : "admin";
  const tabAllowed = (tid) => roleCan(role, TAB_MOD[tid] || "pacientes");

  // Auditoría: registrar apertura (o intento denegado) de la pestaña
  React.useEffect(() => {
    if (!p) return;
    if (!tabAllowed(tab)) {
      A.audit("Intento de acceso denegado", "sistema", `${(PTABS.find(t => t.id === tab) || {}).label || tab} · ${H.fullName(p)}`);
      return;
    }
    if (["evolucion", "recetas", "procedimientos"].includes(tab)) A.audit("Abrió historia clínica", "historia", H.fullName(p));
    else if (tab === "fotos") A.audit("Visualizó fotos clínicas", "fotos", H.fullName(p));
  }, [id, tab, role]);

  if (!p) return <div className="content-inner"><EmptyState icon="users">Paciente no encontrado.</EmptyState></div>;
  const visibleTabs = PTABS.filter(t => tabAllowed(t.id));
  const T = { antecedentes: TabAntecedentes, evolucion: TabEvolucion, recetas: TabRecetas, fotos: TabFotos, consentimientos: TabConsents, procedimientos: TabProcs, paquetes: window.TabPaquetes, facturas: TabFacturas }[tab] || TabAntecedentes;

  return (
    <div className="content-inner">
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={() => H.nav("/patients")}><Icon name="chevL" size={14} /> Pacientes</button>
      <div className="card card-pad" style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 20 }}>
        <div className="avatar" style={{ width: 64, height: 64, fontSize: 24 }}>{H.initials(p)}</div>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ fontSize: 23 }}>{H.fullName(p)}</h1>
          <p className="page-sub">{H.age(p.birthDate)} años · {p.sex === "F" ? "Femenino" : p.sex === "M" ? "Masculino" : "Otro"} · CI {p.idNumber} · {p.city} · {p.phone}</p>
        </div>
        <div className="chips">
          <Badge cls="bg-brand">Fototipo {p.background.skinType}</Badge>
          {p.background.allergies.map(a => <Badge key={a} cls="bg-err"><Icon name="alert" size={12} /> {a}</Badge>)}
          {p.background.chronicConditions.map(c => <Badge key={c} cls="bg-warn">{c}</Badge>)}
        </div>
        <Btn icon="calendar" onClick={() => A.open("cita", { patientId: p.id })}>Agendar</Btn>
      </div>

      <div className="ptabs">
        {visibleTabs.map(t => {
          const count = t.id === "evolucion" ? SEL.evolutionByPatient(s, p.id).length
            : t.id === "recetas" ? SEL.prescriptionsByPatient(s, p.id).length
            : t.id === "fotos" ? s.photos.filter(x => x.patientId === p.id).length
            : t.id === "consentimientos" ? s.consents.filter(x => x.patientId === p.id).length
            : t.id === "procedimientos" ? s.procedures.filter(x => x.patientId === p.id).length
            : t.id === "paquetes" ? s.packageBalances.filter(x => x.patientId === p.id).length
            : t.id === "facturas" ? s.invoices.filter(x => x.patientId === p.id).length : 0;
          return (
            <button key={t.id} className={`ptab${tab === t.id ? " active" : ""}`} onClick={() => H.nav(`/patients/${p.id}/${t.id}`)}>
              {t.label}{count > 0 ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>
      {tabAllowed(tab)
        ? <T p={p} s={s} role={role} />
        : <NoAccess>El rol <strong>{ROLES[role].label}</strong> no puede abrir la sección «{(PTABS.find(t => t.id === tab) || {}).label || tab}» de la historia clínica. Este intento quedó registrado en la auditoría.</NoAccess>}
    </div>
  );
}

// ---------- Tab: Antecedentes ----------
function LiRow({ k, v }) {
  return <div className="soap-row"><span className="soap-k">{k}</span><span>{v}</span></div>;
}
function TabAntecedentes({ p }) {
  const b = p.background;
  const li = (arr) => arr && arr.length ? arr.join(" · ") : "Sin registro";
  return (
    <div className="grid-2">
      <div className="card card-pad">
        <p className="card-title">Perfil dermatológico</p>
        <LiRow k="Fototipo" v={`Fitzpatrick ${b.skinType}`} />
        <LiRow k="Fotoprotector" v={b.usesSunscreen ? `Sí · SPF ${b.sunscreenSpf || "?"}` : "No usa"} />
        <LiRow k="Tabaquismo" v={b.smoker ? "Fumador/a" : "No"} />
        <LiRow k="Hist. dermat." v={li(b.dermatologicalHistory)} />
        {b.notes ? <LiRow k="Notas" v={b.notes} /> : null}
      </div>
      <div className="card card-pad">
        <p className="card-title">Antecedentes médicos</p>
        <LiRow k="Alergias" v={b.allergies.length ? b.allergies.join(" · ") : "Ninguna conocida"} />
        <LiRow k="Crónicos" v={li(b.chronicConditions)} />
        <LiRow k="Medicación" v={li(b.currentMedications)} />
        <LiRow k="Familiares" v={li(b.familyHistory)} />
      </div>
    </div>
  );
}

// ---------- Tab: Evolución (SOAP) ----------
function TabEvolucion({ p, s }) {
  const evo = SEL.evolutionByPatient(s, p.id);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Btn kind="primary" icon="plus" onClick={() => A.open("evolucion", { patientId: p.id })}>Nueva evolución</Btn>
      </div>
      {evo.length === 0 ? <div className="card"><EmptyState icon="file">Sin notas de evolución todavía.</EmptyState></div> : (
        <div className="timeline">
          {evo.map(r => {
            const pr = SEL.professional(s, r.professionalId);
            return (
              <div key={r.id} className="tl-item">
                <div className="tl-date">{H.fmtDate(r.date)} · {H.fmtTime(r.date)} <span className="muted" style={{ fontWeight: 400 }}>— {pr ? pr.name : ""}</span></div>
                <div className="card card-pad tl-card">
                  <div className="soap-row"><span className="soap-k">Subjetivo</span><span>{r.subjective}</span></div>
                  <div className="soap-row"><span className="soap-k">Objetivo</span><span>{r.objective}</span></div>
                  <div className="soap-row"><span className="soap-k">Análisis</span><span>{r.assessment} {(r.cie10Codes || []).map(c => <Badge key={c} cls="bg-info">{c}</Badge>)}</span></div>
                  <div className="soap-row"><span className="soap-k">Plan</span><span>{r.plan}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const CIE10 = [
  { code: "L70.0", label: "Acné vulgar" }, { code: "L71.0", label: "Rosácea perioral" },
  { code: "L81.0", label: "Hiperpigmentación postinflamatoria" }, { code: "L81.1", label: "Cloasma / melasma" },
  { code: "L20.9", label: "Dermatitis atópica" }, { code: "L57.0", label: "Queratosis actínica" },
  { code: "L40.0", label: "Psoriasis vulgar" }, { code: "B07", label: "Verrugas víricas" },
  { code: "L30.9", label: "Dermatitis, no especificada" }, { code: "L65.9", label: "Pérdida de cabello no cicatricial" },
];

function EvolucionModal({ props }) {
  const s = getState();
  const [f, setF] = React.useState({ professionalId: "pr1", subjective: "", objective: "", assessment: "", plan: "", codes: [] });
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggleCode = (c) => setF({ ...f, codes: f.codes.includes(c) ? f.codes.filter(x => x !== c) : [...f.codes, c] });
  const valid = f.subjective && f.objective && f.assessment && f.plan;
  const p = SEL.patient(s, props.patientId);

  const save = () => {
    A.addRecord({ patientId: props.patientId, type: "evolucion", date: new Date().toISOString(),
      professionalId: f.professionalId, subjective: f.subjective, objective: f.objective,
      assessment: f.assessment, plan: f.plan, cie10Codes: f.codes });
    A.close();
    H.nav(`/patients/${props.patientId}/evolucion`);
  };

  return (
    <Modal title={`Nueva evolución · ${H.fullName(p)}`} wide onClose={A.close} foot={
      <React.Fragment>
        <Btn onClick={A.close}>Cancelar</Btn>
        <Btn kind="primary" icon="check" disabled={!valid} onClick={save}>Guardar evolución</Btn>
      </React.Fragment>
    }>
      <Field label="Profesional">
        <select value={f.professionalId} onChange={upd("professionalId")} style={{ maxWidth: 280 }}>
          {s.professionals.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </Field>
      <Field label="S · Subjetivo (lo que refiere el paciente)"><textarea value={f.subjective} onChange={upd("subjective")} rows="2"></textarea></Field>
      <Field label="O · Objetivo (hallazgos al examen físico)"><textarea value={f.objective} onChange={upd("objective")} rows="2"></textarea></Field>
      <Field label="A · Análisis / diagnóstico"><textarea value={f.assessment} onChange={upd("assessment")} rows="2"></textarea></Field>
      <Field label="Códigos CIE-10">
        <div className="chips">
          {CIE10.map(c => (
            <button key={c.code} className="badge" title={c.label}
              style={{ cursor: "pointer", border: "1px solid", borderColor: f.codes.includes(c.code) ? "var(--info)" : "var(--border-strong)", background: f.codes.includes(c.code) ? "var(--info-bg)" : "#fff", color: f.codes.includes(c.code) ? "var(--info)" : "var(--ink-2)" }}
              onClick={() => toggleCode(c.code)}>{c.code} · {c.label}</button>
          ))}
        </div>
      </Field>
      <Field label="P · Plan"><textarea value={f.plan} onChange={upd("plan")} rows="2"></textarea></Field>
      <p className="muted" style={{ fontSize: 12.5 }}>Para prescribir, usa «Receta» — las recetas viven en su propia pestaña, separadas de la evolución.</p>
    </Modal>
  );
}

// ---------- Tab: Recetas ----------
function TabRecetas({ p, s }) {
  const rx = SEL.prescriptionsByPatient(s, p.id);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Btn kind="primary" icon="pill" onClick={() => A.open("receta", { patientId: p.id })}>Nueva receta</Btn>
      </div>
      {rx.length === 0 ? <div className="card"><EmptyState icon="pill">Sin recetas registradas.</EmptyState></div> : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {rx.map(r => {
            const pr = SEL.professional(s, r.professionalId);
            const tpl = r.prescription.templateId ? s.prescriptionTemplates.find(t => t.id === r.prescription.templateId) : null;
            return (
              <div key={r.id} className="rx-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <strong>{tpl ? tpl.name : "Fórmula magistral"}</strong>
                  <span className="muted tnum" style={{ fontSize: 12.5 }}>{H.fmtDate(r.date)}</span>
                </div>
                {r.prescription.items.map((it, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    {it.ingredients.map((g, j) => <div key={j} className="rx-ing"><span>{g.name}</span><b>{g.concentration}</b></div>)}
                    <div className="muted" style={{ fontSize: 13, marginTop: 5 }}>{it.vehicle} · {it.quantity}</div>
                    <div className="rx-instr">{it.instructions}</div>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <span className="muted" style={{ fontSize: 12.5 }}>{pr ? pr.name : ""}</span>
                  <Btn sm kind="ghost" icon="printer" onClick={() => A.open("printRx", { recordId: r.id })}>Imprimir</Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Modal: receta imprimible ----------
function PrintRxModal({ props }) {
  const s = getState();
  const r = s.clinicalRecords.find(x => x.id === props.recordId);
  if (!r) return null;
  const p = SEL.patient(s, r.patientId), pr = SEL.professional(s, r.professionalId);
  return (
    <Modal title="Receta médica" onClose={A.close} foot={<Btn kind="primary" icon="printer" onClick={() => window.print()}>Imprimir</Btn>}>
      <div style={{ border: "1px solid var(--border-strong)", borderRadius: 10, padding: "22px 24px", fontSize: 14 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", borderBottom: "2px solid var(--brown-700)", paddingBottom: 12, marginBottom: 14 }}>
          <img src="derma/logo.jpg" style={{ width: 44, height: 44, borderRadius: 9 }} alt="logo" />
          <div>
            <strong style={{ fontSize: 16 }}>Derma Piel y Pelo · Centro Dermatológico</strong>
            <div className="muted" style={{ fontSize: 12.5 }}>{EMISOR.direccion}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 14 }}>
          <span><strong>Paciente:</strong> {H.fullName(p)} · {H.age(p.birthDate)} años</span>
          <span className="tnum">{H.fmtDate(r.date)}</span>
        </div>
        <div style={{ fontSize: 26, color: "var(--brown-700)", fontWeight: 700, marginBottom: 6 }}>℞</div>
        {r.prescription.items.map((it, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            {it.ingredients.map((g, j) => <div key={j} className="rx-ing"><span>{g.name}</span><b>{g.concentration}</b></div>)}
            <div className="muted" style={{ fontSize: 13, margin: "5px 0" }}>Vehículo: {it.vehicle} · Cantidad: {it.quantity}</div>
            <div className="rx-instr"><strong>Indicaciones:</strong> {it.instructions}</div>
          </div>
        ))}
        <div style={{ marginTop: 28, textAlign: "center" }}>
          <div className="signature">{pr ? pr.name : ""}</div>
          <div style={{ borderTop: "1px solid var(--ink-2)", width: 220, margin: "4px auto 0", paddingTop: 5, fontSize: 12.5 }}>
            {pr ? pr.name : ""} · {pr ? pr.specialty : ""}<br /><span className="muted">{pr ? pr.registrationNo : ""}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Tab: Fotos ----------
// Slider antes/después: arrastra para revelar la imagen basal sobre la de control.
function BeforeAfter({ before, after, beforeLabel, afterLabel }) {
  const [pos, setPos] = React.useState(50);
  const ref = React.useRef(null);
  const dragRef = React.useRef(false);
  const setFromX = (clientX) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const p = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
    setPos(p);
  };
  React.useEffect(() => {
    const m = (e) => { if (dragRef.current) setFromX(e.clientX); };
    const u = () => { dragRef.current = false; };
    const tm = (e) => { if (dragRef.current && e.touches[0]) { setFromX(e.touches[0].clientX); e.preventDefault(); } };
    window.addEventListener("mousemove", m);
    window.addEventListener("mouseup", u);
    window.addEventListener("touchmove", tm, { passive: false });
    window.addEventListener("touchend", u);
    return () => {
      window.removeEventListener("mousemove", m);
      window.removeEventListener("mouseup", u);
      window.removeEventListener("touchmove", tm);
      window.removeEventListener("touchend", u);
    };
  }, []);
  return (
    <div className="ba-wrap">
      <div className="ba" ref={ref}
        onMouseDown={(e) => { dragRef.current = true; setFromX(e.clientX); }}
        onTouchStart={(e) => { dragRef.current = true; if (e.touches[0]) setFromX(e.touches[0].clientX); }}>
        <img className="ba-img" src={after} alt={afterLabel || "Después"} draggable="false" />
        <div className="ba-clip" style={{ width: pos + "%" }}>
          <img className="ba-img" src={before} alt={beforeLabel || "Antes"} draggable="false" />
        </div>
        <div className="ba-handle" style={{ left: pos + "%" }}>
          <div className="ba-knob" aria-label="Arrastrar para comparar">
            <Icon name="chevL" size={13} /><Icon name="chevR" size={13} />
          </div>
        </div>
        <span className="ba-lbl ba-lbl-l">Antes</span>
        <span className="ba-lbl ba-lbl-r">Después</span>
      </div>
      <input type="range" min="0" max="100" value={Math.round(pos)} onChange={(e) => setPos(Number(e.target.value))} className="ba-range" aria-label="Comparar antes y después" />
    </div>
  );
}

const FOTOS_LESIONES = [
  "Acné vulgar", "Melasma centrofacial", "Rosácea", "Cicatrices post-acné",
  "Queratosis actínica", "Toxina botulínica", "Ácido hialurónico", "Láser CO₂",
  "Peeling químico", "Dermatitis atópica", "Vitíligo", "Otro / nuevo caso",
];

function TabFotos({ p, s, role }) {
  const all = s.photos.filter(x => x.patientId === p.id).sort((a, b) => a.date.localeCompare(b.date));
  const groups = {};
  all.forEach(x => { (groups[x.lesionTag] = groups[x.lesionTag] || []).push(x); });
  const thumbsOnly = role === "recepcion";
  const canUpload = ["admin", "profesional", "esteticista"].includes(role);
  const canDelete = role === "admin";

  return (
    <div>
      <div className="warn-box" style={{ marginBottom: 16, background: "var(--info-bg)", color: "var(--info)", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Icon name="lock" size={16} />
          <span>Las fotografías clínicas son datos sensibles (LOPDP). En producción se almacenan cifradas con acceso auditado; en el demo viven en el navegador (localStorage).</span>
        </div>
        {canUpload ? <Btn kind="primary" sm icon="camera" onClick={() => A.open("subirFoto", { patientId: p.id })}>Subir foto</Btn> : null}
      </div>
      {thumbsOnly ? (
        <div className="warn-box" style={{ marginBottom: 16 }}>
          <Icon name="alert" size={16} />
          <span>Tu rol <strong>Recepción</strong> ve solo miniaturas; el comparador, la descarga y la vista a tamaño completo están restringidos al personal clínico.</span>
        </div>
      ) : null}

      {Object.keys(groups).length === 0 ? (
        <div className="card"><EmptyState icon="camera">Sin fotografías clínicas. {canUpload ? "Usa «Subir foto» para empezar." : ""}</EmptyState></div>
      ) : (
        Object.entries(groups).map(([tag, items]) => {
          const basal = items.find(x => x.kind === "basal") || items[0];
          const control = [...items].reverse().find(x => x.kind === "control" && x.id !== basal.id) || items.find(x => x.id !== basal.id);
          const hasPair = basal && control && basal.id !== control.id;
          return (
            <div key={tag} className="card card-pad" style={{ marginBottom: 16 }}>
              <div className="foto-grp-hd">
                <div>
                  <p className="card-title" style={{ marginBottom: 4 }}>{tag}</p>
                  <span className="muted" style={{ fontSize: 12.5 }}>{items.length} fotografía{items.length === 1 ? "" : "s"} · {items[0].bodyArea}</span>
                </div>
                <span className="foto-grp-range tnum">{H.fmtDate(items[0].date)} → {H.fmtDate(items[items.length - 1].date)}</span>
              </div>

              {!thumbsOnly && hasPair ? (
                <div style={{ marginTop: 12 }}>
                  <BeforeAfter before={basal.url} after={control.url} beforeLabel={basal.caption} afterLabel={control.caption} />
                  <div className="ba-meta">
                    <span><b>Basal</b> · {H.fmtDate(basal.date)} — {basal.caption}</span>
                    <span><b>Control</b> · {H.fmtDate(control.date)} — {control.caption}</span>
                  </div>
                </div>
              ) : null}

              <div className="foto-strip" style={{ marginTop: hasPair && !thumbsOnly ? 16 : 4 }}>
                {items.map(x => (
                  <button key={x.id} className={`foto-thumb${thumbsOnly ? " thumb-locked" : ""}`}
                    onClick={() => { if (!thumbsOnly) A.open("fotoLightbox", { photoId: x.id }); }}
                    disabled={thumbsOnly} title={thumbsOnly ? "Restringido para Recepción" : x.caption}>
                    {x.url ? <img src={x.url} alt={x.caption} draggable="false" /> : <Icon name="camera" size={22} />}
                    <span className={`foto-thumb-kind ${x.kind === "basal" ? "k-basal" : "k-control"}`}>{x.kind === "basal" ? "Basal" : "Control"}</span>
                    {thumbsOnly ? <span className="thumb-lock-badge"><Icon name="lock" size={12} /></span> : null}
                    <span className="foto-thumb-date tnum">{H.fmtDate(x.date)}</span>
                  </button>
                ))}
                {canUpload ? (
                  <button className="foto-thumb foto-thumb-add" onClick={() => A.open("subirFoto", { patientId: p.id, lesionTag: tag, bodyArea: items[0].bodyArea })}>
                    <Icon name="plus" size={22} />
                    <span>Añadir a este caso</span>
                  </button>
                ) : null}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ---------- Modal: Subir foto ----------
function SubirFotoModal({ props }) {
  const s = getState();
  const p = SEL.patient(s, props.patientId);
  const lesionesExistentes = Array.from(new Set(s.photos.filter(x => x.patientId === props.patientId).map(x => x.lesionTag)));
  const [f, setF] = React.useState({
    bodyArea: props.bodyArea || "",
    lesionPick: props.lesionTag || (lesionesExistentes[0] || ""),
    lesionNew: "",
    caption: "",
    kind: "basal",
    date: new Date().toISOString().slice(0, 10),
    url: "",
    fileName: "",
  });
  const fileRef = React.useRef(null);
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Selecciona una imagen válida."); return; }
    if (file.size > 5 * 1024 * 1024) { alert("La imagen supera 5 MB. Usa una más liviana para el demo."); return; }
    const reader = new FileReader();
    reader.onload = () => setF(prev => ({ ...prev, url: reader.result, fileName: file.name }));
    reader.readAsDataURL(file);
  };

  const tagFinal = f.lesionPick === "__nuevo__" ? f.lesionNew.trim() : f.lesionPick;
  const valid = f.url && f.bodyArea.trim() && tagFinal && f.caption.trim();

  const save = () => {
    A.addPhoto({
      patientId: props.patientId,
      date: new Date(`${f.date}T${new Date().toTimeString().slice(0, 5)}:00`).toISOString(),
      bodyArea: f.bodyArea.trim(),
      lesionTag: tagFinal,
      caption: f.caption.trim(),
      kind: f.kind,
      url: f.url,
    });
    A.close();
  };

  return (
    <Modal title={`Subir fotografía clínica · ${H.fullName(p)}`} onClose={A.close} foot={
      <React.Fragment>
        <Btn onClick={A.close}>Cancelar</Btn>
        <Btn kind="primary" icon="check" disabled={!valid} onClick={save}>Guardar foto</Btn>
      </React.Fragment>
    }>
      <Field label="Archivo de imagen (JPG/PNG, máx. 5 MB)">
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
        {f.url ? (
          <div className="foto-drop foto-drop-ok">
            <img src={f.url} alt="vista previa" />
            <div className="foto-drop-meta">
              <strong>{f.fileName || "imagen.png"}</strong>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => fileRef.current && fileRef.current.click()}>Cambiar</button>
            </div>
          </div>
        ) : (
          <button type="button" className="foto-drop" onClick={() => fileRef.current && fileRef.current.click()}>
            <Icon name="camera" size={28} />
            <strong>Seleccionar imagen</strong>
            <span className="muted" style={{ fontSize: 12.5 }}>Se guarda en el navegador (base64) para el demo.</span>
          </button>
        )}
      </Field>
      <div className="frow">
        <Field label="Tipo">
          <select value={f.kind} onChange={upd("kind")}>
            <option value="basal">Basal (antes)</option>
            <option value="control">Control (después / seguimiento)</option>
          </select>
        </Field>
        <Field label="Fecha"><input type="date" value={f.date} onChange={upd("date")} /></Field>
      </div>
      <Field label="Caso / lesión">
        <select value={f.lesionPick} onChange={upd("lesionPick")}>
          {lesionesExistentes.length ? <optgroup label="Casos del paciente">{lesionesExistentes.map(x => <option key={x} value={x}>{x}</option>)}</optgroup> : null}
          <optgroup label="Catálogo">
            {FOTOS_LESIONES.filter(x => !lesionesExistentes.includes(x)).map(x => <option key={x} value={x}>{x}</option>)}
          </optgroup>
          <option value="__nuevo__">+ Nuevo caso…</option>
        </select>
      </Field>
      {f.lesionPick === "__nuevo__" ? (
        <Field label="Nombre del nuevo caso"><input value={f.lesionNew} onChange={upd("lesionNew")} placeholder="Ej. Vitíligo segmentario" /></Field>
      ) : null}
      <div className="frow">
        <Field label="Área anatómica"><input value={f.bodyArea} onChange={upd("bodyArea")} placeholder="Rostro · frontal" /></Field>
        <Field label="Caption / descripción"><input value={f.caption} onChange={upd("caption")} placeholder="Basal, antes del tratamiento" /></Field>
      </div>
    </Modal>
  );
}

// ---------- Modal: Lightbox de foto ----------
function FotoLightboxModal({ props }) {
  const s = getState();
  const cur = s.photos.find(x => x.id === props.photoId);
  if (!cur) return null;
  const me = SEL.currentUser(s);
  const role = me ? me.role : "admin";
  const canDelete = role === "admin";
  const p = SEL.patient(s, cur.patientId);
  const siblings = s.photos
    .filter(x => x.patientId === cur.patientId && x.lesionTag === cur.lesionTag)
    .sort((a, b) => a.date.localeCompare(b.date));
  const idx = siblings.findIndex(x => x.id === cur.id);
  const go = (di) => {
    const n = siblings[(idx + di + siblings.length) % siblings.length];
    if (n) A.open("fotoLightbox", { photoId: n.id });
  };
  React.useEffect(() => {
    const fn = (e) => { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [cur.id]);
  const onDel = () => {
    if (!confirm("¿Eliminar esta fotografía clínica? La acción queda en la auditoría.")) return;
    A.deletePhoto(cur.id);
    A.close();
  };
  return (
    <Modal wide title={`${cur.lesionTag} · ${H.fullName(p)}`} onClose={A.close} foot={
      <React.Fragment>
        <span className="muted" style={{ fontSize: 12.5, marginRight: "auto" }}>{idx + 1} / {siblings.length} · {H.fmtDate(cur.date)} · {cur.bodyArea}</span>
        {siblings.length > 1 ? <Btn icon="chevL" onClick={() => go(-1)}>Anterior</Btn> : null}
        {siblings.length > 1 ? <Btn icon="chevR" onClick={() => go(1)}>Siguiente</Btn> : null}
        {canDelete ? <Btn icon="trash" onClick={onDel}>Eliminar</Btn> : null}
      </React.Fragment>
    }>
      <div className="foto-lb">
        <img src={cur.url} alt={cur.caption} />
        <div className="foto-lb-cap">
          <span className={`foto-kind ${cur.kind === "basal" ? "k-basal" : "k-control"}`}>{cur.kind === "basal" ? "Basal" : "Control"}</span>
          <span>{cur.caption}</span>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Tab: Consentimientos ----------
const CONSENT_KIND = {
  clinico: { label: "Clínico", short: "Clínico",      cls: "ck-clinico", icon: "stetho" },
  imagen:  { label: "Uso de imagen", short: "Imagen", cls: "ck-imagen",  icon: "camera" },
};

function TabConsents({ p, s }) {
  const cs = s.consents.filter(c => c.patientId === p.id);
  const grouped = { clinico: [], imagen: [] };
  cs.forEach(c => {
    const t = s.consentTemplates.find(x => x.id === c.templateId);
    const kind = (t && t.kind) || "clinico";
    grouped[kind].push(c);
  });

  const renderConsent = (c) => {
    const t = s.consentTemplates.find(x => x.id === c.templateId);
    const m = CONSENT_STATUS[c.status];
    const k = CONSENT_KIND[(t && t.kind) || "clinico"];
    return (
      <div key={c.id} className="card card-pad consent-card">
        <div className="consent-hd">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <strong>{t ? t.title : "Consentimiento"}</strong>
            <span className={`consent-kind ${k.cls}`}><Icon name={k.icon} size={12} /> {k.label}</span>
          </div>
          <Badge cls={m.cls}>{m.label}</Badge>
        </div>
        <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55, margin: "0 0 12px" }}>{t ? t.body : ""}</p>
        {c.status === "firmado" ? (
          <div className="consent-sig">
            <div className="sig-frame">
              {c.signatureUrl
                ? <img src={c.signatureUrl} alt={`Firma de ${H.fullName(p)}`} />
                : <span className="signature">{H.fullName(p)}</span>}
            </div>
            <div className="consent-sig-meta">
              <strong>{H.fullName(p)}</strong>
              <span className="muted" style={{ fontSize: 12.5 }}>Firmado el {H.fmtDate(c.signedAt)} a las {H.fmtTime(c.signedAt)} · CI {p.idNumber}</span>
            </div>
          </div>
        ) : (
          <Btn kind="primary" sm icon="pen" onClick={() => A.open("firmarConsent", { consentId: c.id })}>Capturar firma del paciente</Btn>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Btn kind="primary" icon="plus" onClick={() => A.open("nuevoConsent", { patientId: p.id })}>Generar consentimiento</Btn>
      </div>
      {cs.length === 0 ? <div className="card"><EmptyState icon="pen">Sin consentimientos generados.</EmptyState></div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {["clinico", "imagen"].map(k => grouped[k].length ? (
            <div key={k}>
              <div className="consent-sec-hd">
                <Icon name={CONSENT_KIND[k].icon} size={15} />
                <strong>{CONSENT_KIND[k].label}</strong>
                <span className="muted" style={{ fontSize: 12.5 }}>{grouped[k].length} documento{grouped[k].length === 1 ? "" : "s"}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {grouped[k].map(renderConsent)}
              </div>
            </div>
          ) : null)}
        </div>
      )}
    </div>
  );
}

function NuevoConsentModal({ props }) {
  const s = getState();
  const [tid, setTid] = React.useState("");
  const byKind = { clinico: [], imagen: [] };
  s.consentTemplates.forEach(t => { (byKind[t.kind || "clinico"] = byKind[t.kind || "clinico"] || []).push(t); });
  const sel = tid ? s.consentTemplates.find(t => t.id === tid) : null;
  return (
    <Modal title="Generar consentimiento" onClose={A.close} foot={
      <React.Fragment>
        <Btn onClick={A.close}>Cancelar</Btn>
        <Btn kind="primary" icon="check" disabled={!tid} onClick={() => { A.addConsent(props.patientId, tid); A.close(); }}>Generar</Btn>
      </React.Fragment>
    }>
      <Field label="Tipo de consentimiento">
        <select value={tid} onChange={(e) => setTid(e.target.value)}>
          <option value="">Seleccionar plantilla…</option>
          <optgroup label="Consentimiento clínico (procedimiento)">
            {byKind.clinico.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </optgroup>
          <optgroup label="Cesión de derechos de imagen">
            {byKind.imagen.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </optgroup>
        </select>
      </Field>
      {sel ? (
        <React.Fragment>
          <div className={`consent-kind ${CONSENT_KIND[sel.kind || "clinico"].cls}`} style={{ marginBottom: 10 }}>
            <Icon name={CONSENT_KIND[sel.kind || "clinico"].icon} size={12} /> {CONSENT_KIND[sel.kind || "clinico"].label}
          </div>
          <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55, margin: 0 }}>{sel.body}</p>
        </React.Fragment>
      ) : null}
    </Modal>
  );
}

// Canvas de firma manuscrita: mouse + touch, redimensiona con devicePixelRatio.
function SignaturePad({ onChange }) {
  const canvasRef = React.useRef(null);
  const drawingRef = React.useRef(false);
  const lastRef = React.useRef(null);
  const [empty, setEmpty] = React.useState(true);

  React.useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = "#1F2937";
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const getXY = (e) => {
    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    const pt = e.touches ? e.touches[0] : e;
    return { x: pt.clientX - r.left, y: pt.clientY - r.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    lastRef.current = getXY(e);
  };
  const move = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const cur = getXY(e);
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(cur.x, cur.y);
    ctx.stroke();
    lastRef.current = cur;
    if (empty) setEmpty(false);
  };
  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (onChange) onChange(canvasRef.current.toDataURL("image/png"));
  };
  const clear = () => {
    const canvas = canvasRef.current; const ctx = canvas.getContext("2d");
    const r = canvas.getBoundingClientRect();
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, r.width, r.height);
    setEmpty(true);
    if (onChange) onChange(null);
  };

  return (
    <div className="sigpad">
      <canvas ref={canvasRef}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      {empty ? <span className="sigpad-hint">Firme aquí con el dedo o el lápiz óptico</span> : null}
      <button type="button" className="sigpad-clear" onClick={clear} title="Borrar firma">
        <Icon name="trash" size={13} /> Borrar
      </button>
    </div>
  );
}

function FirmarConsentModal({ props }) {
  const s = getState();
  const c = s.consents.find(x => x.id === props.consentId);
  const p = c ? SEL.patient(s, c.patientId) : null;
  const t = c ? s.consentTemplates.find(x => x.id === c.templateId) : null;
  const [sig, setSig] = React.useState(null);
  const [acepta, setAcepta] = React.useState(false);
  if (!c) return null;
  const k = CONSENT_KIND[(t && t.kind) || "clinico"];
  const ok = !!sig && acepta;
  return (
    <Modal wide title={`Firma del paciente · ${k.label}`} onClose={A.close} foot={
      <React.Fragment>
        <Btn onClick={A.close}>Cancelar</Btn>
        <Btn kind="primary" icon="pen" disabled={!ok} onClick={() => { A.signConsent(c.id, sig); A.close(); }}>Registrar firma</Btn>
      </React.Fragment>
    }>
      <div className={`consent-kind ${k.cls}`} style={{ marginBottom: 10 }}>
        <Icon name={k.icon} size={12} /> {k.label}
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>{t ? t.title : ""}</p>
      <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55, maxHeight: 130, overflow: "auto", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "10px 12px", margin: "0 0 14px", background: "var(--bg-subtle)" }}>{t ? t.body : ""}</p>

      <label className="consent-check">
        <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
        <span>El/la paciente <strong>{H.fullName(p)}</strong> (CI {p.idNumber}) declara haber leído y comprendido este documento y acepta firmar de forma libre y voluntaria.</span>
      </label>

      <Field label="Firma manuscrita">
        <SignaturePad onChange={setSig} />
      </Field>
      <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>La firma se guarda como imagen PNG dentro del expediente del paciente. Auditoría: fecha, hora, IP y usuario que captura la firma.</p>
    </Modal>
  );
}

// ---------- Tab: Procedimientos del paciente ----------
function TabProcs({ p, s }) {
  const list = s.procedures.filter(x => x.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date));
  return list.length === 0 ? <div className="card"><EmptyState icon="syringe">Sin procedimientos registrados.</EmptyState></div> : (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {list.map(pr => <ProcCard key={pr.id} pr={pr} s={s} />)}
    </div>
  );
}

// ---------- Tab: Facturas del paciente ----------
function TabFacturas({ p, s }) {
  const list = s.invoices.filter(f => f.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date));
  return list.length === 0 ? <div className="card"><EmptyState icon="receipt">Sin facturas emitidas.</EmptyState></div> : (
    <div className="card">
      <InvoiceTable list={list} s={s} hidePatient />
    </div>
  );
}

Object.assign(window, {
  PatientsList, PatientDetail, EvolucionModal, PrintRxModal, NuevoConsentModal, FirmarConsentModal, CIE10,
  SubirFotoModal, FotoLightboxModal, BeforeAfter, SignaturePad, CONSENT_KIND,
});
