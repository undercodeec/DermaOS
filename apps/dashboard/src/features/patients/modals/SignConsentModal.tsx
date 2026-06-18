import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/Modal";
import { Btn, Field } from "@/components/Primitives";
import { Icon } from "@/components/icons";
import { fullName } from "@/lib/helpers";
import { signConsent } from "../api";
import type { Consent, Patient } from "@/lib/types";

function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
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

  const getXY = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = ref.current!;
    const r = canvas.getBoundingClientRect();
    const pt = "touches" in e ? e.touches[0] : e;
    return { x: pt.clientX - r.left, y: pt.clientY - r.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawing.current = true;
    last.current = getXY(e);
  };
  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = ref.current!.getContext("2d")!;
    const cur = getXY(e);
    ctx.beginPath();
    ctx.moveTo(last.current!.x, last.current!.y);
    ctx.lineTo(cur.x, cur.y);
    ctx.stroke();
    last.current = cur;
    if (empty) setEmpty(false);
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(ref.current!.toDataURL("image/png"));
  };
  const clear = () => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const r = canvas.getBoundingClientRect();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, r.width, r.height);
    setEmpty(true);
    onChange(null);
  };

  return (
    <div className="sigpad">
      <canvas
        ref={ref}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      {empty ? <span className="sigpad-hint">Firme aquí con el dedo o el lápiz óptico</span> : null}
      <button type="button" className="sigpad-clear" onClick={clear} title="Borrar firma">
        <Icon name="trash" size={13} /> Borrar
      </button>
    </div>
  );
}

export function SignConsentModal({
  consent,
  patient,
  onClose,
}: {
  consent: Consent;
  patient: Patient;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [sig, setSig] = useState<string | null>(null);
  const [acepta, setAcepta] = useState(false);
  const ok = !!sig && acepta;

  const m = useMutation({
    mutationFn: () => signConsent(consent.id, sig ?? undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consents", patient.id] });
      onClose();
    },
  });

  const kindLabel = consent.template?.kind === "imagen" ? "Uso de imagen" : "Clínico";
  const kindCls = consent.template?.kind === "imagen" ? "ck-imagen" : "ck-clinico";
  const kindIcon = consent.template?.kind === "imagen" ? "camera" : "stetho";

  return (
    <Modal
      wide
      title={`Firma del paciente · ${kindLabel}`}
      onClose={onClose}
      foot={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn kind="primary" icon="pen" disabled={!ok || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Registrando…" : "Registrar firma"}
          </Btn>
        </>
      }
    >
      <div className={`consent-kind ${kindCls}`} style={{ marginBottom: 10 }}>
        <Icon name={kindIcon} size={12} /> {kindLabel}
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>{consent.template?.title}</p>
      <p
        style={{
          fontSize: 13,
          color: "var(--ink-2)",
          lineHeight: 1.55,
          maxHeight: 130,
          overflow: "auto",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-sm)",
          padding: "10px 12px",
          margin: "0 0 14px",
          background: "var(--bg-subtle)",
        }}
      >
        {consent.template?.body}
      </p>

      <label className="consent-check">
        <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
        <span>
          El/la paciente <strong>{fullName(patient)}</strong> (CI {patient.id_number}) declara haber leído y
          comprendido este documento y acepta firmar de forma libre y voluntaria.
        </span>
      </label>

      <Field label="Firma manuscrita">
        <SignaturePad onChange={setSig} />
      </Field>
      <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
        Auditoría: fecha, hora, IP y usuario que captura la firma.
      </p>
      {m.isError ? (
        <p style={{ color: "var(--err)", fontSize: 13 }}>{(m.error as Error).message}</p>
      ) : null}
    </Modal>
  );
}
