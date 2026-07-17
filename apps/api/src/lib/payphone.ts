import type { Prisma } from "@prisma/client";
import { env } from "../env.js";
import { badRequest } from "./errors.js";

export interface PayphoneCredentials {
  token: string;
  storeId: string;
}

export interface CreatePayphoneLinkInput {
  amount: number;
  reference: string;
  clientTransactionId: string;
  additionalData?: string;
}

function cents(value: number) {
  return Math.round(value * 100);
}

export function newClientTransactionId() {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${stamp}${rand}`.slice(0, 15);
}

function asPayload(value: unknown): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}

export async function createPayphoneLink(creds: PayphoneCredentials, input: CreatePayphoneLinkInput) {
  const amount = cents(input.amount);
  const body = {
    amount,
    amountWithoutTax: amount,
    currency: "USD",
    reference: input.reference.slice(0, 100),
    clientTransactionId: input.clientTransactionId,
    storeId: creds.storeId,
    additionalData: input.additionalData?.slice(0, 250),
    oneTime: true,
    expireIn: 0,
    isAmountEditable: false,
  };

  const res = await fetch(`${env.PAYPHONE_API_BASE.replace(/\/$/, "")}/Links`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  if (!res.ok || typeof parsed !== "string") {
    const message =
      typeof parsed === "object" && parsed && "message" in parsed
        ? String((parsed as { message?: unknown }).message)
        : "Payphone no genero el link de pago";
    throw badRequest(message);
  }

  return {
    link: parsed,
    payload: asPayload({ request: body, response: parsed }),
  };
}
