// DERMA-OS · M6 — Cobros: links de pago Payphone + pagos parciales / depósitos
// Generar link (cita/paquete/factura/depósito/libre) → enviar por WhatsApp/email → conciliar (marcar pagado).
// Al conciliar un cobro de paquete, el abono se registra automáticamente en M5.

// Permisos del módulo "pagos": admin=Total, recepción=Cobrar, contador=Ver/conciliar
function canCobrar(role) { return ["Total", "Cobrar"].includes(PERM[role].pagos); }
function canConciliar(role) { return ["Total", "Cobrar", "Ver/conciliar"].includes(PERM[role].pagos); }

function PayConceptCell({ pay }) {
  const c = PAY_CONCEPTS[pay.concept.type] || PAY_CONCEPTS.libre;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <span className="pay-ico"><Icon name={c.icon} size={16} /></span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700 }}>{pay.concept.label || c.label}</div>
        <div className="muted" style={{ fontSize: 12 }}>{c.label} · <span className="tnum">{pay.txId}</span></div>
      </div>
    </div>
  );
}

// ---------- Construye el mensaje de WhatsApp con el link de pago ----------
function buildPayMsg({ patient, pay }) {
  return [
    `Hola ${patient.firstName}, le saluda ${EMISOR.nombreComercial}. 💳`,
    "",
    "Puede completar su pago de forma segura desde este enlace:",
    `• ${pay.concept.label || "Cobro"}`,
    `• Monto: ${H.fmtMoney(pay.amount)}`,
    "",
    `🔗 ${pay.payphoneLink}`,
    "",
    "Pago protegido vía Payphone. Una vez confirmado, su comprobante queda registrado automáticamente. ¡Gracias!",
  ].join("\n");
}

