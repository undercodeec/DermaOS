// DERMA-OS · Dashboard + Agenda semanal
function Dashboard() {
  const s = useStore();
  const today = new Date();
  const citasHoy = s.appointments.filter(a => H.sameDay(a.start, today) && a.status !== "cancelada").sort((a, b) => a.start.localeCompare(b.start));
  const atendidas = citasHoy.filter(a => a.status === "atendida").length;
  const mes = today.getMonth();
  const ingresosMes = s.invoices.filter(f => new Date(f.date).getMonth() === mes && f.status === "autorizada").reduce((t, f) => t + f.total, 0);
  const lowStock = SEL.lowStock(s);
  const consentPend = s.consents.filter(c => c.status === "pendiente");
  const proxCitas = s.appointments.filter(a => new Date(a.start) > today && !H.sameDay(a.start, today) && a.status !== "cancelada").sort((a, b) => a.start.localeCompare(b.start)).slice(0, 4);

  return (
    <div className="content-inner">
      <PageHead title="Dashboard" sub={H.fmtDateLong(today.toISOString())}>
        <Btn kind="primary" icon="plus" onClick={() => A.open("cita")}>Nueva Cita</Btn>
      </PageHead>

      <div className="kpi-row">
        <div className="card kpi">
          <div className="k-label"><Icon name="calendar" size={15} /> Citas de hoy</div>
          <div className="k-value">{citasHoy.length}</div>
          <div className="k-foot">{atendidas} atendidas · {citasHoy.length - atendidas} por atender</div>
        </div>
        <div className="card kpi">
          <div className="k-label"><Icon name="receipt" size={15} /> Ingresos del mes</div>
          <div className="k-value">{H.fmtMoney(ingresosMes)}</div>
          <div className="k-foot">{s.invoices.filter(f => new Date(f.date).getMonth() === mes).length} facturas emitidas</div>
        </div>
        <div className="card kpi">
          <div className="k-label"><Icon name="users" size={15} /> Pacientes activos</div>
          <div className="k-value">{s.patients.length}</div>
          <div className="k-foot">{s.patients.filter(p => new Date(p.createdAt) > new Date(Date.now() - 90 * 864e5)).length} nuevos en 90 días</div>
        </div>
        <div className="card kpi">
          <div className="k-label"><Icon name="alert" size={15} /> Alertas</div>
          <div className="k-value">{lowStock.length + consentPend.length}</div>
          <div className="k-foot">{lowStock.length} stock bajo · {consentPend.length} consentim. pendiente</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-pad" style={{ paddingBottom: 8 }}>
            <p className="card-title" style={{ marginBottom: 4 }}>Agenda de hoy</p>
          </div>
          {citasHoy.length === 0 ? <EmptyState icon="calendar">No hay citas para hoy.</EmptyState> : (
            <table className="tbl">
              <tbody>
                {citasHoy.map(a => {
                  const p = SEL.patient(s, a.patientId), sv = SEL.service(s, a.serviceId), pr = SEL.professional(s, a.professionalId);
                  return (
                    <tr key={a.id} className="rowlink" onClick={() => A.open("citaDetalle", { id: a.id })}>
                      <td className="tnum" style={{ width: 64, fontWeight: 700 }}>{H.fmtTime(a.start)}</td>
                      <td>
                        <strong>{H.fullName(p)}</strong>
                        <div className="muted" style={{ fontSize: 12.5 }}>{sv ? sv.name : "—"} · {pr ? pr.name.split(" ")[0] + " " + pr.name.split(" ")[1] : ""}</div>
                      </td>
                      <td style={{ textAlign: "right" }}><StatusBadge status={a.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card card-pad">
            <p className="card-title">Requiere atención</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {consentPend.map(c => {
                const p = SEL.patient(s, c.patientId);
                const t = s.consentTemplates.find(x => x.id === c.templateId);
                return (
                  <div key={c.id} className="warn-box">
                    <Icon name="pen" size={16} />
                    <div style={{ flex: 1 }}>
                      <strong>{H.fullName(p)}</strong> tiene pendiente la firma del consentimiento de {t ? t.procedureType : "procedimiento"}.
                      <div><button className="btn btn-ghost btn-sm" style={{ padding: "4px 0" }} onClick={() => H.nav(`/patients/${c.patientId}/consentimientos`)}>Ir a consentimientos →</button></div>
                    </div>
                  </div>
                );
              })}
              {lowStock.map(i => (
                <div key={i.id} className="warn-box" style={{ background: "var(--err-bg)", color: "var(--err)" }}>
                  <Icon name="box" size={16} />
                  <div style={{ flex: 1 }}>
                    <strong>{i.name}</strong> — quedan {i.stock} {i.unit}{i.stock === 1 ? "" : i.unit.endsWith("s") ? "" : "s"} (mínimo {i.minStock}).
                    <div><button className="btn btn-ghost btn-sm" style={{ padding: "4px 0", color: "var(--err)" }} onClick={() => H.nav("/inventory")}>Ir a inventario →</button></div>
                  </div>
                </div>
              ))}
              {consentPend.length === 0 && lowStock.length === 0 ? <p className="muted" style={{ margin: 0 }}>Sin alertas pendientes.</p> : null}
            </div>
          </div>

          <div className="card card-pad">
            <p className="card-title">Próximas citas</p>
            {proxCitas.length === 0 ? <p className="muted" style={{ margin: 0 }}>Nada agendado.</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {proxCitas.map(a => {
                  const p = SEL.patient(s, a.patientId), sv = SEL.service(s, a.serviceId);
                  return (
                    <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, fontSize: 14 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><strong>{H.fullName(p)}</strong> <span className="muted">· {sv ? sv.name : ""}</span></span>
                      <span className="muted tnum" style={{ flexShrink: 0, whiteSpace: "nowrap" }}>{H.fmtDate(a.start)} {H.fmtTime(a.start)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Agenda semanal ----------
const AG_START = 8, AG_END = 18, AG_CELL = 56;

function weekStart(offset) {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7); // lunes
  d.setHours(0, 0, 0, 0);
  return d;
}

function Agenda() {
  const s = useStore();
  const [week, setWeek] = React.useState(0);
  const [prof, setProf] = React.useState("all");
  const start = weekStart(week);
  const days = [...Array(6)].map((_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  const hours = [...Array(AG_END - AG_START)].map((_, i) => AG_START + i);

  const evts = s.appointments.filter(a => prof === "all" || a.professionalId === prof);

  return (
    <div className="content-inner">
      <PageHead title="Agenda" sub={`Semana del ${days[0].getDate()} de ${["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"][days[0].getMonth()]}`}>
        <select value={prof} onChange={(e) => setProf(e.target.value)} style={{ border: "1px solid var(--border-strong)", borderRadius: 8, padding: "8px 10px", background: "#fff" }}>
          <option value="all">Ambos profesionales</option>
          {s.professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <Btn icon="chevL" onClick={() => setWeek(week - 1)}></Btn>
        <Btn onClick={() => setWeek(0)}>Hoy</Btn>
        <Btn icon="chevR" onClick={() => setWeek(week + 1)}></Btn>
        <Btn kind="primary" icon="plus" onClick={() => A.open("cita")}>Nueva Cita</Btn>
      </PageHead>

      <div className="card" style={{ overflow: "hidden" }}>
        <div className="ag-grid">
          <div></div>
          {days.map((d, i) => (
            <div key={i} className={`ag-dayhead${d.toDateString() === new Date().toDateString() ? " today" : ""}`}>
              {H.fmtDayShort(d)} <span className="dnum">{d.getDate()}</span>
            </div>
          ))}
          <div>
            {hours.map(h => <div key={h} className="ag-hourcell ag-timecol" style={{ border: "none" }}>{h}:00</div>)}
          </div>
          {days.map((d, di) => (
            <div key={di} className="ag-daycol">
              {hours.map(h => (
                <div key={h} className="ag-hourcell" title="Clic para agendar"
                  onClick={() => A.open("cita", { date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, time: `${String(h).padStart(2, "0")}:00` })}></div>
              ))}
              {evts.filter(a => H.sameDay(a.start, d)).map(a => {
                const st = new Date(a.start), en = new Date(a.end);
                const top = ((st.getHours() + st.getMinutes() / 60) - AG_START) * AG_CELL;
                const h = Math.max(26, ((en - st) / 36e5) * AG_CELL - 3);
                const p = SEL.patient(s, a.patientId), sv = SEL.service(s, a.serviceId);
                const pr = SEL.professional(s, a.professionalId);
                const m = STATUS_META[a.status];
                const cancel = a.status === "cancelada" || a.status === "no_show";
                return (
                  <div key={a.id} className="ag-evt"
                    style={{ top, height: h, background: cancel ? "#F4F0EA" : m.bg, borderColor: cancel ? "var(--border-strong)" : m.color, color: cancel ? "var(--ink-3)" : "var(--ink)", borderLeftColor: pr ? pr.color : m.color, textDecoration: cancel ? "line-through" : "none" }}
                    onClick={(e) => { e.stopPropagation(); A.open("citaDetalle", { id: a.id }); }}>
                    <strong>{H.fmtTime(a.start)} · {p ? p.firstName + " " + p.lastName.split(" ")[0] : ""}</strong>
                    {sv ? sv.name : ""}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="card card-pad mt">
        <div className="ag-legend">
          <strong style={{ fontSize: 12.5 }}>Profesional:</strong>
          {s.professionals.map(p => <span key={p.id}><i className="ag-dot" style={{ background: p.color }}></i>{p.name}</span>)}
          <span style={{ width: 18 }}></span>
          <strong style={{ fontSize: 12.5 }}>Estado:</strong>
          {Object.entries(STATUS_META).map(([k, m]) => <span key={k}><i className="ag-dot" style={{ background: m.bg, border: `1.5px solid ${m.color}` }}></i>{m.label}</span>)}
        </div>
      </div>
    </div>
  );
}

// ---------- Modal: detalle de cita ----------
function CitaDetalleModal({ props }) {
  const s = useStore();
  const a = s.appointments.find(x => x.id === props.id);
  if (!a) return null;
  const p = SEL.patient(s, a.patientId), sv = SEL.service(s, a.serviceId), pr = SEL.professional(s, a.professionalId);
  const FLOW = ["agendada", "confirmada", "en_sala", "atendida"];
  const next = FLOW[FLOW.indexOf(a.status) + 1];
  // M5 · cobertura por paquete
  const consumedBal = SEL.balanceByRedemptionAppt(s, a.id);
  const coverBal = !consumedBal ? SEL.activeBalanceForService(s, a.patientId, a.serviceId) : null;
  const consumedPk = consumedBal ? SEL.package(s, consumedBal.packageId) : null;
  const coverPk = coverBal ? SEL.package(s, coverBal.packageId) : null;

  return (
    <Modal title="Detalle de cita" onClose={A.close} foot={
      <React.Fragment>
        {a.status !== "atendida" && a.status !== "cancelada" && a.status !== "no_show" ? (
          <React.Fragment>
            <Btn kind="danger" sm onClick={() => { A.setAppointmentStatus(a.id, "no_show"); }}>No asistió</Btn>
            <Btn sm onClick={() => { A.setAppointmentStatus(a.id, "cancelada"); }}>Cancelar cita</Btn>
          </React.Fragment>
        ) : null}
        {next ? <Btn kind="primary" sm icon="check" onClick={() => A.setAppointmentStatus(a.id, next)}>Marcar {STATUS_META[next].label.toLowerCase()}</Btn> : null}
      </React.Fragment>
    }>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <div className="avatar">{p ? H.initials(p) : "?"}</div>
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: 16 }}>{H.fullName(p)}</strong>
          <div className="muted" style={{ fontSize: 13 }}>{p ? `${H.age(p.birthDate)} años · CI ${p.idNumber}` : ""}</div>
        </div>
        <StatusBadge status={a.status} />
      </div>
      <table className="tbl" style={{ fontSize: 14 }}>
        <tbody>
          <tr><td className="muted" style={{ width: 130 }}>Fecha</td><td>{H.fmtDateLong(a.start)}</td></tr>
          <tr><td className="muted">Hora</td><td className="tnum">{H.fmtTime(a.start)} – {H.fmtTime(a.end)}</td></tr>
          <tr><td className="muted">Servicio</td><td>{sv ? sv.name : "—"} <span className="muted">· {sv ? H.fmtMoney(sv.price) : ""}</span></td></tr>
          <tr><td className="muted">Tipo</td><td>{KIND_LABEL[a.kind]}</td></tr>
          <tr><td className="muted">Profesional</td><td>{pr ? pr.name : "—"}</td></tr>
          {a.notes ? <tr><td className="muted">Notas</td><td>{a.notes}</td></tr> : null}
        </tbody>
      </table>
      <div style={{ marginTop: 12 }}>
        <Btn sm kind="ghost" icon="user" onClick={() => { A.close(); H.nav(`/patients/${a.patientId}/antecedentes`); }}>Abrir ficha del paciente →</Btn>
      </div>
      {consumedBal ? (
        <div className="warn-box" style={{ background: "var(--ok-bg)", color: "var(--ok)", marginTop: 12 }}>
          <Icon name="layers" size={16} />
          <span>Se descontó <strong>1 sesión</strong> del paquete <strong>{consumedPk ? consumedPk.name : ""}</strong> al atender esta cita · quedan <strong>{PKG.sessionsLeft(consumedBal)}</strong> de {consumedBal.sessionsTotal}.</span>
        </div>
      ) : coverBal ? (
        <div className="warn-box" style={{ background: "var(--cream)", color: "var(--brown-800)", marginTop: 12 }}>
          <Icon name="layers" size={16} />
          <span>Cubierta por el paquete <strong>{coverPk ? coverPk.name : ""}</strong> ({PKG.sessionsLeft(coverBal)} sesiones disponibles). Se descontará una sesión al marcar <strong>Atendida</strong>.</span>
        </div>
      ) : null}
    </Modal>
  );
}

Object.assign(window, { Dashboard, Agenda, CitaDetalleModal });
