// Nomor antrean berasal dari pembayaran berhasil, bukan dari order ID.
export function queueNo(queueNumber: number | null | undefined): string | null {
  if (queueNumber === null || queueNumber === undefined || !Number.isInteger(queueNumber) || queueNumber < 1) return null;
  return "#" + String(queueNumber).padStart(3, "0");
}
