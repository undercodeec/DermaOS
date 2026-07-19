import { useState, type FormEvent } from "react";
import { Btn, Field } from "@/components/Primitives";
import { useAuth } from "@/lib/auth";
import brandImage from "@/img/DermaOS.png";

type Step =
  | { kind: "credentials" }
  | { kind: "register" }
  | { kind: "register-code"; emailMasked?: string }
  | { kind: "email-code"; emailMasked?: string };

const initialRegister = {
  clinicName: "",
  ruc: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

export function LoginScreen() {
  const { signIn, signUp, verifyRegistration } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [register, setRegister] = useState(initialRegister);
  const [step, setStep] = useState<Step>({ kind: "credentials" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openRegister = () => {
    setStep({ kind: "register" });
    setErr(null);
  };

  const resetToCreds = () => {
    setStep({ kind: "credentials" });
    setEmailCode("");
    setErr(null);
  };

  const submitCreds = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await signIn(email, password);
    setBusy(false);
    if (r.ok) return;
    if ("emailVerificationRequired" in r) {
      setStep({ kind: "email-code", emailMasked: r.emailMasked });
      setEmailCode("");
    } else {
      setErr(r.error);
    }
  };

  const submitEmailCode = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await signIn(email, password, emailCode);
    setBusy(false);
    if (r.ok) return;
    if ("error" in r) setErr(r.error);
  };

  const submitRegister = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await signUp(register);
    setBusy(false);
    if (r.ok) return;
    if ("emailVerificationRequired" in r) {
      setStep({ kind: "register-code", emailMasked: r.emailMasked });
      setEmailCode("");
    } else {
      setErr(r.error);
    }
  };

  const submitRegisterCode = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await verifyRegistration(register.adminEmail, emailCode);
    setBusy(false);
    if (r.ok) return;
    if ("error" in r) setErr(r.error);
  };

  return (
    <div className="login-screen">
      <section
        className="login-brand"
        style={{
          padding: 0,
          overflow: "hidden",
        }}
      >
        <img
          src={brandImage}
          alt="DERMA-OS"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </section>
      <section className="login-pane">
        <div className="login-card">
          {step.kind === "credentials" ? (
            <>
              <h2>Iniciar sesion</h2>
              <p className="muted">Use sus credenciales del centro para continuar.</p>
              <form onSubmit={submitCreds}>
                {err ? <div className="login-error">{err}</div> : null}
                <Field label="Correo electronico">
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@dermapielypelo.ec"
                    required
                  />
                </Field>
                <Field label="Contrasena">
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
                  {busy ? "Verificando..." : "Entrar"}
                </Btn>
              </form>
              <p className="login-switch">
                Aun no tienes una cuenta registrada?{" "}
                <button type="button" className="login-link" onClick={openRegister}>
                  Registrate
                </button>
              </p>
              <div className="login-help">
                Usuarios Demo:
                <br />
                <code>admin@prueba.local</code> contrasena comun <code>Password123</code>.
              </div>
            </>
          ) : null}

          {step.kind === "register" ? (
            <>
              <h2>Registro de usuario</h2>
              <p className="muted">Cree la cuenta principal de su clinica con el mismo acceso al sistema.</p>
              <form onSubmit={submitRegister}>
                {err ? <div className="login-error">{err}</div> : null}
                <Field label="Nombre de la clinica">
                  <input
                    value={register.clinicName}
                    onChange={(e) => setRegister((s) => ({ ...s, clinicName: e.target.value }))}
                    placeholder="Clinica Dermapiel"
                    required
                  />
                </Field>
                <Field label="RUC (opcional)">
                  <input
                    value={register.ruc}
                    onChange={(e) => setRegister((s) => ({ ...s, ruc: e.target.value }))}
                    placeholder="1790012345001"
                  />
                </Field>
                <Field label="Nombre del administrador">
                  <input
                    value={register.adminName}
                    onChange={(e) => setRegister((s) => ({ ...s, adminName: e.target.value }))}
                    placeholder="Dra. Maria Perez"
                    required
                  />
                </Field>
                <Field label="Correo electronico">
                  <input
                    type="email"
                    autoComplete="email"
                    value={register.adminEmail}
                    onChange={(e) => setRegister((s) => ({ ...s, adminEmail: e.target.value }))}
                    placeholder="admin@clinica.com"
                    required
                  />
                </Field>
                <Field label="Contrasena">
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={register.adminPassword}
                    onChange={(e) => setRegister((s) => ({ ...s, adminPassword: e.target.value }))}
                    placeholder="Minimo 8 caracteres"
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
                  {busy ? "Creando cuenta..." : "Crear cuenta"}
                </Btn>
                <Btn
                  type="button"
                  kind="ghost"
                  onClick={resetToCreds}
                  style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                >
                  Volver a iniciar sesion
                </Btn>
              </form>
            </>
          ) : null}

          {step.kind === "register-code" ? (
            <>
              <h2>Verifica tu correo</h2>
              <p className="muted">
                Enviamos un codigo de 6 digitos a <strong>{step.emailMasked ?? register.adminEmail}</strong>.
                Al validarlo se activara tu demo de 7 dias.
              </p>
              <form onSubmit={submitRegisterCode}>
                {err ? <div className="login-error">{err}</div> : null}
                <Field label="Codigo de verificacion">
                  <input
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    autoFocus
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    style={{ fontSize: 22, letterSpacing: 6, textAlign: "center" }}
                    required
                  />
                </Field>
                <Btn
                  type="submit"
                  kind="primary"
                  icon="check"
                  disabled={busy || emailCode.length !== 6}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {busy ? "Activando demo..." : "Verificar y entrar"}
                </Btn>
                <Btn
                  type="button"
                  kind="ghost"
                  onClick={resetToCreds}
                  style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                >
                  Volver
                </Btn>
              </form>
            </>
          ) : null}

          {step.kind === "email-code" ? (
            <>
              <h2>Verificacion por correo</h2>
              <p className="muted">
                Introduzca el codigo de 6 digitos enviado a <strong>{step.emailMasked ?? email}</strong>.
              </p>
              <form onSubmit={submitEmailCode}>
                {err ? <div className="login-error">{err}</div> : null}
                <Field label="Codigo de verificacion">
                  <input
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    autoFocus
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    style={{ fontSize: 22, letterSpacing: 6, textAlign: "center" }}
                    required
                  />
                </Field>
                <Btn
                  type="submit"
                  kind="primary"
                  icon="check"
                  disabled={busy || emailCode.length !== 6}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {busy ? "Verificando..." : "Verificar y entrar"}
                </Btn>
                <Btn
                  type="button"
                  kind="ghost"
                  onClick={() => void submitCreds()}
                  style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                >
                  Reenviar codigo
                </Btn>
                <Btn
                  type="button"
                  kind="ghost"
                  onClick={resetToCreds}
                  style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                >
                  Volver
                </Btn>
              </form>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