// ---------- Vista principal ----------
function PaymentsView() {
  const s = useStore();
  const me = SEL.currentUser(s);
  const role = me ? me.role : "admin";
  const list = [...s.payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const mes = new Date().getMonth(), anio = new Date().getFullYear();
  const cobradoMes = list.filter(p => p.status === "pagado" && p.paidAt && new Date(p.paidAt).getMonth() === mes && new Date(p.paidAt).getFullYear() === anio)
    .reduce((t, p) => t + p.amount, 0);
  const pendientes = list.filter(p => p.status === "pendiente");
  const porCobrar = pendientes.reduce((t, p) => t + p.amount, 0);

  return (
    <div className="content-inner">
      <PageHead title="Cobros" sub="Genera un link de pago Payphone, envíalo por WhatsApp o correo y concilia el pago cuando el paciente lo completa">
        {canCobrar(role) ? <Btn kind="primary" icon="link" onClick={() => A.open("generarCobro")}>Generar cobro</Btn> : null}
      </PageHead>

      <div className="kpi-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="card kpi">
          <div className="k-label"><Icon name="card" size={15} /> Cobrado este mes</div>
          <div className="k-value">{H.fmtMoney(cobradoMes)}</div>
          <div className="k-foot">vía Payphone, conciliado</div>
        </div>
        <div className="card kpi">
          <div className="k-label"><Icon name="clock" size={15} /> Pendiente de cobro</div>
          <div className="k-value">{H.fmtMoney(porCobrar)}</div>
          <div className="k-foot">{pendientes.length} link{pendientes.length === 1 ? "" : "s"} activo{pendientes.length === 1 ? "" : "s"}</div>
        </div>
        <div className="card kpi">
          <div className="k-label"><Icon name="check" size={15} /> Conciliados</div>
          <div className="k-value">{list.filter(p => p.status === "pagado").length}<span className="muted" style={{ fontSize: 18 }}> / {list.length}</span></div>
          <div className="k-foot">{list.filter(p => p.status === "anulado").length} anulado{list.filter(p => p.status === "anulado").length === 1 ? "" : "s"}</div>
        </div>
      </div>

      <div className="card">
        {list.length === 0 ? <EmptyState icon="card">Aún no se ha generado ningún cobro.</EmptyState> : (
          <table className="tbl">
            <thead>
              <tr><th>Concepto</th><th>Paciente</th><th className="num">Monto</th><th>Estado</th><th>Generado</th><th>Envío</th><th></th></tr>
            </thead>
            <tbody>
              {list.map(pay => {
                const p = SEL.patient(s, pay.patientId);
                const m = PAY_STATUS[pay.status];
                return (
                  <tr key={pay.id} className="rowlink" onClick={() => A.open("cobroDetalle", { paymentId: pay.id })}>
                    <td><PayConceptCell pay={pay} /></td>
                    <td>{H.fullName(p)}</td>
                    <td className="num tnum"><strong>{H.fmtMoney(pay.amount)}</strong></td>
                    <td><Badge cls={m.cls}>{m.label}</Badge></td>
                    <td className="tnum">{H.fmtDate(pay.createdAt)}</td>
                    <td>
                      {pay.sentVia
                        ? <span className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5 }}><Icon name={pay.sentVia === "email" ? "file" : "chat"} size={13} />{pay.sentVia === "email" ? "Email" : "WhatsApp"}</span>
                        : <span className="muted" style={{ fontSize: 12.5 }}>Sin enviar</span>}
                    </td>
                    <td><Icon name="chevR" size={14} className="muted" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="muted mt" style={{ fontSize: 13 }}>Flujo Payphone: <strong>Generar link</strong> → <strong>Enviar</strong> (WhatsApp/correo) → el paciente paga → <strong>Conciliar</strong> (estado «Pagado»). Los cobros de un paquete registran el abono automáticamente. Demo — la API de Payphone es simulada.</p>
    </div>
  );
}

// ---------- Modal: generar link de cobro ----------
function GenerarCobroModal({ props }) {
  const s = getState();
  const presetType = props.conceptType || "libre";
  const [patientId, setPatientId] = React.useState(props.patientId || "");
  const [conceptType, setConceptType] = React.useState(presetType);
  const [refId, setRefId] = React.useState(props.balanceId || props.invoiceId || "");
  const [amount, setAmount] = React.useState("");
  const [label, setLabel] = React.useState("");
  const lockConcept = !!props.balanceId || !!props.invoiceId;

  // Bonos del paciente con saldo pendiente / facturas del paciente
  const balances = patientId ? SEL.packageBalancesByPatient(s, patientId).filter(b => PKG.econBalance(b) > 0) : [];
  const invoices = patientId ? s.invoices.filter(f => f.patientId === patientId) : [];

  // Autocompleta monto + etiqueta según el concepto elegido
  React.useEffect(() => {
    if (conceptType === "paquete" && refId) {
      const b = s.packageBalances.find(x => x.id === refId);
      const pk = b ? SEL.package(s, b.packageId) : null;
      if (b) { setAmount(String(PKG.econBalance(b))); setLabel(`Saldo paquete · ${pk ? pk.name : ""}`); }
    } else if (conceptType === "factura" && refId) {
      const f = s.invoices.find(x => x.id === refId);
      if (f) { setAmount(String(f.total)); setLabel(`Factura ${f.number}`); }
    } else if (conceptType === "deposito") {
      setLabel(l => l && !/^Saldo paquete|^Factura/.test(l) ? l : "Depósito de reserva");
    }
  }, [conceptType, refId]);

  const upPatient = (e) => { setPatientId(e.target.value); if (!lockConcept) { setRefId(""); } };
  const upConcept = (e) => { setConceptType(e.target.value); setRefId(""); setAmount(""); setLabel(""); };

  const valid = patientId && Number(amount) > 0 && label.trim() &&
    (conceptType === "paquete" || conceptType === "factura" ? !!refId : true);

  const save = () => {
    const pay = A.createPayLink({ patientId, conceptType, refId: refId || null, label: label.trim(), amount });
    A.close();
    setTimeout(() => A.open("cobroDetalle", { paymentId: pay.id }), 60);
  };

  const pat = SEL.patient(s, patientId);

  return (
    <Modal title="Generar cobro · link Payphone" onClose={A.close} foot={
      <React.Fragment>
        <Btn onClick={A.close}>Cancelar</Btn>
        <Btn kind="primary" icon="link" disabled={!valid} onClick={save}>Generar link</Btn>
      </React.Fragment>
    }>
      <div className="frow">
        <Field label="Paciente">
          <select value={patientId} onChange={upPatient} disabled={!!props.patientId}>
            <option value="">Seleccionar…</option>
            {s.patients.map(p => <option key={p.id} value={p.id}>{H.fullName(p)} · CI {p.idNumber}</option>)}
          </select>
        </Field>
        <Field label="Tipo de cobro">
          <select value={conceptType} onChange={upConcept} disabled={lockConcept}>
            {Object.entries(PAY_CONCEPTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
      </div>

      {conceptType === "paquete" ? (
        <Field label="Paquete con saldo pendiente">
          <select value={refId} onChange={(e) => setRefId(e.target.value)} disabled={lockConcept}>
            <option value="">Seleccionar bono…</option>
            {balances.map(b => { const pk = SEL.package(s, b.packageId); return <option key={b.id} value={b.id}>{pk ? pk.name : "Paquete"} · saldo {H.fmtMoney(PKG.econBalance(b))}</option>; })}
          </select>
          {patientId && balances.length === 0 ? <p className="muted" style={{ fontSize: 12.5, margin: "6px 0 0" }}>Este paciente no tiene bonos con saldo pendiente.</p> : null}
        </Field>
      ) : null}

      {conceptType === "factura" ? (
        <Field label="Factura del paciente">
          <select value={refId} onChange={(e) => setRefId(e.target.value)}>
            <option value="">Seleccionar factura…</option>
            {invoices.map(f => <option key={f.id} value={f.id}>{f.number} · {H.fmtMoney(f.total)} · {INVOICE_STATUS[f.status].label}</option>)}
          </select>
          {patientId && invoices.length === 0 ? <p className="muted" style={{ fontSize: 12.5, margin: "6px 0 0" }}>Este paciente no tiene facturas emitidas.</p> : null}
        </Field>
      ) : null}

      <Field label="Concepto (aparece en el link y el mensaje)">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={conceptType === "deposito" ? "Depósito de reserva · Consulta" : "Descripción del cobro"} />
      </Field>
      <Field label="Monto a cobrar (USD)">
        <input type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
      </Field>

      <div className="warn-box" style={{ background: "var(--cream)", color: "var(--brown-800)", marginTop: 6 }}>
        <Icon name="card" size={17} />
        <div>
          <strong>Se generará un link de pago Payphone</strong>
          <div style={{ fontSize: 12.5, marginTop: 2 }}>
            {pat ? `Para ${H.fullName(pat)}. ` : ""}Podrás enviarlo por WhatsApp o correo y conciliarlo cuando el paciente complete el pago. Sirve para pagos parciales y depósitos de reserva.
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Modal: detalle del cobro (link, envío, conciliación) ----------
function CobroDetalleModal({ props }) {
  const s = useStore();
  const me = SEL.currentUser(s);
  const role = me ? me.role : "admin";
  const pay = s.payments.find(x => x.id === props.paymentId);
  const [copied, setCopied] = React.useState(false);
  const [sentNote, setSentNote] = React.useState("");
  if (!pay) return null;
  const p = SEL.patient(s, pay.patientId);
  const m = PAY_STATUS[pay.status];
  const c = PAY_CONCEPTS[pay.concept.type] || PAY_CONCEPTS.libre;
  const hasPhone = !!(p && p.phone);
  const isPaquete = pay.concept.type === "paquete";

  const copy = () => {
    try { navigator.clipboard.writeText(pay.payphoneLink); } catch (e) {}
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };
  const send = (via) => {
    A.markPaymentSent(pay.id, via);
    setSentNote(via === "email" ? "Link enviado por correo electrónico." : "Link enviado por WhatsApp.");
    setTimeout(() => setSentNote(""), 2600);
  };

  const foot = pay.status === "pendiente" ? (
    <React.Fragment>
      {canCobrar(role) ? <Btn kind="ghost" icon="trash" onClick={() => A.voidPayment(pay.id)}>Anular</Btn> : null}
      <div style={{ flex: 1 }}></div>
      {canConciliar(role) ? <Btn kind="primary" icon="check" onClick={() => A.markPaymentPaid(pay.id)}>Marcar como pagado</Btn> : null}
    </React.Fragment>
  ) : <Btn onClick={A.close}>Cerrar</Btn>;

  return (
    <Modal title={`Cobro · ${c.label}`} onClose={A.close} foot={foot}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
        <div style={{ minWidth: 0 }}>
          <div className="pay-amount">{H.fmtMoney(pay.amount)}</div>
          <div style={{ fontWeight: 700, marginTop: 2 }}>{pay.concept.label || c.label}</div>
          <div className="muted" style={{ fontSize: 13 }}>{H.fullName(p)}{p ? ` · CI ${p.idNumber}` : ""}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <Badge cls={m.cls}>{m.label}</Badge>
          <div className="pp-tag" style={{ marginTop: 8 }}><Icon name="card" size={12} /> Payphone</div>
        </div>
      </div>

      {pay.status === "pagado" ? (
        <div className="cita-ok" style={{ marginTop: 14 }}>
          <span className="cita-ok-icon"><Icon name="check" size={20} /></span>
          <div>
            <strong>Pago conciliado</strong>
            <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
              {pay.paidAt ? `${H.fmtDate(pay.paidAt)} · ${H.fmtTime(pay.paidAt)}` : ""}
              {isPaquete ? " · abono registrado en el paquete" : ""}
            </p>
          </div>
        </div>
      ) : pay.status === "anulado" ? (
        <div className="warn-box" style={{ marginTop: 14 }}>
          <Icon name="alert" size={16} />
          <div><strong>Link anulado</strong>{pay.note ? <div style={{ fontSize: 12.5, marginTop: 2 }}>{pay.note}</div> : null}</div>
        </div>
      ) : null}

      <div style={{ marginTop: 14 }}>
        <span className="pay-k">Link de pago</span>
        <div className="pay-linkbox">
          <Icon name="link" size={16} className="muted" />
          <code>{pay.payphoneLink}</code>
          <button className="pay-copy" onClick={copy} title="Copiar link"><Icon name={copied ? "check" : "copy"} size={14} />{copied ? "Copiado" : "Copiar"}</button>
        </div>
      </div>

      <div className="pay-detail-grid">
        <div><span className="pay-k">ID transacción</span><span className="tnum">{pay.txId}</span></div>
        <div><span className="pay-k">Generado</span>{H.fmtDate(pay.createdAt)} · {H.fmtTime(pay.createdAt)}</div>
        <div><span className="pay-k">Método</span>{(PAY_METHODS[pay.method] || {}).label || pay.method}</div>
        <div><span className="pay-k">Envío</span>{pay.sentVia === "email" ? "Correo electrónico" : pay.sentVia === "whatsapp" ? "WhatsApp" : "Sin enviar"}</div>
      </div>

      {pay.status === "pendiente" ? (
        <React.Fragment>
          <div className="wa-meta">
            <Icon name="chat" size={15} />
            <span>Enviar recordatorio de pago a&nbsp;</span>
            <strong className="tnum">{hasPhone ? p.phone : "—"}</strong>
          </div>
          <div className="wa-preview">
            <div className="wa-bubble">
              <pre className="wa-text">{buildPayMsg({ patient: p, pay })}</pre>
              <span className="wa-time">{H.fmtTime(new Date().toISOString())} ✓✓</span>
            </div>
          </div>
          {canCobrar(role) ? (
            <div style={{ display: "flex", gap: 10 }}>
              <Btn icon="send" disabled={!hasPhone} onClick={() => send("whatsapp")}>Enviar por WhatsApp</Btn>
              <Btn kind="ghost" icon="file" onClick={() => send("email")}>Enviar por correo</Btn>
            </div>
          ) : null}
          {sentNote ? <p style={{ color: "var(--ok)", fontSize: 13, margin: "10px 0 0", fontWeight: 700 }}>{sentNote}</p> : null}
        </React.Fragment>
      ) : null}
    </Modal>
  );
}

Object.assign(window, { PaymentsView, GenerarCobroModal, CobroDetalleModal, canCobrar, canConciliar });
