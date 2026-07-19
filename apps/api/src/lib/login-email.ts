import crypto from "node:crypto";
import tls from "node:tls";
import { env } from "../env.js";

function b64(s: string) {
  return Buffer.from(s, "utf8").toString("base64");
}

function escapeHeader(value: string) {
  return value.replace(/\r?\n/g, " ").trim();
}

function dotStuff(value: string) {
  return value.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

async function readResponse(socket: tls.TLSSocket) {
  return await new Promise<string>((resolve, reject) => {
    let buffer = "";
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\r\n").filter(Boolean);
      const last = lines[lines.length - 1];
      if (last && /^\d{3} /.test(last)) {
        cleanup();
        resolve(buffer);
      }
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onClose = () => {
      cleanup();
      reject(new Error("Conexion SMTP cerrada inesperadamente"));
    };
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
    };
    socket.on("data", onData);
    socket.on("error", onError);
    socket.on("close", onClose);
  });
}

async function sendCommand(socket: tls.TLSSocket, command: string, expectedPrefixes: string[]) {
  socket.write(`${command}\r\n`);
  const response = await readResponse(socket);
  if (!expectedPrefixes.some((prefix) => response.startsWith(prefix))) {
    throw new Error(`SMTP rechazo "${command}": ${response.trim()}`);
  }
}

function getMailerConfig() {
  const missing = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"].filter((key) => !env[key as keyof typeof env]);
  if (missing.length) {
    throw new Error(`Configuracion SMTP incompleta: faltan ${missing.join(", ")}`);
  }
  return {
    host: env.SMTP_HOST!,
    port: env.SMTP_PORT,
    user: env.SMTP_USER!,
    pass: env.SMTP_PASS!,
    from: env.SMTP_FROM!,
  };
}

export function isProductionAuthVerificationEnabled() {
  return env.NODE_ENV === "production";
}

export function generateLoginEmailCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashLoginEmailCode(userId: string, code: string) {
  return crypto.createHash("sha256").update(`${env.JWT_SECRET}:${userId}:${code}`).digest("hex");
}

async function sendEmailCode(to: string, subject: string, text: string, html: string, logLabel: string, code: string) {
  if (!isProductionAuthVerificationEnabled()) {
    console.log(`[${logLabel}] ${to} => ${code}`);
    return;
  }

  const config = getMailerConfig();
  const socket = tls.connect({
    host: config.host,
    port: config.port,
    servername: config.host,
    minVersion: "TLSv1.2",
  });
  socket.setTimeout(15_000, () => socket.destroy(new Error("Timeout de conexion SMTP")));

  await new Promise<void>((resolve, reject) => {
    socket.once("secureConnect", () => resolve());
    socket.once("error", reject);
  });

  try {
    await readResponse(socket);
    await sendCommand(socket, `EHLO ${config.host}`, ["250"]);
    await sendCommand(socket, "AUTH LOGIN", ["334"]);
    await sendCommand(socket, b64(config.user), ["334"]);
    await sendCommand(socket, b64(config.pass), ["235"]);
    await sendCommand(socket, `MAIL FROM:<${config.from}>`, ["250"]);
    await sendCommand(socket, `RCPT TO:<${to}>`, ["250", "251"]);
    await sendCommand(socket, "DATA", ["354"]);

    const message = [
      `From: DERMA-OS <${config.from}>`,
      `To: <${to}>`,
      `Subject: ${escapeHeader(subject)}`,
      "MIME-Version: 1.0",
      "Content-Type: multipart/alternative; boundary=\"derma-os-boundary\"",
      "",
      "--derma-os-boundary",
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      text,
      "",
      "--derma-os-boundary",
      "Content-Type: text/html; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      html,
      "",
      "--derma-os-boundary--",
    ].join("\r\n");

    await sendCommand(socket, `${dotStuff(message)}\r\n.`, ["250"]);
    await sendCommand(socket, "QUIT", ["221"]);
  } finally {
    socket.end();
  }
}

export async function sendLoginEmailCode(to: string, code: string) {
  const subject = env.AUTH_EMAIL_SUBJECT;
  const text = [
    "Tu codigo de acceso a DERMA-OS es:",
    code,
    "",
    `Caduca en ${env.AUTH_EMAIL_CODE_TTL_MINUTES} minutos.`,
    "Si no intentaste iniciar sesion, ignora este correo.",
  ].join("\r\n");
  const html = [
    "<div style=\"font-family:Arial,sans-serif;line-height:1.5;color:#111827\">",
    "<p>Tu codigo de acceso a <strong>DERMA-OS</strong> es:</p>",
    `<p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</p>`,
    `<p>Caduca en ${env.AUTH_EMAIL_CODE_TTL_MINUTES} minutos.</p>`,
    "<p>Si no intentaste iniciar sesion, ignora este correo.</p>",
    "</div>",
  ].join("");

  await sendEmailCode(to, subject, text, html, "auth/email-code", code);
}

export async function sendRegistrationEmailCode(to: string, code: string) {
  const subject = "Verifica tu cuenta DERMA-OS";
  const text = [
    "Tu codigo de verificacion para activar tu demo de DERMA-OS es:",
    code,
    "",
    `Caduca en ${env.AUTH_EMAIL_CODE_TTL_MINUTES} minutos.`,
    "Si no solicitaste esta cuenta, ignora este correo.",
  ].join("\r\n");
  const html = [
    "<div style=\"font-family:Arial,sans-serif;line-height:1.5;color:#111827\">",
    "<p>Tu codigo de verificacion para activar tu demo de <strong>DERMA-OS</strong> es:</p>",
    `<p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</p>`,
    `<p>Caduca en ${env.AUTH_EMAIL_CODE_TTL_MINUTES} minutos.</p>`,
    "<p>Si no solicitaste esta cuenta, ignora este correo.</p>",
    "</div>",
  ].join("");

  await sendEmailCode(to, subject, text, html, "auth/register-code", code);
}
