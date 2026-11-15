// Alamat dari peta (reverse-geocode) hanya mengisi kolom bila pengguna belum menulis sendiri.
// Alamat yang sudah diketik (jalan, nomor, patokan) tidak boleh ditimpa ketukan peta.
export function shouldFillAddress(current: string, userEdited: boolean): boolean {
  return current.trim() === "" || !userEdited;
}
