import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/Modal";
import { Btn, EmptyState } from "@/components/Primitives";
import { api } from "@/lib/api";
import { age, fullName } from "@/lib/helpers";
import type {
  ClinicalFile,
  ClinicalFileOptions,
  ClinicalFilePhoto,
  Patient,
  Professional,
  RxItem,
} from "@/lib/types";
import { getClinicalFile, listProfessionals } from "./api";

const defaultOptions: ClinicalFileOptions = {
  includeEvolutions: true,
  includePrescriptions: true,
  includeProcedures: true,
  includeConsents: true,
  includePhotos: false,
};

const dateTime = (value: string | null | undefined) => value
  ? new Intl.DateTimeFormat("es-EC", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";

const textList = (values: string[] | undefined, empty = "Sin registro") =>
  values?.length ? values.join(" · ") : empty;

function ClinicalPhoto({ photo }: { photo: ClinicalFilePhoto }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let active = true;
    api.raw(photo.fileUrl)
      .then((response) => response.blob())
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => setSrc(null));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photo.fileUrl]);

  return (
    <figure className="clinical-file-photo">
      {src ? <img src={src} alt={`${photo.bodyArea}: ${photo.lesionTag}`} /> : <div className="clinical-file-photo-placeholder">Imagen protegida no disponible</div>}
      <figcaption>
        <strong>{photo.bodyArea}</strong> · {photo.lesionTag} · {dateTime(photo.takenAt)}
        {photo.caption ? <span>{photo.caption}</span> : null}
      </figcaption>
    </figure>
  );
}

