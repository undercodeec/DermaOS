// DERMA-OS · Facturación electrónica SRI: listado, nueva factura, RIDE
function InvoiceTable({ list, s, hidePatient }) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Nº Factura</th>
          {!hidePatient ? <th>Cliente</th> : null}
          <th>Fecha</th><th className="num">Subt. 0%</th><th className="num">Subt. 15%</th><th className="num">IVA</th><th className="num">Total</th><th>Estado SRI</th><th></th>
        </tr>
      </thead>
      <tbody>
        {list.map(f => {
          const p = SEL.patient(s, f.patientId);
          const m = INVOICE_STATUS[f.status];
          return (
            <tr key={f.id} className="rowlink" onClick={() => A.open("ride", { invoiceId: f.id })}>
              <td className="tnum" style={{ fontWeight: 700 }}>{f.number}</td>
              {!hidePatient ? <td>{f.customerName || H.fullName(p)}</td> : null}
              <td className="tnum">{H.fmtDate(f.date)}</td>
              <td className="num tnum">{H.fmtMoney(f.subtotal0)}</td>
              <td className="num tnum">{H.fmtMoney(f.subtotal15)}</td>
              <td className="num tnum">{H.fmtMoney(f.vatAmount)}</td>
              <td className="num tnum"><strong>{H.fmtMoney(f.total)}</strong></td>
              <td><Badge cls={m.cls}>{m.label}</Badge></td>
              <td><Icon name="chevR" size={14} className="muted" /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function BillingView() {
  const s = useStore();
  const list = [...s.invoices].sort((a, b) => b.date.localeCompare(a.date));
  const mes = new Date().getMonth();
  const facMes = list.filter(f => new Date(f.date).getMonth() === mes);
  const totMes = facMes.reduce((t, f) => t + f.total, 0);
  const ivaMes = facMes.reduce((t, f) => t + f.vatAmount, 0);

  return (
    <div className="content-inner">
      <PageHead title="Facturación" sub={`Emisor: ${EMISOR.razonSocial} · RUC ${EMISOR.ruc} · Estab. 001 · Pto. emisión 001`}>
        <Btn kind="primary" icon="plus" onClick={() => A.open("factura")}>Nueva Factura</Btn>
      </PageHead>

      <div className="kpi-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="card kpi">
          <div className="k-label"><Icon name="receipt" size={15} /> Facturado este mes</div>
          <div className="k-value">{H.fmtMoney(totMes)}</div>
          <div className="k-foot">{facMes.length} comprobantes</div>
        </div>
        <div className="card kpi">
          <div className="k-label"><Icon name="file" size={15} /> IVA causado</div>
          <div className="k-value">{H.fmtMoney(ivaMes)}</div>
          <div className="k-foot">declaración mensual SRI</div>
        </div>
        <div className="card kpi">
          <div className="k-label"><Icon name="check" size={15} /> Autorizadas</div>
          <div className="k-value">{list.filter(f => f.status === "autorizada").length}<span className="muted" style={{ fontSize: 18 }}> / {list.length}</span></div>
          <div className="k-foot">{list.filter(f => f.status !== "autorizada").length} en proceso</div>
        </div>
      </div>

      <div className="card">
        {list.length === 0 ? <EmptyState icon="receipt">Sin facturas emitidas.</EmptyState> : <InvoiceTable list={list} s={s} />}
      </div>
      <p className="muted mt" style={{ fontSize: 13 }}>Flujo SRI: <strong>Generada</strong> (XML construido) → <strong>Firmada</strong> (firma electrónica .p12) → <strong>Autorizada</strong> (recibida por el SRI). Clic en una factura para ver su RIDE.</p>
    </div>
  );
}

// ---------- Modal: nueva factura ----------
function FacturaModal() {
  const s = useStore();
  const [patientId, setPatientId] = React.useState("");
  const [lines, setLines] = React.useState([]);
  const [svcPick, setSvcPick] = React.useState("");

  const addLine = (serviceId) => {
    const sv = SEL.service(s, serviceId);
    if (!sv) return;
    setLines([...lines, { serviceId, description: sv.name, quantity: 1, unitPrice: sv.price, vatRate: sv.vatRate }]);
    setSvcPick("");
  };
  const updLine = (i, patch) => setLines(lines.map((l, k) => k === i ? { ...l, ...patch } : l));
  const t = H.calcTotals(lines);
  const valid = patientId && lines.length > 0;

  const save = () => {
    const inv = A.createInvoice(patientId, lines);
    A.close();
    setTimeout(() => A.open("ride", { invoiceId: inv.id }), 60);
  };

  return (
    <Modal title="Nueva factura electrónica" wide onClose={A.close} foot={
      <React.Fragment>
        <Btn onClick={A.close}>Cancelar</Btn>
        <Btn kind="primary" icon="check" disabled={!valid} onClick={save}>Generar factura</Btn>
      </React.Fragment>
    }>
      <div className="frow">
        <Field label="Cliente (paciente)">
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="">Seleccionar…</option>
            {s.patients.map(p => <option key={p.id} value={p.id}>{H.fullName(p)} · CI {p.idNumber}</option>)}
          </select>
        </Field>
        <Field label="Agregar servicio">
          <select value={svcPick} onChange={(e) => addLine(e.target.value)}>
            <option value="">Seleccionar servicio…</option>
            {s.services.filter(x => x.active).map(x => <option key={x.id} value={x.id}>{x.name} · {H.fmtMoney(x.price)} · IVA {x.vatRate}%</option>)}
          </select>
        </Field>
      </div>

      {lines.length > 0 ? (
        <table className="tbl" style={{ marginBottom: 12 }}>
          <thead><tr><th>Detalle</th><th style={{ width: 70 }}>Cant.</th><th style={{ width: 100 }} className="num">P. unit.</th><th style={{ width: 64 }}>IVA</th><th className="num" style={{ width: 90 }}>Subtotal</th><th style={{ width: 40 }}></th></tr></thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td>{l.description}</td>
                <td><input type="number" min="1" value={l.quantity} onChange={(e) => updLine(i, { quantity: Math.max(1, Number(e.target.value)) })} style={{ width: 56, border: "1px solid var(--border-strong)", borderRadius: 6, padding: "4px 6px" }} /></td>
                <td className="num tnum">{H.fmtMoney(l.unitPrice)}</td>
                <td><Badge cls={l.vatRate === 15 ? "bg-warn" : "bg-ok"}>{l.vatRate}%</Badge></td>
                <td className="num tnum">{H.fmtMoney(l.quantity * l.unitPrice)}</td>
                <td><button className="mclose" onClick={() => setLines(lines.filter((_, k) => k !== i))}><Icon name="x" size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="muted" style={{ fontSize: 13.5 }}>Agrega al menos un servicio.</p>}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <table style={{ fontSize: 14, borderCollapse: "collapse" }}>
          <tbody>
            <tr><td className="muted" style={{ padding: "3px 18px 3px 0" }}>Subtotal 0%</td><td className="num tnum">{H.fmtMoney(t.subtotal0)}</td></tr>
            <tr><td className="muted" style={{ padding: "3px 18px 3px 0" }}>Subtotal 15%</td><td className="num tnum">{H.fmtMoney(t.subtotal15)}</td></tr>
            <tr><td className="muted" style={{ padding: "3px 18px 3px 0" }}>IVA 15%</td><td className="num tnum">{H.fmtMoney(t.vatAmount)}</td></tr>
            <tr><td style={{ padding: "6px 18px 3px 0", fontWeight: 700 }}>TOTAL</td><td className="num tnum" style={{ fontWeight: 700, fontSize: 17 }}>{H.fmtMoney(t.total)}</td></tr>
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

// ---------- Modal: RIDE ----------
function RideModal({ props }) {
  const s = useStore();
  const f = s.invoices.find(x => x.id === props.invoiceId);
  if (!f) return null;
  const p = SEL.patient(s, f.patientId);
  const m = INVOICE_STATUS[f.status];
  const nextLabel = f.status === "generada" ? "Firmar (simulado)" : f.status === "firmada" ? "Enviar al SRI (simulado)" : null;

  return (
    <Modal title={`RIDE · Factura ${f.number}`} wide onClose={A.close} foot={
      <React.Fragment>
        <Btn icon="printer" onClick={() => window.print()}>Imprimir</Btn>
        {nextLabel ? <Btn kind="primary" icon="check" onClick={() => A.advanceInvoice(f.id)}>{nextLabel}</Btn> : null}
      </React.Fragment>
    }>
      <div className="ride">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Badge cls={m.cls}>{m.label.toUpperCase()}</Badge>
          {f.status === "autorizada" ? <span className="muted">Ambiente: PRODUCCIÓN · Emisión: NORMAL</span> : <span className="muted">Documento sin valor tributario hasta su autorización</span>}
        </div>
        <div className="ride-grid">
          <div className="ride-box">
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
              <img src="derma/logo.jpg" style={{ width: 40, height: 40, borderRadius: 8 }} alt="logo" />
              <strong style={{ fontSize: 14 }}>{EMISOR.nombreComercial}</strong>
            </div>
            <div>{EMISOR.razonSocial}</div>
            <div className="muted">{EMISOR.direccion}</div>
            <div className="muted">{EMISOR.contribuyente}</div>
          </div>
          <div className="ride-box">
            <h4>R.U.C.: <span className="tnum">{EMISOR.ruc}</span></h4>
            <div style={{ fontSize: 15, fontWeight: 700, margin: "2px 0" }}>FACTURA Nº <span className="tnum">{f.number}</span></div>
            <div className="muted" style={{ marginBottom: 6 }}>Fecha de emisión: {H.fmtDate(f.date)}</div>
            <h4>Clave de acceso</h4>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Icon name="qr" size={34} style={{ flexShrink: 0, color: "var(--ink-2)" }} />
              <span className="accesskey">{f.accessKey}</span>
            </div>
          </div>
        </div>

        <div className="ride-box" style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
            <span><strong>Razón social:</strong> {f.customerName || H.fullName(p)}</span>
            <span><strong>Identificación:</strong> <span className="tnum">{p ? p.idNumber : "—"}</span></span>
          </div>
        </div>

        <table>
          <thead><tr><th>Cant.</th><th>Descripción</th><th className="num">P. unitario</th><th className="num">IVA</th><th className="num">Subtotal</th></tr></thead>
          <tbody>
            {f.lines.map((l, i) => (
              <tr key={i}>
                <td className="num tnum">{l.quantity}</td>
                <td>{l.description}</td>
                <td className="num tnum">{H.fmtMoney(l.unitPrice)}</td>
                <td className="num tnum">{l.vatRate}%</td>
                <td className="num tnum">{H.fmtMoney(l.quantity * l.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <table style={{ width: 280 }}>
            <tbody>
              <tr><td>SUBTOTAL 15%</td><td className="num tnum">{H.fmtMoney(f.subtotal15)}</td></tr>
              <tr><td>SUBTOTAL 0%</td><td className="num tnum">{H.fmtMoney(f.subtotal0)}</td></tr>
              <tr><td>IVA 15%</td><td className="num tnum">{H.fmtMoney(f.vatAmount)}</td></tr>
              <tr><td><strong>VALOR TOTAL</strong></td><td className="num tnum"><strong>{H.fmtMoney(f.total)}</strong></td></tr>
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: 11.5 }}>RIDE: Representación Impresa del Documento Electrónico. El XML firmado es el comprobante con validez tributaria. Demo — la firma .p12 y la recepción SRI son simuladas.</p>
      </div>
    </Modal>
  );
}

Object.assign(window, { BillingView, FacturaModal, RideModal, InvoiceTable });
