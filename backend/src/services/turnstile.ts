// Verifikasi token Cloudflare Turnstile (spec 2026-10-08-turnstile-checkout).
// fetch global agar murah di-mock; timeout AbortController agar checkout tak gantung.
const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5000; // tunable tanpa migrasi bila salah sasaran

let failopenTotal = 0;
export function turnstileFailopenTotal(): number {
  return failopenTotal;
}

export type VerifyResult = { ok: true } | { ok: false } | { ok: "failopen" };

export async function verifyTurnstile(token: string): Promise<VerifyResult> {
  const secret = process.env.TURNSTILE_SECRET ?? "";
  if (secret === "" || token === "") return { ok: false };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }).toString(),
      signal: ctrl.signal,
    });
    if (!res.ok) return failopen();
    const body = (await res.json()) as { success?: unknown };
    // success:false mencakup token basi/duplikat (timeout-or-duplicate) -> tolak.
    return body.success === true ? { ok: true } : { ok: false };
  } catch {
    // Hanya network error/timeout yang fail-open (server-to-server; penyerang luar tak bisa picu).
    return failopen();
  } finally {
    clearTimeout(timer);
  }
}

function failopen(): VerifyResult {
  failopenTotal += 1;
  console.error(JSON.stringify({ event: "turnstile_failopen", n: failopenTotal }));
  // Mode darurat fail-closed: TURNSTILE_STRICT=true menolak saat CF tak terjangkau
  // (default fail-open sesuai keputusan grill; flip via env tanpa deploy kode).
  if (process.env.TURNSTILE_STRICT === "true") return { ok: false };
  return { ok: "failopen" };
}
