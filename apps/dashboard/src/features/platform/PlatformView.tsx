import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Btn, EmptyState, Field, PageHead } from "@/components/Primitives";
import { fmtDate } from "@/lib/helpers";
import {
  clearPlatformToken,
  createSubscriptionPaymentLink,
  extendSubscription,
  getPlatformToken,
  listPlatformClinics,
  loginPlatform,
  setPlatformToken,
  startTrial,
  updateClinicAccess,
  verifyPlatformEmail,
  type PlatformClinic,
} from "./api";

const MODULES = [
  "agenda",
  "pacientes",
  "historia",
  "fotos",
  "consentimientos",
  "paquetes",
  "pagos",
  "facturacion",
  "inventario",
  "reportes",
  "sistema",
  "procedimientos",
  "servicios",
];

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending_verification: { label: "Pendiente", cls: "bg-warn" },
  trialing: { label: "Demo", cls: "bg-info" },
  active: { label: "Activa", cls: "bg-ok" },
  expired: { label: "Expirada", cls: "bg-err" },
  suspended: { label: "Suspendida", cls: "bg-neutral" },
};

export function PlatformView() {
  const qc = useQueryClient();
  const [token, setToken] = useState(getPlatformToken());
  const [email, setEmail] = useState("gerencia@undercodeec.com");
  const [password, setPassword] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [emailMasked, setEmailMasked] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [amount, setAmount] = useState(49);
  const [selected, setSelected] = useState<PlatformClinic | null>(null);
  const [link, setLink] = useState("");

  const enabled = token.length > 0;
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["platform-clinics", token],
    enabled,
    queryFn: listPlatformClinics,
  });

  const loginMut = useMutation({
    mutationFn: () => loginPlatform(email.trim(), password),
    onSuccess: (r) => {
      setPassword("");
      if (r.emailVerificationRequired && r.challengeToken) {
        setChallengeToken(r.challengeToken);
        setEmailMasked(r.emailMasked ?? email.trim());
        setEmailCode("");
        return;
      }
      if (r.token) {
        setPlatformToken(r.token);
        setToken(r.token);
        qc.invalidateQueries({ queryKey: ["platform-clinics"] });
      }
    },
  });
  const verifyMut = useMutation({
    mutationFn: () => verifyPlatformEmail(challengeToken, emailCode),
    onSuccess: (r) => {
      setPlatformToken(r.token);
      setToken(r.token);
      setChallengeToken("");
      setEmailCode("");
      qc.invalidateQueries({ queryKey: ["platform-clinics"] });
    },
  });

  const stats = useMemo(() => {
    return {
      total: data.length,
      trialing: data.filter((c) => c.status === "trialing").length,
      active: data.filter((c) => c.status === "active").length,
      blocked: data.filter((c) => c.status === "expired" || c.status === "suspended").length,
    };
  }, [data]);

  function logout() {
    clearPlatformToken();
    setToken("");
    setSelected(null);
    setLink("");
    qc.removeQueries({ queryKey: ["platform-clinics"] });
  }

  const refresh = () => qc.invalidateQueries({ queryKey: ["platform-clinics"] });
  const updateSelected = (next: PlatformClinic) => {
    setSelected(next);
    refresh();
  };
  const trialMut = useMutation({ mutationFn: (id: string) => startTrial(id, 7), onSuccess: updateSelected });
  const extendMut = useMutation({ mutationFn: (id: string) => extendSubscription(id, 1), onSuccess: updateSelected });
  const suspendMut = useMutation({
    mutationFn: (id: string) => updateClinicAccess(id, { status: "suspended" }),
    onSuccess: updateSelected,
  });
  const saveModulesMut = useMutation({
    mutationFn: (c: PlatformClinic) =>
      updateClinicAccess(c.id, { allowedModules: c.allowedModules, notes: c.notes }),
    onSuccess: updateSelected,
  });
  const linkMut = useMutation({
    mutationFn: (id: string) => createSubscriptionPaymentLink(id, amount, 1),
    onSuccess: (p) => setLink(p.link),
  });

  return (
    <div className="content" style={{ minHeight: "100vh" }}>
      <div className="content-inner">
        <PageHead title="Superadmin global" sub="Clinicas, demos, suscripciones y accesos de plataforma">
          {enabled ? <Btn kind="ghost" onClick={logout}>Salir</Btn> : null}
        </PageHead>

        {!enabled ? (
          <div className="card card-pad" style={{ maxWidth: 520 }}>
            <h2 style={{ marginTop: 0 }}>Ingreso superadmin</h2>
            <p className="muted">
              Acceso exclusivo para gerencia de plataforma con segundo factor obligatorio por correo.
            </p>
            {challengeToken ? (
              <>
                <p className="muted">Ingresa el codigo de 6 digitos enviado a {emailMasked}.</p>
                <Field label="Codigo de verificacion">
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && emailCode.length === 6) verifyMut.mutate();
                    }}
                  />
                </Field>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn onClick={() => { setChallengeToken(""); setEmailCode(""); }}>Volver</Btn>
                  <Btn kind="primary" icon="check" disabled={emailCode.length !== 6 || verifyMut.isPending} onClick={() => verifyMut.mutate()}>
                    {verifyMut.isPending ? "Verificando..." : "Verificar e ingresar"}
                  </Btn>
                </div>
                {verifyMut.isError ? <p style={{ color: "var(--err)", fontSize: 13 }}>{(verifyMut.error as Error).message}</p> : null}
              </>
            ) : <><Field label="Correo">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                placeholder="gerencia@undercodeec.com"
              />
            </Field>
            <Field label="Contrasena">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Definida en PLATFORM_ADMIN_PASSWORD"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && email.trim() && password) loginMut.mutate();
                }}
              />
            </Field>
            <Btn
              kind="primary"
              icon="check"
              disabled={!email.trim() || !password || loginMut.isPending}
              onClick={() => loginMut.mutate()}
            >
              {loginMut.isPending ? "Ingresando..." : "Entrar"}
            </Btn>
            {loginMut.isError ? (
              <p style={{ color: "var(--err)", fontSize: 13 }}>{(loginMut.error as Error).message}</p>
            ) : null}
            </>}
          </div>
        ) : error ? (
          <div className="warn-box">{(error as Error).message}</div>
        ) : (
          <>
            <div className="kpi-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              <Kpi label="Clinicas" value={stats.total} />
              <Kpi label="Demo" value={stats.trialing} />
              <Kpi label="Activas" value={stats.active} />
              <Kpi label="Bloqueadas" value={stats.blocked} />
            </div>

            <div className="grid-2">
              <div className="card">
                {isLoading ? (
                  <EmptyState icon="users">Cargando clinicas...</EmptyState>
                ) : (
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Clinica</th>
                        <th>Estado</th>
                        <th>Dias</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((c) => {
                        const m = STATUS_META[c.status] ?? STATUS_META.expired;
                        return (
                          <tr key={c.id} className="rowlink" onClick={() => { setSelected(c); setLink(""); }}>
                            <td>
                              <strong>{c.name}</strong>
                              <div className="muted" style={{ fontSize: 12 }}>
                                {c.admins[0]?.email ?? "sin admin"}
                              </div>
                            </td>
                            <td><Badge cls={m.cls}>{m.label}</Badge></td>
                            <td className="tnum">{c.daysLeft}</td>
                            <td><Btn sm onClick={(e) => { e.stopPropagation(); setSelected(c); }}>Gestionar</Btn></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="card card-pad">
                {selected ? (
                  <ClinicPanel
                    clinic={selected}
                    amount={amount}
                    setAmount={setAmount}
                    link={link}
                    setClinic={setSelected}
                    onTrial={() => trialMut.mutate(selected.id)}
                    onExtend={() => extendMut.mutate(selected.id)}
                    onSuspend={() => suspendMut.mutate(selected.id)}
                    onSaveModules={() => saveModulesMut.mutate(selected)}
                    onPaymentLink={() => linkMut.mutate(selected.id)}
                    busy={trialMut.isPending || extendMut.isPending || suspendMut.isPending || saveModulesMut.isPending || linkMut.isPending}
                  />
                ) : (
                  <EmptyState icon="dashboard">Selecciona una clinica para gestionar acceso.</EmptyState>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="card kpi">
      <div className="k-label">{label}</div>
      <div className="k-value">{value}</div>
    </div>
  );
}

function ClinicPanel({
  clinic,
  amount,
  setAmount,
  link,
  setClinic,
  onTrial,
  onExtend,
  onSuspend,
  onSaveModules,
  onPaymentLink,
  busy,
}: {
  clinic: PlatformClinic;
  amount: number;
  setAmount: (n: number) => void;
  link: string;
  setClinic: (c: PlatformClinic) => void;
  onTrial: () => void;
  onExtend: () => void;
  onSuspend: () => void;
  onSaveModules: () => void;
  onPaymentLink: () => void;
  busy: boolean;
}) {
  const meta = STATUS_META[clinic.status] ?? STATUS_META.expired;
  const toggleModule = (mod: string) => {
    const set = new Set(clinic.allowedModules);
    if (set.has(mod)) set.delete(mod);
    else set.add(mod);
    setClinic({ ...clinic, allowedModules: [...set] });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 19 }}>{clinic.name}</h2>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
            {clinic.ruc ?? "sin RUC"} - creado {fmtDate(clinic.createdAt)}
          </p>
        </div>
        <Badge cls={meta.cls}>{meta.label}</Badge>
      </div>

      <div className="pay-detail-grid">
        <div><span className="pay-k">Demo vence</span>{clinic.trialEndsAt ? fmtDate(clinic.trialEndsAt) : "-"}</div>
        <div><span className="pay-k">Suscripcion vence</span>{clinic.subscriptionEndsAt ? fmtDate(clinic.subscriptionEndsAt) : "-"}</div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0" }}>
        <Btn icon="check" onClick={onTrial} disabled={busy}>Demo 7 dias</Btn>
        <Btn icon="check" onClick={onExtend} disabled={busy}>+1 mes manual</Btn>
        <Btn kind="ghost" icon="trash" onClick={onSuspend} disabled={busy}>Suspender</Btn>
      </div>

      <Field label="Monto mensual DERMA-OS">
        <input type="number" min="5" step="1" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
      </Field>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <Btn kind="primary" icon="link" onClick={onPaymentLink} disabled={busy}>Generar link mensual</Btn>
        {link ? <a href={link} target="_blank" rel="noreferrer" className="muted">{link}</a> : null}
      </div>

      <p className="card-title">Modulos habilitados</p>
      <div className="chips" style={{ marginBottom: 14 }}>
        {MODULES.map((m) => (
          <button
            key={m}
            className={`badge ${clinic.allowedModules.includes(m) ? "bg-ok" : "bg-neutral"}`}
            style={{ border: "none" }}
            onClick={() => toggleModule(m)}
          >
            {m}
          </button>
        ))}
      </div>
      <Field label="Notas internas">
        <textarea value={clinic.notes ?? ""} onChange={(e) => setClinic({ ...clinic, notes: e.target.value })} />
      </Field>
      <Btn icon="check" onClick={onSaveModules} disabled={busy}>Guardar accesos</Btn>
    </div>
  );
}
