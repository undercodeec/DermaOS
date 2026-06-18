import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/Modal";
import { Btn, Field } from "@/components/Primitives";
import { Icon } from "@/components/icons";
import { fullName } from "@/lib/helpers";
import { uploadPhoto } from "../api";
import type { Patient, Photo, PhotoKind } from "@/lib/types";

const FOTOS_LESIONES = [
  "Acné vulgar",
  "Melasma centrofacial",
  "Rosácea",
  "Cicatrices post-acné",
  "Queratosis actínica",
  "Toxina botulínica",
  "Ácido hialurónico",
  "Láser CO₂",
  "Peeling químico",
  "Dermatitis atópica",
  "Vitíligo",
];

export function UploadPhotoModal({
  patient,
  existing,
  onClose,
}: {
  patient: Patient;
  existing: Photo[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const lesionesExistentes = Array.from(new Set(existing.map((x) => x.lesionTag)));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [f, setF] = useState({
    bodyArea: "",
    lesionPick: lesionesExistentes[0] ?? "",
    lesionNew: "",
    caption: "",
    kind: "basal" as PhotoKind,
  });

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files?.[0];
    if (!fl) return;
    if (!fl.type.startsWith("image/")) {
      alert("Selecciona una imagen válida.");
      return;
    }
    if (fl.size > 8 * 1024 * 1024) {
      alert("La imagen supera 8 MB.");
      return;
    }
    setFile(fl);
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(fl);
  };

  const tagFinal = f.lesionPick === "__nuevo__" ? f.lesionNew.trim() : f.lesionPick;
  const valid = !!file && f.bodyArea.trim() && tagFinal && f.caption.trim();

  const m = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append("file", file!);
      form.append("patient_id", patient.id);
      form.append("body_area", f.bodyArea.trim());
      form.append("lesion_tag", tagFinal);
      form.append("caption", f.caption.trim());
      form.append("kind", f.kind);
      return uploadPhoto(form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["photos", patient.id] });
      qc.invalidateQueries({ queryKey: ["patient-counts", patient.id] });
      onClose();
    },
  });

  return (
    <Modal
      title={`Subir fotografía clínica · ${fullName(patient)}`}
      onClose={onClose}
      foot={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn kind="primary" icon="check" disabled={!valid || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Subiendo…" : "Guardar foto"}
          </Btn>
        </>
      }
    >
      <Field label="Archivo de imagen (JPG/PNG, máx. 8 MB)">
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
        {preview ? (
          <div className="foto-drop foto-drop-ok">
            <img src={preview} alt="vista previa" />
            <div className="foto-drop-meta">
              <strong>{file?.name ?? "imagen"}</strong>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => fileRef.current?.click()}
              >
                Cambiar
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="foto-drop" onClick={() => fileRef.current?.click()}>
            <Icon name="camera" size={28} />
            <strong>Seleccionar imagen</strong>
            <span className="muted" style={{ fontSize: 12.5 }}>
              Se sube al servidor; el binario queda protegido por JWT.
            </span>
          </button>
        )}
      </Field>
      <div className="frow">
        <Field label="Tipo">
          <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as PhotoKind })}>
            <option value="basal">Basal (antes)</option>
            <option value="control">Control (después / seguimiento)</option>
          </select>
        </Field>
        <Field label="Caso / lesión">
          <select value={f.lesionPick} onChange={(e) => setF({ ...f, lesionPick: e.target.value })}>
            {lesionesExistentes.length > 0 && (
              <optgroup label="Casos del paciente">
                {lesionesExistentes.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Catálogo">
              {FOTOS_LESIONES.filter((x) => !lesionesExistentes.includes(x)).map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </optgroup>
            <option value="__nuevo__">+ Nuevo caso…</option>
          </select>
        </Field>
      </div>
      {f.lesionPick === "__nuevo__" ? (
        <Field label="Nombre del nuevo caso">
          <input
            value={f.lesionNew}
            onChange={(e) => setF({ ...f, lesionNew: e.target.value })}
            placeholder="Ej. Vitíligo segmentario"
          />
        </Field>
      ) : null}
      <div className="frow">
        <Field label="Área anatómica">
          <input
            value={f.bodyArea}
            onChange={(e) => setF({ ...f, bodyArea: e.target.value })}
            placeholder="Rostro · frontal"
          />
        </Field>
        <Field label="Caption / descripción">
          <input
            value={f.caption}
            onChange={(e) => setF({ ...f, caption: e.target.value })}
            placeholder="Basal, antes del tratamiento"
          />
        </Field>
      </div>
      {m.isError ? (
        <p style={{ color: "var(--err)", fontSize: 13 }}>{(m.error as Error).message}</p>
      ) : null}
    </Modal>
  );
}
