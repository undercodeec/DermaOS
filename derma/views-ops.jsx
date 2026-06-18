// DERMA-OS · Servicios, Procedimientos estéticos, Inventario
const CAT_LABEL = { consulta: "Consulta", tratamiento: "Tratamiento", procedimiento_estetico: "Procedimiento estético", estudio: "Estudio" };

function ServicesView() {
  const s = useStore();
  return (
    <div className="content-inner">
      <PageHead title="Servicios" sub="Catálogo de prestaciones · precios e IVA según LRTI (consultas médicas 0% · estética 15%)">
        <Btn kind="primary" icon="plus" onClick={() => A.open("servicio")}>Nuevo Servicio</Btn>
      </PageHead>
      <div className="card">
        <table className="tbl">
          <thead><tr><th>Servicio</th><th>Categoría</th><th>Duración</th><th className="num">Precio</th><th>IVA</th><th>Estado</th></tr></thead>
          <tbody>
            {s.services.map(x => (
              <tr key={x.id}>
                <td><strong>{x.name}</strong></td>
                <td><Badge cls={x.category === "procedimiento_estetico" ? "bg-brand" : "bg-neutral"}>{CAT_LABEL[x.category]}</Badge></td>
                <td className="tnum">{x.durationMin} min</td>
                <td className="num tnum">{H.fmtMoney(x.price)}</td>
                <td><Badge cls={x.vatRate === 15 ? "bg-warn" : "bg-ok"}>{x.vatRate === 15 ? "15%" : "0%"}</Badge></td>
                <td>
                  <button className={`badge ${x.active ? "bg-ok" : "bg-neutral"}`} style={{ cursor: "pointer", border: "none" }}
                    title="Activar / desactivar" onClick={() => A.toggleService(x.id)}>
                    {x.active ? "Activo" : "Inactivo"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted mt" style={{ fontSize: 13 }}>Las consultas y tratamientos médicos facturan IVA 0% (servicios de salud). Los procedimientos estéticos facturan IVA 15%.</p>
    </div>
  );
}

function ServicioModal() {
  const [f, setF] = React.useState({ name: "", category: "consulta", durationMin: 30, price: "", vatRate: 0 });
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name && Number(f.price) > 0;
  const save = () => {
    const auto15 = f.category === "procedimiento_estetico";
    A.addService({
      name: f.name, category: f.category, durationMin: Number(f.durationMin) || 30,
      price: Number(f.price), vatRate: auto15 ? 15 : Number(f.vatRate), active: true,
    });
    A.close();
  };
  return (
    <Modal title="Nuevo servicio" onClose={A.close} foot={
      <React.Fragment>
        <Btn onClick={A.close}>Cancelar</Btn>
        <Btn kind="primary" icon="check" disabled={!valid} onClick={save}>Crear servicio</Btn>
      </React.Fragment>
    }>
      <Field label="Nombre"><input value={f.name} onChange={upd("name")} placeholder="Peeling despigmentante…" /></Field>
      <div className="frow">
        <Field label="Categoría">
          <select value={f.category} onChange={upd("category")}>
            {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Duración (min)"><input type="number" value={f.durationMin} onChange={upd("durationMin")} min="10" step="5" /></Field>
      </div>
      <div className="frow">
        <Field label="Precio (USD)"><input type="number" value={f.price} onChange={upd("price")} min="0" step="5" /></Field>
        <Field label="IVA">
          <select value={f.category === "procedimiento_estetico" ? 15 : f.vatRate} onChange={upd("vatRate")} disabled={f.category === "procedimiento_estetico"}>
            <option value="0">0% · servicio de salud</option>
            <option value="15">15% · estético</option>
          </select>
        </Field>
      </div>
      {f.category === "procedimiento_estetico" ? <p className="muted" style={{ fontSize: 12.5 }}>Los procedimientos estéticos siempre facturan IVA 15%.</p> : null}
    </Modal>
  );
}

// ---------- Procedimientos estéticos ----------
function ProcCard({ pr, s }) {
  const sv = SEL.service(s, pr.serviceId);
  const prof = SEL.professional(s, pr.professionalId);
  const consent = pr.consentId ? s.consents.find(c => c.id === pr.consentId) : null;
  const signed = consent && consent.status === "firmado";
  const pat = SEL.patient(s, pr.patientId);
  return (
    <div className="card card-pad">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
        <div>
          <strong style={{ fontSize: 15.5 }}>{sv ? sv.name : "Procedimiento"}</strong>
          <span className="muted"> · {H.fullName(pat)}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="muted tnum" style={{ fontSize: 13 }}>{H.fmtDate(pr.date)} {H.fmtTime(pr.date)}</span>
          {signed ? <Badge cls="bg-ok"><Icon name="check" size={12} /> Consentimiento firmado</Badge>
            : <Badge cls="bg-err"><Icon name="alert" size={12} /> Sin consentimiento</Badge>}
        </div>
      </div>
      <div className="grid-2" style={{ fontSize: 14 }}>
        <div>
          {pr.productUsed ? <div className="soap-row"><span className="soap-k">Producto</span><span>{pr.productUsed}</span></div> : null}
          {pr.units ? <div className="soap-row"><span className="soap-k">Unidades</span><span>{pr.units} U</span></div> : null}
          {pr.lotNumber ? <div className="soap-row"><span className="soap-k">Lote / venc.</span><span className="tnum">{pr.lotNumber} · {pr.expiry || "—"}</span></div> : null}
        </div>
        <div>
          {pr.injectionAreas && pr.injectionAreas.length ? <div className="soap-row"><span className="soap-k">Zonas</span><span><span className="chips">{pr.injectionAreas.map(z => <Badge key={z} cls="bg-brand">{z}</Badge>)}</span></span></div> : null}
          <div className="soap-row"><span className="soap-k">Profesional</span><span>{prof ? prof.name : "—"}</span></div>
        </div>
      </div>
      {pr.notes ? <p style={{ fontSize: 13.5, color: signed ? "var(--ink-2)" : "var(--err)", margin: "8px 0 0" }}>{pr.notes}</p> : null}
    </div>
  );
}

function ProceduresView() {
  const s = useStore();
  const list = [...s.procedures].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="content-inner">
      <PageHead title="Procedimientos estéticos" sub="Registro con producto, lote, zonas y consentimiento obligatorio">
        <Btn kind="primary" icon="plus" onClick={() => A.open("procedimiento")}>Registrar Procedimiento</Btn>
      </PageHead>
      {list.length === 0 ? <div className="card"><EmptyState icon="syringe">Sin procedimientos registrados.</EmptyState></div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {list.map(pr => <ProcCard key={pr.id} pr={pr} s={s} />)}
        </div>
      )}
    </div>
  );
}

function ProcedimientoModal() {
  const s = useStore();
  const [f, setF] = React.useState({ patientId: "", serviceId: "", professionalId: "pr1", productUsed: "", units: "", lotNumber: "", expiry: "", zonas: "", notes: "" });
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const estServices = s.services.filter(x => x.category === "procedimiento_estetico" && x.active);
  const signedConsents = f.patientId ? SEL.signedConsentsByPatient(s, f.patientId) : [];
  const [consentId, setConsentId] = React.useState("");
  const valid = f.patientId && f.serviceId && consentId;

  const save = () => {
    A.addProcedure({
      patientId: f.patientId, serviceId: f.serviceId, professionalId: f.professionalId,
      date: new Date().toISOString(), productUsed: f.productUsed, units: f.units ? Number(f.units) : undefined,
      lotNumber: f.lotNumber || undefined, expiry: f.expiry || undefined,
      injectionAreas: f.zonas ? f.zonas.split(",").map(x => x.trim()).filter(Boolean) : [],
      consentId, photoIds: [], notes: f.notes,
    });
    A.close();
    H.nav("/procedures");
  };

  return (
    <Modal title="Registrar procedimiento estético" wide onClose={A.close} foot={
      <React.Fragment>
        <Btn onClick={A.close}>Cancelar</Btn>
        <Btn kind="primary" icon="check" disabled={!valid} onClick={save}>Registrar</Btn>
      </React.Fragment>
    }>
      <div className="frow3">
        <Field label="Paciente">
          <select value={f.patientId} onChange={(e) => { setConsentId(""); setF({ ...f, patientId: e.target.value }); }}>
            <option value="">Seleccionar…</option>
            {s.patients.map(p => <option key={p.id} value={p.id}>{H.fullName(p)}</option>)}
          </select>
        </Field>
        <Field label="Procedimiento">
          <select value={f.serviceId} onChange={upd("serviceId")}>
            <option value="">Seleccionar…</option>
            {estServices.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </Field>
        <Field label="Profesional">
          <select value={f.professionalId} onChange={upd("professionalId")}>
            {s.professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </div>

      {f.patientId ? (
        signedConsents.length === 0 ? (
          <div className="warn-box" style={{ background: "var(--err-bg)", color: "var(--err)", marginBottom: 14 }}>
            <Icon name="alert" size={17} />
            <div>
              <strong>Bloqueado:</strong> este paciente no tiene consentimientos firmados. Genera y captura la firma antes de registrar el procedimiento.
              <div><button className="btn btn-ghost btn-sm" style={{ color: "var(--err)", padding: "4px 0" }} onClick={() => { A.close(); H.nav(`/patients/${f.patientId}/consentimientos`); }}>Ir a consentimientos →</button></div>
            </div>
          </div>
        ) : (
          <Field label="Consentimiento firmado (obligatorio)">
            <select value={consentId} onChange={(e) => setConsentId(e.target.value)}>
              <option value="">Seleccionar consentimiento…</option>
              {signedConsents.map(c => {
                const t = s.consentTemplates.find(x => x.id === c.templateId);
                return <option key={c.id} value={c.id}>{t ? t.title : c.id} · firmado {H.fmtDate(c.signedAt)}</option>;
              })}
            </select>
          </Field>
        )
      ) : null}

      <div className="frow">
        <Field label="Producto utilizado"><input value={f.productUsed} onChange={upd("productUsed")} placeholder="Toxina botulínica tipo A…" /></Field>
        <Field label="Unidades / volumen"><input value={f.units} onChange={upd("units")} placeholder="24" type="number" /></Field>
      </div>
      <div className="frow">
        <Field label="Lote"><input value={f.lotNumber} onChange={upd("lotNumber")} placeholder="B7231-EC" /></Field>
        <Field label="Vencimiento"><input type="date" value={f.expiry} onChange={upd("expiry")} /></Field>
      </div>
      <Field label="Zonas de aplicación (separadas por coma)"><input value={f.zonas} onChange={upd("zonas")} placeholder="Frente, entrecejo, patas de gallo" /></Field>
      <Field label="Notas clínicas"><textarea value={f.notes} onChange={upd("notes")} rows="2" placeholder="Dilución, técnica, complicaciones…"></textarea></Field>
    </Modal>
  );
}

// ---------- Inventario ----------
const INV_TYPE = { vial: "Vial / inyectable", principio_activo: "Principio activo", insumo: "Insumo", farmaco: "Fármaco" };

function InventoryView() {
  const s = useStore();
  const low = SEL.lowStock(s);
  return (
    <div className="content-inner">
      <PageHead title="Inventario" sub="Materias primas para fórmulas magistrales, viales e insumos">
        {low.length ? <Badge cls="bg-err"><Icon name="alert" size={13} /> {low.length} ítems bajo mínimo</Badge> : <Badge cls="bg-ok"><Icon name="check" size={13} /> Stock saludable</Badge>}
      </PageHead>
      <div className="card">
        <table className="tbl">
          <thead><tr><th>Ítem</th><th>Tipo</th><th>Lote · Venc.</th><th>Stock</th><th></th><th style={{ width: 130 }}>Ajustar</th></tr></thead>
          <tbody>
            {s.inventory.map(i => {
              const isLow = i.stock <= i.minStock;
              const pct = Math.min(100, (i.stock / (i.minStock * 3)) * 100);
              const expSoon = i.expiryDate && (new Date(i.expiryDate) - new Date()) < 180 * 864e5;
              return (
                <tr key={i.id}>
                  <td><strong>{i.name}</strong></td>
                  <td><Badge cls="bg-neutral">{INV_TYPE[i.type]}</Badge></td>
                  <td className="tnum" style={{ fontSize: 13 }}>
                    {i.lotNumber || "—"}{i.expiryDate ? <span className={expSoon ? "" : "muted"} style={expSoon ? { color: "var(--warn)", fontWeight: 700 } : {}}> · {i.expiryDate}</span> : null}
                  </td>
                  <td className="tnum"><strong>{i.stock}</strong> <span className="muted">{i.unit} (mín {i.minStock})</span></td>
                  <td>
                    <div className="stock-bar"><i style={{ width: pct + "%", background: isLow ? "var(--err)" : pct < 55 ? "var(--warn)" : "var(--ok)" }}></i></div>
                    {isLow ? <span style={{ color: "var(--err)", fontSize: 12, fontWeight: 700 }}>Reponer</span> : null}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn sm onClick={() => A.adjustStock(i.id, -1)}>−</Btn>
                      <Btn sm onClick={() => A.adjustStock(i.id, +1)}>+</Btn>
                      <Btn sm onClick={() => A.adjustStock(i.id, +10)}>+10</Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, { ServicesView, ServicioModal, ProceduresView, ProcedimientoModal, ProcCard, InventoryView, CAT_LABEL });
