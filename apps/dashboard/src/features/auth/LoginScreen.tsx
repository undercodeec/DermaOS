import { useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { Btn, Field } from "@/components/Primitives";
import { useAuth } from "@/lib/auth";

type Step =
  | { kind: "credentials" }
  | { kind: "mfa" }
  | { kind: "mfa-setup"; secret: string; otpauthUrl: string };

export function LoginScreen() {
  const { signIn, verifyMfaSetup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [step, setStep] = useState<Step>({ kind: "credentials" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submitCreds = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await signIn(email, password);
    setBusy(false);
    if (r.ok) return;
    if ("mfaRequired" in r) {
      setStep({ kind: "mfa" });
    } else if ("mfaSetup" in r) {
      setStep({ kind: "mfa-setup", secret: r.secret, otpauthUrl: r.otpauthUrl });
    } else {
      setErr(r.error);
    }
  };

  const submitMfa = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await signIn(email, password, totp);
    setBusy(false);
    if (r.ok) return;
    if ("error" in r) setErr(r.error);
  };

  const submitSetup = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await verifyMfaSetup(email, password, totp);
    setBusy(false);
    if (r.ok) return;
    if ("error" in r) setErr(r.error);
  };

  const resetToCreds = () => {
    setStep({ kind: "credentials" });
    setTotp("");
    setErr(null);
  };

  return (
    <div className="login-screen">
      <section
        className="login-brand"
        style={{
          background: "linear-gradient(140deg, #00AC9A 0%, #008B7B 55%, #0D3330 100%)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div className="login-brand-inner">
          <Icon name="stetho" size={36} />
          <h1>DERMA-OS · Plataforma del centro dermatológico</h1>
          <p>
            Historia clínica, agenda, paquetes, cobros Payphone y facturación SRI
            en un solo lugar. Acceso por rol con auditoría y cifrado de fotos.
          </p>
        </div>
      </section>
      <section className="login-pane">
        <div className="login-card">
          {step.kind === "credentials" ? (
            <>
              <h2>Iniciar sesión</h2>
              <p className="muted">Use sus credenciales del centro para continuar.</p>
              <form onSubmit={submitCreds}>
                {err ? <div className="login-error">{err}</div> : null}
                <Field label="Correo electrónico">
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@dermapielypelo.ec"
                    required
                  />
                </Field>
                <Field label="Contraseña">
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </Field>
                <Btn
                  type="submit"
                  kind="primary"
                  icon="check"
                  disabled={busy}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {busy ? "Verificando…" : "Entrar"}
                </Btn>
              </form>
              <div className="login-help">
                Usuarios Demo:
                <br />
                <code>admin@dermapielypelo.ec</code>  contraseña común <code>derma123</code>.
              </div>
            </>
          ) : step.kind === "mfa" ? (
            <>
              <h2>Verificación en 2 pasos</h2>
              <p className="muted">
                Introduzca el código de 6 dígitos de su aplicación autenticadora.
              </p>
              <form onSubmit={submitMfa}>
                {err ? <div className="login-error">{err}</div> : null}
                <Field label="Código TOTP">
                  <input
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    autoFocus
                    value={totp}
                    onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    style={{ fontSize: 22, letterSpacing: 6, textAlign: "center" }}
                    required
                  />
                </Field>
                <Btn
                  type="submit"
                  kind="primary"
                  icon="check"
                  disabled={busy || totp.length !== 6}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {busy ? "Verificando…" : "Verificar"}
                </Btn>
                <Btn kind="ghost" onClick={resetToCreds} style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
                  Volver
                </Btn>
              </form>
            </>
          ) : (
            <>
              <h2>Configurar MFA</h2>
              <p className="muted" style={{ fontSize: 13 }}>
                Su rol exige MFA. Escanee el QR con Google Authenticator, Authy o 1Password
                y confirme con el primer código.
              </p>
              {err ? <div className="login-error">{err}</div> : null}
              <div
                style={{
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  textAlign: "center",
                }}
              >
                <img
                  alt="QR MFA"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    step.otpauthUrl,
                  )}`}
                  width={180}
                  height={180}
                  style={{ display: "block", margin: "0 auto" }}
                />
                <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                  Clave manual: <code style={{ fontFamily: "monospace" }}>{step.secret}</code>
                </p>
              </div>
              <form onSubmit={submitSetup}>
                <Field label="Primer código TOTP">
                  <input
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    autoFocus
                    value={totp}
                    onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    style={{ fontSize: 22, letterSpacing: 6, textAlign: "center" }}
                    required
                  />
                </Field>
                <Btn
                  type="submit"
                  kind="primary"
                  icon="check"
                  disabled={busy || totp.length !== 6}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {busy ? "Verificando…" : "Activar MFA y entrar"}
                </Btn>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
