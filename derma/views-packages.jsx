// DERMA-OS · M5 — Paquetes / bonos / sesiones / abonos
// Catálogo de paquetes + venta a paciente + saldo de sesiones (baja al atender) + abonos.

// ¿El rol puede vender/registrar paquetes y abonos?
function canSellPkg(role) { return ["Total", "Vender/registrar"].includes(PERM[role].paquetes); }
// ¿El rol puede ejecutar (consumir) una sesión manualmente?
function canExecPkg(role) { return ["Total", "Ejecutar"].includes(PERM[role].paquetes); }
// ¿El rol puede crear/editar el catálogo?
function canEditCatalog(role) { return PERM[role].paquetes === "Total"; }

// Estado visual de un bono vendido
function balanceMeta(b) {
  const done = b.sessionsUsed >= b.sessionsTotal;
  if (done) return { label: "Completado", cls: "bg-neutral" };
  if (PKG.expired(b)) return { label: "Vencido", cls: "bg-err" };
  if (PKG.econBalance(b) > 0) return { label: "Activo · saldo pendiente", cls: "bg-warn" };
  return { label: "Activo · pagado", cls: "bg-ok" };
}

// Progreso de sesiones: puntos numerados (hasta 12) o barra
function SessionDots({ used, total }) {
  if (total > 12) {
    const pct = Math.round((used / total) * 100);
    return (
      <div style={{ flex: 1, minWidth: 160 }}>
        <div className="pkg-progress-wrap"><i style={{ width: pct + "%" }}></i></div>
      </div>
    );
  }
  return (
    <div className="pkg-dots">
      {[...Array(total)].map((_, i) => (
        <span key={i} className={`pkg-dot${i < used ? " used" : i === used ? " next" : ""}`}>{i + 1}</span>
      ))}
    </div>
  );
}

// ---------- Tarjeta de bono vendido ----------
function BalanceCard({ b, s, role, showPatient }) {
  const pk = SEL.package(s, b.packageId);
  const sv = pk ? SEL.service(s, pk.serviceId) : null;
  const pat = SEL.patient(s, b.patientId);
  const seller = SEL.professional(s, b.sellerProfessionalId);
  const paid = PKG.paid(b), econ = PKG.econBalance(b), left = PKG.sessionsLeft(b);
  const meta = balanceMeta(b);
  const expired = PKG.expired(b) && b.sessionsUsed < b.sessionsTotal;
  const canConsume = canExecPkg(role) && left > 0 && !expired;
  const canPay = ["Total", "Cobrar"].includes(PERM[role].pagos);

  return (
    <div className="card card-pad">
      <div className="pkg-head">
        <div style={{ minWidth: 0 }}>
          <strong style={{ fontSize: 15.5 }}>{pk ? pk.name : "Paquete"}</strong>
          {showPatient ? <div className="muted" style={{ fontSize: 13 }}>{H.fullName(pat)} · CI {pat ? pat.idNumber : "—"}</div>
            : <div className="muted" style={{ fontSize: 13 }}>{sv ? sv.name : ""}</div>}
        </div>
        <Badge cls={meta.cls}>{meta.label}</Badge>
      </div>

      <div className="pkg-body">
        <div className="pkg-sessions">
          <div className="pkg-sessions-top">
            <span className="muted" style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Sesiones</span>
            <span><b className="tnum" style={{ fontSize: 17 }}>{left}</b> <span className="muted">de {b.sessionsTotal} disponibles</span></span>
          </div>
          <SessionDots used={b.sessionsUsed} total={b.sessionsTotal} />
          <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
            Vendido {H.fmtDate(b.soldAt)}{seller ? ` · ${seller.name}` : ""} · vence {H.fmtDate(b.vencimiento)}
            {expired ? <strong style={{ color: "var(--err)" }}> · VENCIDO</strong> : null}
          </div>
        </div>

        <div className="pkg-money">
          <div className="pkg-econ">
            <div className="pe"><span>Precio</span><b className="tnum">{H.fmtMoney(b.price)}</b></div>
            <div className="pe"><span>Abonado</span><b className="tnum" style={{ color: "var(--ok)" }}>{H.fmtMoney(paid)}</b></div>
            <div className="pe"><span>Saldo</span><b className="tnum" style={{ color: econ > 0 ? "var(--warn)" : "var(--ink-3)" }}>{H.fmtMoney(econ)}</b></div>
          </div>
          {b.payments.length ? (
            <div className="pay-list">
              {b.payments.map(p => (
                <div key={p.id} className="pay-item">
                  <span>{H.fmtDate(p.at)} · {(PAY_METHODS[p.method] || {}).label || p.method}{p.note ? ` · ${p.note}` : ""}</span>
                  <b className="tnum">{H.fmtMoney(p.amount)}</b>
                </div>
              ))}
            </div>
          ) : <p className="muted" style={{ fontSize: 13, margin: "4px 0 0" }}>Sin abonos registrados.</p>}
        </div>
      </div>

      {(canSellPkg(role) && econ > 0) || (canPay && econ > 0) || canConsume ? (
        <div className="pkg-actions">
          {canSellPkg(role) && econ > 0 ? <Btn sm icon="receipt" onClick={() => A.open("abono", { balanceId: b.id })}>Registrar abono</Btn> : null}
          {canPay && econ > 0 ? <Btn sm icon="link" onClick={() => A.open("generarCobro", { patientId: b.patientId, conceptType: "paquete", balanceId: b.id })}>Cobrar (Payphone)</Btn> : null}
          {canConsume ? <Btn sm kind="primary" icon="check" onClick={() => A.consumeSession(b.id, { professionalId: b.sellerProfessionalId, note: "Sesión registrada manualmente" })}>Registrar sesión</Btn> : null}
        </div>
      ) : null}
    </div>
  );
}

