// Kamus area "orders". Kunci berawalan nama area (mis. shell.*). Indonesia = teks asli persis; Inggris = terjemahan alami.
export const id = {
  // Status pesanan (dipakai Thanks/Status/History)
  "orders.status.pending": "Menunggu pembayaran",
  "orders.status.underpaid": "Kurang bayar",
  "orders.status.paid": "Lunas",
  "orders.status.paidFull": "Dibayar lunas",
  "orders.status.expired": "Kedaluwarsa",
  "orders.status.cancelled": "Dibatalkan",

  // Bersama
  "orders.common.backHome": "Kembali ke beranda",
  "orders.common.notFoundTitle": "Pesanan tidak ditemukan",
  "orders.common.topup": "Buat kode top-up",
  "orders.common.shortBy": "Kurang {amount}",
  "orders.common.topupFailed": "Gagal membuat kode top-up.",
  "orders.common.topupUnavailable": "Top-up tidak dapat dibuat. Muat ulang halaman.",

  // ThanksPage
  "orders.thanks.loading": "Memuat",
  "orders.thanks.notFoundText": "Tautan tidak berlaku untuk sesi ini.",
  "orders.thanks.topupExists": "Kode top-up sudah ada. Hubungi admin.",
  "orders.thanks.titlePaid": "Pembayaran diterima",
  "orders.thanks.titleQris": "Pembayaran QRIS",
  "orders.thanks.codeLabel": "Kode pesanan:",
  "orders.thanks.payExactly": "Bayar tepat",
  "orders.thanks.thanksNote": "Terima kasih! Pesanan Anda sedang kami proses.",
  "orders.thanks.received": "Masuk {paid} dari {total} — Kurang {rest}",
  "orders.thanks.contactAdmin": "Atau hubungi admin untuk bantuan.",
  "orders.thanks.qrAlt": "QRIS pembayaran Serenity",
  "orders.thanks.step1": "Scan QRIS di atas dengan aplikasi e-wallet / m-banking (GoPay, OVO, DANA, bank, dll).",
  "orders.thanks.step2a": "Masukkan nominal",
  "orders.thanks.step2b": "persis {amount}",
  "orders.thanks.step2c": ". Nominal yang berbeda membuat pesanan sulit dikonfirmasi.",
  "orders.thanks.step3a": "Selesaikan pembayaran, lalu tunggu — status berubah jadi",
  "orders.thanks.step3b": "setelah transaksi terverifikasi (sekitar 5–30 menit).",
  "orders.thanks.saveNote": "Simpan halaman ini atau catat kode pesanan untuk konfirmasi.",

  // StatusPage
  "orders.status.loading": "Memuat status",
  "orders.status.title": "Status Pesanan",
  "orders.status.codeLabel": "Kode:",

  // HistoryPage
  "orders.history.title": "Riwayat Pesanan",
  "orders.history.filterLabel": "Filter status",
  "orders.history.all": "Semua",
  "orders.history.loading": "Memuat riwayat",
  "orders.history.errorTitle": "Riwayat gagal dimuat",
  "orders.history.errorGeneric": "Terjadi kesalahan",
  "orders.history.retry": "Coba lagi",
  "orders.history.emptyTitle": "Belum ada pesanan",
  "orders.history.emptyText": "Pesanan dari perangkat ini akan tampil di sini.",
  "orders.history.viewMenu": "Lihat menu",
  "orders.history.donation": "Donasi disetujui",
  "orders.history.paidAmount": "Dibayar {amount}",
  "orders.history.payRest": "Bayar sisa",
  "orders.history.track": "Lacak",

  // NotFoundPage
  "orders.notfound.title": "Halaman tidak ditemukan",
  "orders.notfound.text": "Waduh, rotinya gosong! Kode: 404 — halaman yang Anda cari tidak ada atau sudah dipindahkan.",

  // ErrorBoundary
  "orders.error.title": "Terjadi kesalahan",
  "orders.error.text": "Silakan muat ulang halaman.",
  "orders.error.reload": "Muat ulang",
} as const;

export const en = {
  "orders.status.pending": "Waiting for payment",
  "orders.status.underpaid": "Underpaid",
  "orders.status.paid": "Paid",
  "orders.status.paidFull": "Paid in full",
  "orders.status.expired": "Expired",
  "orders.status.cancelled": "Cancelled",

  "orders.common.backHome": "Back to home",
  "orders.common.notFoundTitle": "Order not found",
  "orders.common.topup": "Create top-up code",
  "orders.common.shortBy": "{amount} short",
  "orders.common.topupFailed": "Couldn't create the top-up code.",
  "orders.common.topupUnavailable": "A top-up can't be created. Please reload the page.",

  "orders.thanks.loading": "Loading",
  "orders.thanks.notFoundText": "This link isn't valid for this session.",
  "orders.thanks.topupExists": "A top-up code already exists. Please contact the admin.",
  "orders.thanks.titlePaid": "Payment received",
  "orders.thanks.titleQris": "QRIS payment",
  "orders.thanks.codeLabel": "Order code:",
  "orders.thanks.payExactly": "Pay exactly",
  "orders.thanks.thanksNote": "Thank you! We're getting your order ready.",
  "orders.thanks.received": "Received {paid} of {total} — {rest} remaining",
  "orders.thanks.contactAdmin": "Or contact the admin for help.",
  "orders.thanks.qrAlt": "Serenity QRIS payment code",
  "orders.thanks.step1": "Scan the QRIS code above with your e-wallet or mobile banking app (GoPay, OVO, DANA, your bank, etc.).",
  "orders.thanks.step2a": "Enter",
  "orders.thanks.step2b": "exactly {amount}",
  "orders.thanks.step2c": ". A different amount makes your order hard to confirm.",
  "orders.thanks.step3a": "Finish paying, then wait. The status changes to",
  "orders.thanks.step3b": "once the transaction is verified (about 5–30 minutes).",
  "orders.thanks.saveNote": "Keep this page open or note down your order code to confirm later.",

  "orders.status.loading": "Loading status",
  "orders.status.title": "Order Status",
  "orders.status.codeLabel": "Code:",

  "orders.history.title": "Order History",
  "orders.history.filterLabel": "Filter by status",
  "orders.history.all": "All",
  "orders.history.loading": "Loading history",
  "orders.history.errorTitle": "Couldn't load your history",
  "orders.history.errorGeneric": "Something went wrong",
  "orders.history.retry": "Try again",
  "orders.history.emptyTitle": "No orders yet",
  "orders.history.emptyText": "Orders placed from this device will show up here.",
  "orders.history.viewMenu": "View menu",
  "orders.history.donation": "Donation approved",
  "orders.history.paidAmount": "Paid {amount}",
  "orders.history.payRest": "Pay the rest",
  "orders.history.track": "Track",

  "orders.notfound.title": "Page not found",
  "orders.notfound.text": "Oh no, the toast got burnt! Error 404 — the page you're looking for doesn't exist or has moved.",

  "orders.error.title": "Something went wrong",
  "orders.error.text": "Please reload the page.",
  "orders.error.reload": "Reload",
} satisfies Record<keyof typeof id, string>;
