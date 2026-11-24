// Nomor antrian harian dari id order "HP-YYMMDD-NNNN" (urutan ke-N pada hari itu) -> "#001".
export function queueNo(orderId: string | null | undefined): string | null {
  const m = /^HP-\d{6}-(\d+)$/.exec(orderId ?? "");
  if (m === null || m[1] === undefined) return null;
  return "#" + String(Number(m[1])).padStart(3, "0");
}
