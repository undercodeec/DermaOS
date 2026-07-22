import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Icon } from "@/components/icons";
import { Btn, EmptyState } from "@/components/Primitives";
import { fmtDate } from "@/lib/helpers";
import { roleCanWrite } from "@/lib/permissions";
import type { Photo } from "@/lib/types";
import type { TabProps } from "./TabProps";
import { UploadPhotoModal } from "../modals/UploadPhotoModal";
import { deletePhoto, replacePhoto } from "../api";

function usePhotoUrl(photoId: string | null) {
  const { data } = useQuery({
    queryKey: ["photo-blob", photoId],
    enabled: !!photoId,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      if (!photoId) return null;
      const res = await api.raw(`/photos/${photoId}/file`);
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    },
  });
  useEffect(() => {
    return () => {
      if (data) URL.revokeObjectURL(data);
    };
  }, [data]);
  return data ?? null;
}

function BeforeAfter({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="ba-wrap">
      <div
        className="ba"
        onMouseMove={(e) => {
          if (e.buttons !== 1) return;
          const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          setPos(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)));
        }}
      >
        <img className="ba-img" src={after} alt="después" draggable={false} />
        <div className="ba-clip" style={{ width: pos + "%" }}>
          <img className="ba-img" src={before} alt="antes" draggable={false} />
        </div>
        <div className="ba-handle" style={{ left: pos + "%" }}>
          <div className="ba-knob">
            <Icon name="chevL" size={13} />
            <Icon name="chevR" size={13} />
          </div>
        </div>
        <span className="ba-lbl ba-lbl-l">Antes</span>
        <span className="ba-lbl ba-lbl-r">Después</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(pos)}
        onChange={(e) => setPos(Number(e.target.value))}
        className="ba-range"
      />
    </div>
  );
}

function PairOrSingle({ basal, control }: { basal: Photo; control: Photo | null }) {
  const before = usePhotoUrl(basal.id);
  const after = usePhotoUrl(control?.id ?? null);
  if (!before) return null;
  if (control && after) return <BeforeAfter before={before} after={after} />;
  return <img src={before} alt={basal.caption} style={{ width: "100%", borderRadius: 9 }} />;
}