// ---------- Vista principal ----------
function PackagesView() {
  const s = useStore();
  const me = SEL.currentUser(s);
  const role = me ? me.role : "admin";
  const balances = [...s.packageBalances].sort((a, b) => b.soldAt.localeCompare(a.soldAt));
  const activeBal = balances.filter(b => b.status === "activo" && !PKG.expired(b));
  const sesionesPorConsumir = activeBal.reduce((t, b) => t + PKG.sessionsLeft(b), 0);
  const porCobrar = balances.reduce((t, b) => t + Math.max(0, PKG.econBalance(b)), 0);

  return (
    <div className="content-inner">
      <PageHead title="Paquetes y bonos" sub="Ciclos de tratamiento: define paquetes, véndelos por paciente y descuenta sesiones al atender">
        {canSellPkg(role) ? <Btn kind="primary" icon="layers" onClick={() => A.open("venderPaquete")}>Vender paquete</Btn> : null}
      </PageHead>

      <div className="kpi-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="card kpi">
          <div className="k-label"><Icon name="layers" size={15} /> Bonos activos</div>
          <div className="k-value">{activeBal.length}</div>
          <div className="k-foot">{balances.length} vendidos en total</div>
        </div>
        <div className="card kpi">
          <div className="k-label"><Icon name="check" size={15} /> Sesiones por consumir</div>
          <div className="k-value">{sesionesPorConsumir}</div>
          <div className="k-foot">en bonos vigentes</div>
        </div>
        <div className="card kpi">
          <div className="k-label"><Icon name="receipt" size={15} /> Saldo por cobrar</div>
          <div className="k-value">{H.fmtMoney(porCobrar)}</div>
          <div className="k-foot">abonos pendientes</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "4px 0 12px" }}>
        <p className="card-title" style={{ margin: 0 }}>Catálogo de paquetes</p>
        {canEditCatalog(role) ? <Btn sm icon="plus" onClick={() => A.open("paquete")}>Nuevo paquete</Btn> : null}
      </div>
      <div className="card" style={{ marginBottom: 28 }}>
        <table className="tbl">
          <thead><tr><th>Paquete</th><th>Servicio base</th><th className="num">Sesiones</th><th className="num">Precio</th><th className="num">Por sesión</th><th>Vigencia</th><th>Estado</th></tr></thead>
          <tbody>
            {s.packages.map(pk => {
              const sv = SEL.service(s, pk.serviceId);
              return (
                <tr key={pk.id}>
                  <td><strong>{pk.name}</strong></td>
                  <td>{sv ? sv.name : "—"}</td>
                  <td className="num tnum">{pk.sessions}</td>
                  <td className="num tnum">{H.fmtMoney(pk.price)}</td>
                  <td className="num tnum muted">{H.fmtMoney(pk.price / pk.sessions)}</td>
                  <td className="tnum">{pk.validityDays} días · c/{pk.intervalDays} d</td>
                  <td>
                    {canEditCatalog(role) ? (
                      <button className={`badge ${pk.active ? "bg-ok" : "bg-neutral"}`} style={{ cursor: "pointer", border: "none" }}
                        title="Activar / desactivar" onClick={() => A.togglePackage(pk.id)}>{pk.active ? "Activo" : "Inactivo"}</button>
                    ) : <Badge cls={pk.active ? "bg-ok" : "bg-neutral"}>{pk.active ? "Activo" : "Inactivo"}</Badge>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="card-title" style={{ marginBottom: 12 }}>Paquetes vendidos · saldo por paciente</p>
      {balances.length === 0 ? <div className="card"><EmptyState icon="layers">Aún no se ha vendido ningún paquete.</EmptyState></div> : (
        <div className="pkg-grid">
          {balances.map(b => <BalanceCard key={b.id} b={b} s={s} role={role} showPatient />)}
        </div>
      )}
    </div>
  );
}

// ---------- Modal: nuevo paquete (catálogo) ----------
function PaqueteModal() {
  const s = getState();
  const [f, setF] = React.useState({ name: "", serviceId: "", sessions: 4, price: "", intervalDays: 30, validityDays: 180 });
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const sv = s.services.find(x => x.id === f.serviceId);
  const valid = f.name && f.serviceId && Number(f.sessions) > 0 && Number(f.price) > 0;
  const save = () => {
    A.addPackage({ name: f.name, serviceId: f.serviceId, sessions: Number(f.sessions), price: Number(f.price), intervalDays: Number(f.intervalDays) || 30, validityDays: Number(f.validityDays) || 180 });
    A.close();
  };
  return (
    <Modal title="Nuevo paquete de sesiones" onClose={A.close} foot={
      <React.Fragment>
        <Btn onClick={A.close}>Cancelar</Btn>
        <Btn kind="primary" icon="check" disabled={!valid} onClick={save}>Crear paquete</Btn>
      </React.Fragment>
    }>
      <Field label="Nombre del paquete"><input value={f.name} onChange={upd("name")} placeholder="Láser CO₂ · 4 sesiones" /></Field>
      <Field label="Servicio base">
        <select value={f.serviceId} onChange={upd("serviceId")}>
          <option value="">Seleccionar servicio…</option>
          {s.services.filter(x => x.active).map(x => <option key={x.id} value={x.id}>{x.name} · {H.fmtMoney(x.price)}</option>)}
        </select>
      </Field>
      <div className="frow3">
        <Field label="Nº de sesiones"><input type="number" min="1" value={f.sessions} onChange={upd("sessions")} /></Field>
        <Field label="Precio total (USD)"><input type="number" min="0" step="5" value={f.price} onChange={upd("price")} placeholder="850" /></Field>
        <Field label="Intervalo sugerido (días)"><input type="number" min="1" value={f.intervalDays} onChange={upd("intervalDays")} /></Field>
      </div>
      <Field label="Vigencia (días desde la venta)"><input type="number" min="1" value={f.validityDays} onChange={upd("validityDays")} /></Field>
      {sv && Number(f.sessions) > 0 && Number(f.price) > 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>
          {H.fmtMoney(f.price / f.sessions)} por sesión · precio individual {H.fmtMoney(sv.price)}
          {sv.price * f.sessions > f.price ? ` · ahorro ${H.fmtMoney(sv.price * f.sessions - f.price)}` : ""}
        </p>
      ) : null}
    </Modal>
  );
}

// ---------- Modal: vender paquete a paciente ----------
function VenderPaqueteModal({ props }) {
  const s = getState();
  const me = SEL.currentUser(s);
  const [f, setF] = React.useState({
    patientId: props.patientId || "",
    packageId: "",
    sellerProfessionalId: (me && me.professionalId) || "pr1",
    initialPayment: "", method: "efectivo", note: "Abono inicial",
  });
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const pk = s.packages.find(p => p.id === f.packageId);
  const valid = f.patientId && f.packageId;
  const lockPatient = !!props.patientId;

  const save = () => {
    A.sellPackage({
      patientId: f.patientId, packageId: f.packageId, sellerProfessionalId: f.sellerProfessionalId,
      initialPayment: f.initialPayment, method: f.method, note: f.note,
    });
    A.close();
    H.nav(`/patients/${f.patientId}/paquetes`);
  };

  return (
    <Modal title="Vender paquete" onClose={A.close} foot={
      <React.Fragment>
        <Btn onClick={A.close}>Cancelar</Btn>
        <Btn kind="primary" icon="check" disabled={!valid} onClick={save}>Vender paquete</Btn>
      </React.Fragment>
    }>
      <div className="frow">
        <Field label="Paciente">
          <select value={f.patientId} onChange={upd("patientId")} disabled={lockPatient}>
            <option value="">Seleccionar…</option>
            {s.patients.map(p => <option key={p.id} value={p.id}>{H.fullName(p)} · CI {p.idNumber}</option>)}
          </select>
        </Field>
        <Field label="Vendedor / profesional">
          <select value={f.sellerProfessionalId} onChange={upd("sellerProfessionalId")}>
            {s.professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Paquete">
        <select value={f.packageId} onChange={upd("packageId")}>
          <option value="">Seleccionar paquete…</option>
          {s.packages.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name} · {H.fmtMoney(p.price)}</option>)}
        </select>
      </Field>
      {pk ? (
        <div className="warn-box" style={{ background: "var(--cream)", color: "var(--brown-800)", marginBottom: 14 }}>
          <Icon name="layers" size={17} />
          <div>
            <strong>{pk.sessions} sesiones · {H.fmtMoney(pk.price)}</strong> ({H.fmtMoney(pk.price / pk.sessions)} c/u)
            <div style={{ fontSize: 12.5, marginTop: 2 }}>Vigencia {pk.validityDays} días · intervalo sugerido cada {pk.intervalDays} días.</div>
          </div>
        </div>
      ) : null}
      <div className="frow3">
        <Field label="Abono inicial (USD)"><input type="number" min="0" step="5" value={f.initialPayment} onChange={upd("initialPayment")} placeholder="0" /></Field>
        <Field label="Método de pago">
          <select value={f.method} onChange={upd("method")}>
            {Object.entries(PAY_METHODS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="Nota"><input value={f.note} onChange={upd("note")} placeholder="Abono inicial" /></Field>
      </div>
      <p className="muted" style={{ fontSize: 12.5 }}>El abono inicial es opcional. El saldo restante queda registrado y se puede abonar después. Las sesiones se descuentan automáticamente al marcar como «atendida» una cita del mismo servicio.</p>
    </Modal>
  );
}

// ---------- Modal: registrar abono ----------
function AbonoModal({ props }) {
  const s = getState();
  const b = s.packageBalances.find(x => x.id === props.balanceId);
  const pk = b ? SEL.package(s, b.packageId) : null;
  const pat = b ? SEL.patient(s, b.patientId) : null;
  const econ = b ? PKG.econBalance(b) : 0;
  const [amount, setAmount] = React.useState(econ > 0 ? String(econ) : "");
  const [method, setMethod] = React.useState("efectivo");
  const [note, setNote] = React.useState("");
  if (!b) return null;
  const valid = Number(amount) > 0;
  const save = () => { A.addAbono(b.id, amount, method, note); A.close(); };
  return (
    <Modal title="Registrar abono" onClose={A.close} foot={
      <React.Fragment>
        <Btn onClick={A.close}>Cancelar</Btn>
        <Btn kind="primary" icon="check" disabled={!valid} onClick={save}>Registrar abono</Btn>
      </React.Fragment>
    }>
      <div className="warn-box" style={{ background: "var(--bg-subtle)", color: "var(--ink-2)", marginBottom: 14 }}>
        <Icon name="layers" size={16} />
        <div>
          <strong>{pk ? pk.name : "Paquete"}</strong> · {H.fullName(pat)}
          <div style={{ fontSize: 12.5, marginTop: 2 }}>Precio {H.fmtMoney(b.price)} · abonado {H.fmtMoney(PKG.paid(b))} · saldo <strong style={{ color: "var(--warn)" }}>{H.fmtMoney(econ)}</strong></div>
        </div>
      </div>
      <div className="frow">
        <Field label="Monto del abono (USD)"><input type="number" min="0" step="5" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Método de pago">
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {Object.entries(PAY_METHODS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Nota (opcional)"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="2º abono, saldo, etc." /></Field>
      {Number(amount) > econ && econ >= 0 ? <p className="muted" style={{ fontSize: 12.5 }}>El monto supera el saldo pendiente ({H.fmtMoney(econ)}); quedará como saldo a favor.</p> : null}
    </Modal>
  );
}

// ---------- Tab del paciente: Paquetes ----------
function TabPaquetes({ p, s, role }) {
  const list = SEL.packageBalancesByPatient(s, p.id);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        {canSellPkg(role) ? <Btn kind="primary" icon="layers" onClick={() => A.open("venderPaquete", { patientId: p.id })}>Vender paquete</Btn> : null}
      </div>
      {list.length === 0 ? <div className="card"><EmptyState icon="layers">Este paciente no tiene paquetes ni bonos.</EmptyState></div> : (
        <div className="pkg-grid">
          {list.map(b => <BalanceCard key={b.id} b={b} s={s} role={role} />)}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { PackagesView, PaqueteModal, VenderPaqueteModal, AbonoModal, BalanceCard, TabPaquetes });
