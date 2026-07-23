import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/Modal";
import { Btn, EmptyState } from "@/components/Primitives";
import { age } from "@/lib/helpers";
import type { ClinicalRecord, Patient, PrescriptionDocument, RxItem } from "@/lib/types";
import { getPrescriptionDocument } from "../api";

const dateOnly = (value: string) =>
  new Intl.DateTimeFormat("es-EC", { dateStyle: "long" }).format(new Date(value));

function itemTitle(item: RxItem) {
  return item.ingredients
    .map((ingredient) => [ingredient.name, ingredient.concentration].filter(Boolean).join(" "))
    .join(" + ");
}

function PrescriptionDocumentView({ document }: { document: PrescriptionDocument }) {
  return (
    <article className="prescription-print-root">
      <header className="prescription-header">
        {document.clinic.logoData ? (
          <img src={document.clinic.logoData} alt={`Logo de ${document.clinic.name}`} />
        ) : null}
        <div>
          <p className="prescription-kicker">Receta médica</p>
          <h1>{document.clinic.name}</h1>
          {document.clinic.ruc ? <p>RUC {document.clinic.ruc}</p> : null}
        </div>
        <p className="prescription-date">{dateOnly(document.issuedAt)}</p>
      </header>

      <section className="prescription-patient">
        <div>
          <span>Paciente</span>
          <strong>{document.patient.fullName}</strong>
        </div>
        <div>
          <span>Identificación</span>
          <strong>{document.patient.idType.toUpperCase()} {document.patient.idNumber}</strong>
        </div>
        <div>
          <span>Edad</span>
          <strong>{age(document.patient.birthDate)} años</strong>
        </div>
      </section>

      {document.patient.allergies.length ? (
        <p className="prescription-alert">
          <strong>Alergias:</strong> {document.patient.allergies.join(", ")}
        </p>
      ) : null}

      {document.diagnosis ? (
        <p className="prescription-diagnosis"><strong>Diagnóstico:</strong> {document.diagnosis}</p>
      ) : null}

      <section className="prescription-rx">
        <h2>Rp.</h2>
        {document.items.map((item, index) => (
          <div className="prescription-item" key={`${document.id}-${index}`}>
            <div className="prescription-item-number">{index + 1}</div>
            <div>
              <h3>{itemTitle(item)}</h3>
              <p className="prescription-presentation">
                {[item.vehicle, item.quantity].filter(Boolean).join(" · ")}
              </p>
              {(item.dosage || item.frequency || item.duration) ? (
                <p>
                  {[item.dosage, item.frequency, item.duration].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              <p><strong>Indicaciones:</strong> {item.instructions}</p>
            </div>
          </div>
        ))}
      </section>

      {document.warnings ? (
        <p className="prescription-warning"><strong>Advertencias:</strong> {document.warnings}</p>
      ) : null}

      <footer className="prescription-footer">
        <div className="prescription-signature">
          <span />
          <strong>{document.professional.name}</strong>
          <small>{document.professional.specialty}</small>
          <small>Identificador profesional: {document.professional.registrationNo}</small>
        </div>
        <p>Documento emitido desde DERMA-OS. Conserve esta receta durante el tratamiento.</p>
      </footer>
    </article>
  );
}

export function PrescriptionPrintModal({
  patient,
  record,
  onClose,
}: {
  patient: Patient;
  record: ClinicalRecord;
  onClose: () => void;
}) {
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const document = useQuery({
    queryKey: ["prescription-document", patient.id, record.id],
    queryFn: () => getPrescriptionDocument(patient.id, record.id),
  });

  const print = async () => {
    setPrinting(true);
    setPrintError(null);
    try {
      await getPrescriptionDocument(patient.id, record.id, "print");
      window.print();
    } catch (error) {
      setPrintError(error instanceof Error ? error.message : "No se pudo preparar la receta");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Modal
      wide
      title={`Receta para entregar · ${patient.first_name} ${patient.last_name}`}
      onClose={onClose}
      foot={
        <>
          <Btn onClick={onClose}>Cerrar</Btn>
          <Btn
            kind="primary"
            icon="file"
            disabled={!document.data || printing}
            onClick={print}
          >
            {printing ? "Preparando…" : "Imprimir / Guardar PDF"}
          </Btn>
        </>
      }
    >
      {document.isLoading ? <EmptyState icon="pill">Preparando receta…</EmptyState> : null}
      {document.error ? (
        <p className="form-error">
          {document.error instanceof Error ? document.error.message : "No se pudo cargar la receta"}
        </p>
      ) : null}
      {printError ? <p className="form-error">{printError}</p> : null}
      {document.data ? <PrescriptionDocumentView document={document.data} /> : null}
    </Modal>
  );
}