function ClinicalFileDocument({ file }: { file: ClinicalFile }) {
  const b = file.patient.background;
  return (
    <article className="clinical-file-print-root">
      <header className="clinical-file-header">
        {file.clinic.logoData ? <img src={file.clinic.logoData} alt="Logo de la clínica" /> : null}
        <div>
          <p className="clinical-file-kicker">Ficha clínica</p>
          <h1>{file.clinic.name}</h1>
          <p>{file.clinic.ruc ? `RUC ${file.clinic.ruc}` : ""}</p>
        </div>
        <div className="clinical-file-generated">
          Emitida {dateTime(file.generatedAt)}
          {file.period.from || file.period.to ? (
            <span>Periodo: {file.period.from ?? "inicio"} a {file.period.to ?? "hoy"}</span>
          ) : null}
        </div>
      </header>

      <section className="clinical-file-patient">
        <h2>{fullName(file.patient)}</h2>
        <div className="clinical-file-facts">
          <span><b>{file.patient.id_type.toUpperCase()}</b> {file.patient.id_number}</span>
          <span><b>Edad</b> {age(file.patient.birth_date)} años</span>
          <span><b>Sexo</b> {file.patient.sex}</span>
          <span><b>Teléfono</b> {file.patient.phone ?? "—"}</span>
          <span><b>Email</b> {file.patient.email ?? "—"}</span>
          <span><b>Ciudad</b> {file.patient.city ?? "—"}</span>
        </div>
      </section>

      <section className="clinical-file-section">
        <h3>Antecedentes clínicos</h3>
        <div className="clinical-file-background">
          <p><b>Fototipo:</b> Fitzpatrick {b.skinType}</p>
          <p><b>Fotoprotección:</b> {b.usesSunscreen ? `Sí, SPF ${b.sunscreenSpf ?? "no registrado"}` : "No"}</p>
          <p><b>Alergias:</b> {textList(b.allergies, "Ninguna conocida")}</p>
          <p><b>Condiciones crónicas:</b> {textList(b.chronicConditions)}</p>
          <p><b>Medicación actual:</b> {textList(b.currentMedications)}</p>
          <p><b>Antecedentes familiares:</b> {textList(b.familyHistory)}</p>
          <p><b>Antecedentes dermatológicos:</b> {textList(b.dermatologicalHistory)}</p>
          <p><b>Tabaquismo:</b> {b.smoker ? "Sí" : "No"}</p>
          {b.notes ? <p><b>Notas:</b> {b.notes}</p> : null}
        </div>
      </section>

      {file.included.evolutions ? (
        <section className="clinical-file-section">
          <h3>Evoluciones SOAP <small>{file.evolutions.length}</small></h3>
          {file.evolutions.length ? file.evolutions.map((record) => (
            <div className="clinical-file-entry" key={record.id}>
              <div className="clinical-file-entry-head"><b>{dateTime(record.date)}</b><span>{record.professional?.name ?? "Profesional no registrado"}</span></div>
              <p><b>S:</b> {record.subjective || "—"}</p>
              <p><b>O:</b> {record.objective || "—"}</p>
              <p><b>A:</b> {record.assessment || "—"}</p>
              <p><b>P:</b> {record.plan || "—"}</p>
              {record.cie10Codes.length ? <p><b>CIE-10:</b> {record.cie10Codes.join(", ")}</p> : null}
            </div>
          )) : <p className="clinical-file-empty">Sin evoluciones en el periodo.</p>}
        </section>
      ) : null}

      {file.included.prescriptions ? (
        <section className="clinical-file-section">
          <h3>Recetas <small>{file.prescriptions.length}</small></h3>
          {file.prescriptions.length ? file.prescriptions.map((record) => {
            const items = (record.prescription?.items ?? []) as RxItem[];
            return (
              <div className="clinical-file-entry" key={record.id}>
                <div className="clinical-file-entry-head"><b>{dateTime(record.date)}</b><span>{record.professional?.name ?? "Profesional no registrado"}</span></div>
                {items.length ? items.map((item, index) => (
                  <p key={`${record.id}-${index}`}>
                    <b>{item.ingredients.map((ingredient) => `${ingredient.name} ${ingredient.concentration}`).join(" + ")}</b>
                    {item.vehicle ? ` · ${item.vehicle}` : ""}{item.quantity ? ` · ${item.quantity}` : ""}<br />
                    {item.instructions}
                  </p>
                )) : <p>Sin detalle estructurado.</p>}
              </div>
            );
          }) : <p className="clinical-file-empty">Sin recetas en el periodo.</p>}
        </section>
      ) : null}

      {file.included.procedures ? (
        <section className="clinical-file-section">
          <h3>Procedimientos <small>{file.procedures.length}</small></h3>
          {file.procedures.length ? file.procedures.map((procedure) => (
            <div className="clinical-file-entry" key={procedure.id}>
              <div className="clinical-file-entry-head"><b>{procedure.service?.name ?? "Procedimiento"}</b><span>{dateTime(procedure.date)}</span></div>
              <p>Profesional: {procedure.professional?.name ?? "—"}</p>
              {procedure.productUsed ? <p>Producto: {procedure.productUsed}{procedure.units ? ` · ${procedure.units} unidades` : ""}</p> : null}
              {procedure.lotNumber ? <p>Lote: {procedure.lotNumber}</p> : null}
              {procedure.injectionAreas.length ? <p>Áreas: {procedure.injectionAreas.join(", ")}</p> : null}
              {procedure.notes ? <p>Notas: {procedure.notes}</p> : null}
            </div>
          )) : <p className="clinical-file-empty">Sin procedimientos en el periodo.</p>}
        </section>
      ) : null}

      {file.included.consents ? (
        <section className="clinical-file-section">
          <h3>Consentimientos <small>{file.consents.length}</small></h3>
          {file.consents.length ? (
            <table className="clinical-file-table">
              <thead><tr><th>Documento</th><th>Estado</th><th>Firma</th><th>Revocación</th></tr></thead>
              <tbody>{file.consents.map((consent) => (
                <tr key={consent.id}>
                  <td>{consent.templateTitle ?? "Consentimiento"}{consent.templateVersion ? ` v${consent.templateVersion}` : ""}</td>
                  <td>{consent.status}</td>
                  <td>{dateTime(consent.signedAt)}</td>
                  <td>{consent.revokedAt ? `${dateTime(consent.revokedAt)}${consent.revocationReason ? ` · ${consent.revocationReason}` : ""}` : "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p className="clinical-file-empty">Sin consentimientos en el periodo.</p>}
        </section>
      ) : null}

      {file.included.photos ? (
        <section className="clinical-file-section clinical-file-photo-section">
          <h3>Fotografías clínicas <small>{file.photos.length}</small></h3>
          {file.photos.length ? <div className="clinical-file-photo-grid">{file.photos.map((photo) => <ClinicalPhoto key={photo.id} photo={photo} />)}</div> : <p className="clinical-file-empty">Sin fotografías en el periodo.</p>}
        </section>
      ) : null}

      <footer className="clinical-file-signature">
        {file.signer ? (
          <div><span className="clinical-file-sign-line" /><b>{file.signer.name}</b><span>{file.signer.specialty}</span><span>Registro profesional: {file.signer.registrationNo}</span></div>
        ) : <p>Documento generado sin profesional firmante seleccionado.</p>}
        <p>Documento confidencial. Generado por DERMA-OS el {dateTime(file.generatedAt)}.</p>
      </footer>
    </article>
  );
}

export function ClinicalFileModal({ patient, role, onClose }: { patient: Patient; role: string; onClose: () => void }) {
  const [draft, setDraft] = useState<ClinicalFileOptions>(defaultOptions);
  const [options, setOptions] = useState<ClinicalFileOptions>(defaultOptions);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const professionals = useQuery({ queryKey: ["professionals"], queryFn: listProfessionals });
  const file = useQuery({
    queryKey: ["clinical-file", patient.id, options],
    queryFn: () => getClinicalFile(patient.id, options),
  });

  const changeFlag = (key: keyof ClinicalFileOptions) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraft((current) => ({ ...current, [key]: event.target.checked }));
  };

  const print = async () => {
    setPrinting(true);
    setPrintError(null);
    try {
      await getClinicalFile(patient.id, { ...options, purpose: "print" });
      window.print();
    } catch (error) {
      setPrintError(error instanceof Error ? error.message : "No se pudo preparar la impresión");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Modal
      title={`Ficha clínica · ${fullName(patient)}`}
      extraWide
      onClose={onClose}
      foot={<><Btn onClick={onClose}>Cerrar</Btn><Btn kind="primary" icon="file" disabled={!file.data || printing} onClick={print}>{printing ? "Preparando..." : "Imprimir / PDF"}</Btn></>}
    >
      <div className="clinical-file-filters">
        <label>Desde<input type="date" value={draft.from ?? ""} onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value || undefined }))} /></label>
        <label>Hasta<input type="date" value={draft.to ?? ""} onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value || undefined }))} /></label>
        {role === "admin" ? (
          <label>Profesional firmante<select value={draft.signerProfessionalId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, signerProfessionalId: event.target.value || undefined }))}>
            <option value="">Sin firmante</option>
            {(professionals.data ?? []).map((professional: Professional) => <option key={professional.id} value={professional.id}>{professional.name}</option>)}
          </select></label>
        ) : null}
        <div className="clinical-file-checks">
          <label><input type="checkbox" checked={draft.includeEvolutions} onChange={changeFlag("includeEvolutions")} /> Evoluciones</label>
          <label><input type="checkbox" checked={draft.includePrescriptions} onChange={changeFlag("includePrescriptions")} /> Recetas</label>
          <label><input type="checkbox" checked={draft.includeProcedures} onChange={changeFlag("includeProcedures")} /> Procedimientos</label>
          <label><input type="checkbox" checked={draft.includeConsents} onChange={changeFlag("includeConsents")} /> Consentimientos</label>
          <label><input type="checkbox" checked={draft.includePhotos} onChange={changeFlag("includePhotos")} /> Fotos clínicas</label>
        </div>
        <Btn sm icon="search" onClick={() => setOptions({ ...draft, purpose: "preview" })}>Actualizar vista</Btn>
      </div>

      {file.isLoading || file.isFetching ? <EmptyState icon="file">Preparando ficha clínica...</EmptyState> : null}
      {file.error ? <div className="alert-box err">{file.error instanceof Error ? file.error.message : "No se pudo generar la ficha clínica"}</div> : null}
      {printError ? <div className="alert-box err">{printError}</div> : null}
      {file.data && !file.isFetching ? <ClinicalFileDocument file={file.data} /> : null}
    </Modal>
  );
}
