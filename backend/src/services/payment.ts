import { createHash, timingSafeEqual } from "node:crypto";

export function verifySignature(order_id: string, status_code: string, gross_amount: string, signature_key: string): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? "";
  if (serverKey === "") return false;
  const expected = createHash("sha512").update(`${order_id}${status_code}${gross_amount}${serverKey}`).digest("hex");
  const a = Buffer.from(signature_key, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function createTransaction(order_id: string, amount: number): Promise<{ transaction_token: string; redirect_url: string }> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? "";
  const base = process.env.MIDTRANS_IS_PROD === "true" ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";
  const res = await fetch(`${base}/snap/v1/transactions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}` },
    body: JSON.stringify({ transaction_details: { order_id, gross_amount: amount } }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`PAYMENT_UPSTREAM: ${res.status}`);
  return (await res.json()) as { transaction_token: string; redirect_url: string };
}
