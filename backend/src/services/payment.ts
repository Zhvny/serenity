import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type IpaymuItem = { name: string; qty: number; price: number };

export function ipaymuTimestamp(now: Date = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
}

export function buildIpaymuSignature(method: string, va: string, bodyJson: string, apiKey: string): string {
  const bodyHash = createHash("sha256").update(bodyJson).digest("hex");
  const stringToSign = `${method}:${va}:${bodyHash}:${apiKey}`;
  return createHmac("sha256", apiKey).update(stringToSign).digest("hex");
}

type IpaymuCreateResponse = {
  Status?: number;
  Data?: { SessionID?: string; SessionId?: string; Url?: string };
};

export async function createTransaction(order_id: string, amount: number, items: IpaymuItem[]): Promise<{ transaction_token: string; redirect_url: string }> {
  // ponytail: amount = order total (kontrak), rincian dikirim via items; validasi nominal di webhook.
  void amount;
  const va = process.env.IPAYMU_VA ?? "";
  const apiKey = process.env.IPAYMU_API_KEY ?? "";
  const base = process.env.IPAYMU_IS_PROD === "true" ? "https://my.ipaymu.com" : "https://sandbox.ipaymu.com";
  const body = {
    product: items.map((i) => i.name),
    qty: items.map((i) => i.qty),
    price: items.map((i) => i.price),
    description: items.map((i) => i.name),
    returnUrl: process.env.IPAYMU_RETURN_URL ?? "",
    cancelUrl: process.env.IPAYMU_CANCEL_URL ?? "",
    notifyUrl: process.env.IPAYMU_NOTIFY_URL ?? "",
    referenceId: order_id,
  };
  const bodyJson = JSON.stringify(body);
  const res = await fetch(`${base}/api/v2/payment`, {
    method: "POST",
    headers: { "content-type": "application/json", va, signature: buildIpaymuSignature("POST", va, bodyJson, apiKey), timestamp: ipaymuTimestamp() },
    body: bodyJson,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`PAYMENT_UPSTREAM: ${res.status}`);
  const data = (await res.json()) as IpaymuCreateResponse;
  const sessionId = data.Data?.SessionID ?? data.Data?.SessionId;
  const url = data.Data?.Url;
  if (data.Status !== 200 || sessionId === undefined || url === undefined) throw new Error(`PAYMENT_UPSTREAM: ${data.Status ?? "empty"}`);
  return { transaction_token: sessionId, redirect_url: url };
}

const INT_KEYS = new Set(["trx_id", "status_code", "transaction_status_code", "paid_off"]);

export function verifyIpaymuCallback(payload: Record<string, unknown>, xSignature: string, va: string): boolean {
  if (va === "" || xSignature === "") return false;
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(payload)) {
    const v = payload[key];
    if (INT_KEYS.has(key)) {
      normalized[key] = typeof v === "number" ? v : Number.parseInt(String(v), 10);
    } else if (key === "is_escrow") {
      normalized[key] = v === true || v === 1 || v === "1" ? true : v === false || v === 0 || v === "0" ? false : Boolean(v);
    } else if (key === "additional_info") {
      normalized[key] = v ?? [];
    } else {
      normalized[key] = v;
    }
  }
  if (!("additional_info" in normalized)) normalized["additional_info"] = [];
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(normalized).sort()) sorted[k] = normalized[k];
  const signed = JSON.stringify(sorted).replace(/\//g, "\\/");
  const expected = createHmac("sha256", va).update(signed).digest("hex");
  const a = Buffer.from(xSignature, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