function Thumb({
  photo,
  thumbsOnly,
  canManage,
  deleting,
  replacing,
  onDelete,
  onReplace,
}: {
  photo: Photo;
  thumbsOnly: boolean;
  canManage: boolean;
  deleting: boolean;
  replacing: boolean;
  onDelete: () => void;
  onReplace: (file: File) => void;
}) {
  const url = usePhotoUrl(photo.id);
  const [open, setOpen] = useState(false);
  const replaceRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open]);
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <button
        className={`foto-thumb${thumbsOnly ? " thumb-locked" : ""}`}
        onClick={() => !thumbsOnly && setOpen(true)}
        disabled={thumbsOnly}
      >
        {url ? <img src={url} alt={photo.caption} /> : <Icon name="camera" size={22} />}
        <span className={`foto-thumb-kind ${photo.kind === "basal" ? "k-basal" : "k-control"}`}>
          {photo.kind === "basal" ? "Basal" : "Control"}
        </span>
        <span className="foto-thumb-date tnum">{fmtDate(photo.takenAt)}</span>
      </button>
      {canManage ? (
        <div style={{ display: "flex", gap: 6 }}>
          <input
            ref={replaceRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onReplace(file);
            }}
          />
          <Btn
            sm
            icon="camera"
            disabled={deleting || replacing}
            onClick={() => replaceRef.current?.click()}
          >
            {replacing ? "Reemplazandoâ€¦" : "Reemplazar"}
          </Btn>
          <Btn
            sm
            kind="ghost"
            icon="trash"
            disabled={deleting || replacing}
            onClick={onDelete}
          >
            {deleting ? "Eliminandoâ€¦" : "Eliminar"}
          </Btn>
        </div>
      ) : null}
      {open && url ? (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="modal wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{photo.lesionTag}</h3>
              <button className="mclose" onClick={() => setOpen(false)}>
                <Icon name="x" size={16} />
              </button>
            </div>
            <div className="modal-body">
              <img src={url} alt={photo.caption} style={{ width: "100%", borderRadius: 9 }} />
              <p className="muted" style={{ marginTop: 8 }}>
                {photo.caption} · {fmtDate(photo.takenAt)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TabFotos({ patient, role }: TabProps) {
  const queryClient = useQueryClient();
  const [openUpload, setOpenUpload] = useState(false);
  const thumbsOnly = role === "recepcion";
  const canUpload = roleCanWrite(role, "fotos");
  const canManage = role === "admin";

  const { data: all = [], isLoading } = useQuery({
    queryKey: ["photos", patient.id],
    queryFn: () => api.get<Photo[]>(`/patients/${patient.id}/photos`),
  });

  const refreshPhotoQueries = (photoId: string) => {
    queryClient.removeQueries({ queryKey: ["photo-blob", photoId] });
    queryClient.invalidateQueries({ queryKey: ["photos", patient.id] });
    queryClient.invalidateQueries({ queryKey: ["patient-counts", patient.id] });
  };

  const deleteMutation = useMutation({
    mutationFn: (photo: Photo) => deletePhoto(photo.id),
    onSuccess: (_result, photo) => refreshPhotoQueries(photo.id),
    onError: (error: Error) => window.alert(error.message),
  });

  const replaceMutation = useMutation({
    mutationFn: ({ photo, file }: { photo: Photo; file: File }) => replacePhoto(photo.id, file),
    onSuccess: (_result, variables) => refreshPhotoQueries(variables.photo.id),
    onError: (error: Error) => window.alert(error.message),
  });

  const groups = useMemo(() => {
    const g: Record<string, Photo[]> = {};
    all.forEach((p) => {
      (g[p.lesionTag] = g[p.lesionTag] || []).push(p);
    });
    return g;
  }, [all]);

  if (isLoading)
    return (
      <div className="card">
        <EmptyState icon="camera">Cargando fotografías…</EmptyState>
      </div>
    );

  const empty = Object.keys(groups).length === 0;

  return (
    <div>
      <div
        className="warn-box"
        style={{
          marginBottom: 16,
          background: "var(--info-bg)",
          color: "var(--info)",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Icon name="lock" size={16} />
          <span>
            Fotografías almacenadas en servidor privado, servidas bajo autenticación JWT. Toda
            apertura queda en la auditoría.
          </span>
        </div>
        {canUpload ? (
          <Btn kind="primary" sm icon="camera" onClick={() => setOpenUpload(true)}>
            Subir foto
          </Btn>
        ) : null}
      </div>

      {empty ? (
        <div className="card">
          <EmptyState icon="camera">
            Sin fotografías clínicas.{canUpload ? " Usa «Subir foto» para empezar." : ""}
          </EmptyState>
        </div>
      ) : (
        Object.entries(groups).map(([tag, items]) => {
          const basal = items.find((x) => x.kind === "basal") ?? items[0];
          const control =
            [...items].reverse().find((x) => x.kind === "control" && x.id !== basal.id) ?? null;
          return (
            <div key={tag} className="card card-pad" style={{ marginBottom: 16 }}>
              <div className="foto-grp-hd">
                <div>
                  <p className="card-title" style={{ marginBottom: 4 }}>
                    {tag}
                  </p>
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    {items.length} fotografía{items.length === 1 ? "" : "s"} · {items[0].bodyArea}
                  </span>
                </div>
                <span className="foto-grp-range tnum">
                  {fmtDate(items[0].takenAt)} → {fmtDate(items[items.length - 1].takenAt)}
                </span>
              </div>
              {!thumbsOnly ? (
                <div style={{ marginTop: 12 }}>
                  <PairOrSingle basal={basal} control={control} />
                </div>
              ) : null}
              <div className="foto-strip" style={{ marginTop: 12 }}>
                {items.map((x) => (
                  <Thumb
                    key={x.id}
                    photo={x}
                    thumbsOnly={thumbsOnly}
                    canManage={canManage}
                    deleting={deleteMutation.isPending && deleteMutation.variables?.id === x.id}
                    replacing={replaceMutation.isPending && replaceMutation.variables?.photo.id === x.id}
                    onDelete={() => {
                      if (window.confirm(`Â¿Eliminar definitivamente la foto "${x.caption}"?`)) {
                        deleteMutation.mutate(x);
                      }
                    }}
                    onReplace={(file) => replaceMutation.mutate({ photo: x, file })}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      {openUpload ? (
        <UploadPhotoModal patient={patient} existing={all} onClose={() => setOpenUpload(false)} />
      ) : null}
    </div>
  );
}
