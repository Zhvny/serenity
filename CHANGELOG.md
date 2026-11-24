# CHANGELOG.md — Riwayat Perubahan

Semua perubahan signifikan pada proyek **Serenity (Healthy Pre-Order)** akan didokumentasikan dalam file ini.

Format berdasarkan [Keep a Changelog](https://keepachangelog.com/en/1.0.0/):

- `Added` untuk fitur baru
- `Changed` untuk perubahan pada fitur yang sudah ada
- `Deprecated` untuk fitur yang akan dihapus
- `Removed` untuk fitur yang sudah dihapus
- `Fixed` untuk perbaikan bug
- `Security` untuk perbaikan terkait keamanan

---

## [1.0.0] - 30-09-2026:10.58.36.428

### Added
- Menu Page dengan tiga kategori: Makanan Sehat, Dessert Sehat, Minuman Sehat (filter kategori + tag, sinkron URL)
- Product Details — informasi nutrisi lengkap (kalori, protein, karbo, lemak, serat, gula) + informasi alergen + tambah ke keranjang
- Cart Page — daftar item (foto, stepper qty 1–10, catatan, hapus), Subtotal + Total, mode Instant / Scheduled (tanggal ≥ besok + slot 12:00/15:00/18:00/21:00), checkout ke `/cart/checkout` (tanpa UI payment)
- Header badge jumlah item riil dari `GET /cart` (refresh via event `cart:changed`) + route `/cart`
- Backend Node + Hono + TS: `GET /categories`, `GET /products`, `POST /cart/add`, `GET /cart`, `PUT /cart/items/:item_id`, `DELETE /cart/items/:item_id`, `POST /cart/checkout`, `/orders`, `/payment/*` (termasuk rate-limit, audit)
- Frontend Vite + React + router + Vitest (Menu/Detail/Cart, 26 tes PASS)
- DB migrasi (`001_init_schema.sql`) + seed 5 produk (`seed_dev.sql`, `seed_dev_02.sql`), smoke riil PASS

### Security
- Tidak ada cross-contamination note dalam desain, database, atau API — proses alergen/non-alergen sudah terpisah secara higienis
- Semua environment variables (`IPAYMU_SERVER_KEY`, `DATABASE_URL`) wajib menggunakan file `.env` — tidak boleh disimpan dalam kode sumber

### Breaking Changes
- Tidak ada (rilis pertama)

---

## [1.0.1] - 30-09-2026:11.47.30.853

### Added
- Opsi pengiriman Gosend (tanpa API): toggle `Ambil sendiri`/`Diantar` di CartPage + textarea `Alamat pengiriman` (validasi inline min 10 char, maks 500) + warning box verbatim biaya Gosend (`#D4A843`)
- Backend: `delivery_method`/`delivery_address` di `POST /orders` + `POST /cart/checkout` (aturan `INVALID_ADDRESS`, default `pickup`), tipe `Order` + `DeliveryMethod`, migrasi `002_delivery.sql` (+ down)

---

## [1.1.0] - 04-10-2026:21.16.11.292

### Added
- Dunia visual pixel-bakery (menang atas Supabase-putih): token efektif `theme-pixel.css` + 5 `theme-bakery-*.css`, sistem Sprite ASCII→SVG (`src/pixel/`), suara/fx + `SoundToggle`
- LandingPage `/` (hero + Rekomendasi + Bacaan pilihan + popup need) + split `/menu` = MenuPage
- HistoryPage `/riwayat` (per-session `cart_id`, semua status) + `GET /orders/mine`
- FunFactPage `/funfact` + PostDetailPage `/posts/:id` + editor Post di admin (excerpt, tag Research, produk saran, live preview)
- Trending post per-tag (`GET /posts/trending`) + `POST /posts/:id/view` idempoten per session
- Preferensi multi-need (`PUT/GET /preferences {needs}`) + rekomendasi 1-per-need + best-seller (`GET /products/recommendations`)
- i18n Indonesia/Inggris 7 area kamus + `useT()` semua page publik (AdminPage tetap Indonesia)
- Seed demo: products (`prod_006`–`008`), posts (6, semua kombinasi), orders (11 status)
- Filter admin Kedaluwarsa/Dibatalkan; migrasi 008–015 (koordinat, fulfilment, top-up, posts, personalisasi, multi-need)
- `.gitattributes` (`*.sql` LF) agar checksum migrasi stabil di Windows
- Dialog persetujuan "Izin lokasi" sebelum geolocation di `LocationPicker` (tujuan + data, Setuju/Batal; id/en)

### Changed
- Pembayaran iPaymu/Midtrans → QRIS semi-otomatis (`generate-code` + `mark-paid` SOP manual; underpaid + top-up, overpay = donasi)
- Kontrak preferensi `{need}` → `{needs: Need[]}`; hero copy Inggris; section "Terbaru" landing dibuang
- PRD/ROADMAP: riwayat, rekomendasi rule-based, dan multi-bahasa keluar dari Won't-Have → Shipped

### Fixed
- Checksum migrasi 011–013 rusak oleh CRLF Windows
- 6 temuan review trending: method PUT preferensi, rekomendasi full-row, validasi UUID view, cookie view, fallback need basi, double-mount route
- 19 string copy id/en (tata bahasa)

### Removed
- Endpoint `/payment/*`, webhook, signature iPaymu/Midtrans; kolom `midtrans_transaction_id` mati (tak dibaca code)

### Planned (Add-on — Pendekatan B dan seterusnya)
- Payment UI (iPaymu embedded) — API `/payment/*` sudah ada, UI belum
- Confirmation — nomor pesanan, status pesanan (diproses → siap → dikirim/diambil)
- Status Tracking — timeline status pesanan
- Calorie Tracker (diet) — input harian, perbandingan target vs konsumsi
- Meal Plan Builder + Protein Target (atlet) — rencana mingguan, rekomendasi porsi
- Riwayat pesanan pengguna
- Notifikasi status pesanan (email atau in-app)
- Filter dan sorting lebih lengkap untuk Menu Page
- Subscription / Meal Kit — order rutin harian atau mingguan
- Loyalty / Reward program

### Never Do (Tetap Berlaku untuk Semua Versi)
- Jangan mengganti iPaymu dengan gateway pembayaran lain tanpa persetujuan eksplisit
- Jangan menambahkan catatan cross-contamination — proses sudah terpisah higienis
- Jangan mengubah stack (Vite + React / Node + Hono + TS / PostgreSQL) tanpa persetujuan eksplisit
- Jangan mulai implementasi sebelum dokumen desain (`DESIGN.md`) dan spesifikasi (`SPEC.md`) disetujui

---

## [Unreleased]

### Added
- Migrasi 026 (`026_real_menu_catalog.sql`): katalog produk riil Serenity (Peanut Butter Chocolate Bar `prod_pb_bar` Rp 18.000 & Roasted Milk Tea 300ml `prod_roasted_milktea` Rp 24.000) lengkap dengan nutrisi dan alergen, serta menonaktifkan sampel produk dev (`samp_001` - `samp_005`).

### Changed
- Halaman pembayaran Thanks: tampilan QRIS diganti menjadi Box Informasi Transfer Rekening Bank BCA (a.n. Fransiskus Xaverius Kevin, No. Rek: 7615560677) lengkap dengan tombol salin (copy to clipboard) dan instruksi transfer.

### Fixed
- Keamanan rekomendasi alergi: saat kebutuhan `allergy_free` dipilih, produk pengisi (`bestSellers`) dan need pendamping dijamin mengecualikan produk yang memiliki relasi di `product_allergens`.
- Informasi pengiriman di Thanks & Riwayat: `GET /thanks` dan `GET /orders/mine` kini mengembalikan `mode`, `scheduled_at`, `delivery_method`, dan `delivery_address` sehingga halaman Thanks dan Riwayat dapat menampilkannya.
- `GET /orders/mine` tanpa sesi: mengembalikan status 200 dengan `data: []` (bukan 404), mencegah error view pada pengunjung baru.
- Pelonggaran rate limit baca: `LIMITS.GET` dinaikkan menjadi 120/menit per IP untuk mencegah 429 pada SPA dan jaringan bersama (NAT kampus/kantor).
- Dual-channel cart session (`x-cart-id` + cookie): mengatasi pemblokiran third-party cookie browser pada arsitektur cross-origin (SWA `azurestaticapps.net` -> CA `azurecontainerapps.io`). Backend kini membaca header `x-cart-id` sebelum cookie, mengekspos header via CORS `exposeHeaders`, dan frontend otomatis menyimpan `cart_id` ke `localStorage` serta menyertakannya pada semua request cart/checkout sehingga item keranjang tidak lagi hilang/0.

### Added
- Turnstile Cloudflare di checkout (opsi A + paket grill): `generate-code` wajib `turnstile_token` (verifikasi server, fail-open hanya saat network error + log `turnstile_failopen`), honeypot `website`, throttle sesi (max 3 pending + jeda 30 dtk → 429); widget render setelah consent, pesan blocker 10 dtk, arahan Riwayat saat token bekas
- `addItem` serial per cart (advisory lock + transaksi; tutup lost-update klik/paralel)
- Origin-check mutasi publik (anti CSRF lintas-situs; `SameSite=None` dipertahankan untuk direct mode)
- Ember global `generate-code` 30/mnt DB (tutup rotasi sesi; Turnstile tetap 1 solve/order)
- Rate-limit fallback memori per-replika saat Redis mati (tutup fail-open total)
- Login admin 401 seragam anti-oracle (kunci internal tetap jalan) + scrypt async + cap password 256
- Internal-key timing-safe + respons `PUT status` minimal tanpa PII
- Validasi admin diketatkan (cap panjang, `image_url` tolak `javascript:`)
- `TURNSTILE_STRICT` darurat (flip fail-closed via env), sanitasi CRLF/ANSI log path
- `encodeURIComponent` id produk di link kartu + hero menu
- TLS DB strict (`rejectUnauthorized: true`) + pesan validasi generik anti gema-zod
- Bersih audit: `probe-x` dihapus, `.env` di-scrub placeholder, `TURNSTILE_STRICT=true` live, `remoteip` scoring + counter `generate_global_throttled`
- Konten dwibahasa produk & post (kolom `*_en`, migrasi 016 + backfill EN): toggle bahasa mengganti nama/deskripsi produk + judul/isi/ringkasan post, fallback Indonesia; input Inggris opsional di form admin produk + post
- CRUD post admin (list + edit + hapus, audit `update_post`/`delete_post`); badge "EN kurang" + "Seed" di daftar
- Gambar di kartu Rekomendasi (`ProductPhoto`) + Bacaan pilihan; layout suggested-product 4:3
- Dialog persetujuan lokasi sebelum geolocation; countdown consent berdetak per detik
- `settle_info` di detail admin (syarat Lunaskan jujur); `source` produk (`seed_dev`/`admin`, migrasi 017); CHECK `body_en` + backfill desc (019)
- Script `scripts/seed.js` (katalog ikut job migrasi deploy)
- Arsip lunak post (`deleted_at`, migrasi 020): hapus = arsip + audit, tab Arsip + Kembalikan di admin, publik 404 total
- `Idempotency-Key` di endpoint create (`POST /orders`, `/orders/generate-code`, `/orders/:code/topup`, migrasi 021): retry/timeout replay 200 identik tanpa order ganda; klaim bersamaan 409 `IDEMPOTENT_RETRY`; TTL 24 jam
- `backend/scripts/migrate-prod.ps1`: migrasi prod manual dari laptop tanpa secret di GitHub — password role migrate via prompt tersembunyi, firewall sementara dibuka lalu ditutup otomatis (finally), jalankan `migrate.js` + `seed.js` idempoten

### Changed
- ID contoh produk `prod_001–008` → `samp_001–008` di semua seed + test + contoh (migrasi data 018; DB dev sudah disiram, FK utuh)

### Fixed
- `listMine` tak sertakan `id`/`unique_code` (topup/lacak `/undefined`); "Bayar sisa" lanjutkan anak pending (kasus back + 409); teks consent 14px ink; layout suggested-product (4:3 + placeholder isi)
- Cookie `admin_session`/`cart_id`/`csrf_token` jadi `SameSite=None; Secure` (direct mode SWA→CA lintas-origin; fallback link linked-backend yang 500 persisten)
- Tipe `calls` test AdminPage tab Post PUT/DELETE (string[], `tsc --noEmit` CI hijau)
- `scripts/run-tests.js` `flushRateLimit` tak lagi hang saat Redis mati (`retryStrategy: () => null` + race timeout + `disconnect()`), runner selalu selesai
- `scripts/migrate-prod.ps1` batal di langkah migrasi karena `$ErrorActionPreference='Stop'` memperlakukan stderr native (warning SSL pg) sebagai fatal: kini `Continue` + cek `$LASTEXITCODE` eksplisit, `sslmode=verify-full` (hilangkan warning), gagal tutup firewall → `Write-Warning` mencolok
- `scripts/migrate-prod.ps1` gagal cepat dengan pesan jelas bila stdin dialihkan (pipe/CI/agent) alih-alih menggantung diam-diam di prompt `Read-Host -AsSecureString`
- Migrasi 022: `GRANT` DML `idempotency_keys` ke `serenity_app`/`serenity_migrate` — `POST /orders` (+2 endpoint idempoten lain) 500 `permission denied` di prod karena 021 di-apply via `serenity_admin` (default-privileges migrate tak jalan); lokal hijau karena superuser. Terverifikasi live: replay key sama → 200 + `order_id` identik tanpa order ganda; 022 di-apply sebagai admin (pemilik tabel; role migrate tak bisa GRANT objek milik admin)
- Ongkir tunai opsi B (migrasi 023 `delivery_fee`): admin input manual di detail order delivery (`POST /admin/orders/:code/delivery-fee`, audit `set_delivery_fee`); QRIS tak tersentuh; customer lihat ekspektasi di cart + baris ongkir di riwayat; tombol Bayar di riwayat pending → `/thanks?ref=` (QR tak hilang setelah kembali)
- Rotasi kredensial prod pasca-deploy (PG admin, role app/migrate, KV + CA secrets, hash admin, ACR key); runbook di-scrub dari secret asli
- `/admin*` publik → 403 (SWA routes); UI admin jalan lokal (`VITE_API_URL=<CA>/api/v1 npm run dev` → `localhost:5173/admin`); `FRONTEND_ORIGIN` dukung daftar koma
- Foto produk 404 di live: `frontend/public/images/*.jpg` di-ignore `.gitignore` sehingga build CI/SWA tak pernah memuatnya. 5 foto asli produk seed (`samp_001–005.jpg`, JPEG 474–1536 px) dikirim lewat repo + pengecualian `!frontend/public/images/samp_00*.jpg`; `image_url` prod sudah cocok, tanpa perubahan DB
- "Tak bisa akses lokasi" di desktop (`LocationPicker`): permintaan lokasi tak lagi memaksa `enableHighAccuracy: true` (desktop tanpa GPS gagal bila akurasi tinggi diminta; hasil kasar sudah ditangani `shop.map.coarse`), dan pesan `role="alert"` dibedakan per kode error — `shop.map.geoDenied` (izin situs ditolak), `shop.map.geoUnavailable` (layanan lokasi mati/tak tersedia), `shop.map.geoTimeout` (waktu habis), `shop.map.geoerror` tetap fallback. Terverifikasi runtime browser: 5 skenario (sukses + 3 kode error + tanpa provider)
- Peta abu-abu di live = tile OSM ditolak **403 "Access Blocked"**: `globalHeaders` SWA memasang `Referrer-Policy: no-referrer` sehingga tile dikirim tanpa Referer (Tile Usage Policy OSM: "You must not: set a restrictive Referrer-Policy", "referer-stripping … may be blocked without notice"). Header jadi `strict-origin-when-cross-origin`; URL tile jadi `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (tanpa subdomain `{s}`) + atribusi `© OpenStreetMap contributors` bertaut ke halaman copyright
- Peta menimpa dialog notifikasi/izin (`.need-popup` & `.site-header`): Leaflet menginjeksi z-index internal tinggi (200–1000) yang bocor ke root document. `.map-canvas` kini dikurung dengan `isolation: isolate; position: relative; z-index: 0;`, dan `.need-popup` dinaikkan ke `z-index: 500` sehingga dialog notifikasi dan header selalu bersih berada di atas peta.
- Lebar kartu rekomendasi & bacaan LandingPage match-parent: `.facts-grid` di `theme-bakery-layout.css` diubah dari `repeat(auto-fill, ...)` ke `repeat(auto-fit, ...)` sehingga kartu membentang proporsional memenuhi lebar kontainer 1200px tanpa menyisakan kolom kosong di kanan saat item berjumlah 3.
- Reset posisi scroll ke header saat pindah halaman (`ScrollToTop`): SPA React Router tidak mereset scroll window otomatis saat navigasi rute, menyebabkan halaman baru di mobile/desktop sempat terbuka di posisi scroll bawah (dekat footer) dari halaman sebelumnya. Ditambahkan komponen `ScrollToTop` di `App.tsx` yang memanggil `window.scrollTo(0, 0)` setiap kali `pathname` rute berubah.
- Footer minimalis tanpa kategori di semua halaman: bagian kategori di Footer dihapus sepenuhnya di seluruh halaman (termasuk MenuPage) sehingga footer tampil konsisten, ringkas, dan fokus pada navigasi utama (Menu, Fun Fact, Keranjang) serta identitas brand. Tautan kategori tetap aktif di Header dengan navigasi langsung ke container `#menu`.
- Rasio foto kartu rekomendasi & bacaan LandingPage seragam 4:3: `.fact-photo` dan `img.fact-photo` di `theme-bakery-layout.css` diberi `aspect-ratio: 4 / 3; object-fit: cover;` agar kartu rekomendasi memiliki tinggi foto yang identik dan presisi meski gambar asli memiliki orientasi/dimensi berbeda.
- Admin pembatalan pesanan (`POST /admin/orders/:code/cancel`): admin dapat membatalkan pesanan yang belum selesai (`pending_payment`, `underpaid`, `paid`, `preparing`, `ready`) dengan tombol "Batalkan Pesanan" di panel detail pesanan, konfirmasi sebelum aksi, pembaruan status atomik di DB, dan pencatatan audit log `cancel_order`.
- Pelonggaran timeout lokasi desktop: batas waktu permintaan lokasi di `LocationPicker` dinaikkan dari 10s ke 20s serta mengizinkan cache posisi 1 menit (`maximumAge: 60000`) agar provider jaringan desktop tidak mudah gagal sebelum sempat mengembalikan koordinat.

### Added
- Fallback lokasi IP (`ipwho.is`) saat geolocation browser timeout atau tidak tersedia (bukan saat izin ditolak): pin peta otomatis pindah ke perkiraan kota, `accuracy=3000`, pesan `shop.map.ipFallback` mengingatkan pengguna untuk geser pin ke titik tepat. Jika IP lookup juga gagal, pesan error asli tetap ditampilkan.
- Cookie `cart_id` persisten 90 hari sliding expiration (`Max-Age=7776000`): setiap interaksi (add/get/update/delete cart, checkout, orders/mine, thanks, post view, preferences, generate-code) me-refresh umur cookie. Helper `setCartCookie()` dan `cartIdOf()` diekspor dari `cart.ts`, menggantikan duplikasi di `orders.ts`, `qris.ts`, `posts.ts`, `recommend.ts`.

## [1.2.1] - 25-11-2026:00.15.00.000

### Added
- Fitur input alasan pembatalan pesanan di dashboard Admin (`orders.cancel_reason`, audit log `cancel_order`) dan tampil di halaman Riwayat serta Status pelanggan.
- Fitur bukti foto/struk ongkir kurir (`orders.delivery_receipt_url` di `POST /admin/orders/:code/delivery-fee`) dengan tautan bukti di halaman Riwayat & Status order delivery.
- Tiga artikel edukasi & produk baru (migrasi 029):
  1. *Heboh Isu Stevia Palsu: Komitmen Serenity Gunakan Ekstrak Alami Murni* (embed `prod_roasted_milktea`).
  2. *Energi Bersih Bebas Gluten: Rahasia di Balik Peanut Butter Chocolate Bar* (embed `prod_pb_bar`).
  3. *Roasted Milk Tea: Kenikmatan Creamy Teh Sangrai Tanpa Beban Gula* (embed `prod_roasted_milktea`).

### Changed
- Jam slot pengambilan pesanan terjadwal dibatasi dari jam 9 pagi hingga 5 sore (`09:00`, `11:00`, `13:00`, `15:00`, `17:00`).
- Tampilan nomor antrian harian di Riwayat diberi jarak dan pill badge terpisah (`.history-meta-row`, `.queue-no--small`) agar tidak bertumpuk dengan tanggal/kode order.

---

## [1.2.0] - 24-11-2026:20.45.00.000

### Added
- Form kontak pemesan (nama lengkap & nomor WhatsApp Indonesia) saat checkout (`/cart/checkout`), dinormalisasi otomatis ke format `628...`, tersimpan di kolom baru `orders.customer_name` dan `orders.customer_phone` (migrasi 027).
- Nomor antrean pesanan harian (#001, #002, dst.) diekstraksi dari id order harian dan ditampilkan pada halaman Thanks, Status, Riwayat, dan Admin.
- Tautan direct WhatsApp (`wa.me`) di detail pesanan Admin untuk mempermudah konfirmasi transfer bank manual.
- Halaman Tanya Jawab (`/faq`) dan stepper visual status pesanan (`OrderStepper`).
- Foto baru `osmanthus-milktea.jpg` (es teh susu roasted polos di gelas tanpa topping).
- Migrasi 028 (`028_real_menu_prices.sql`): pembaruan harga menu riil Peanut Butter Chocolate Bar (Rp 45.000) dan Roasted Milk Tea 300ml (Rp 35.000) serta deaktifasi produk sampel.

### Changed
- Metode pembayaran beralih ke Transfer Bank BCA manual (a.n. Fransiskus Xaverius Kevin, No. Rek: 7615560677) lengkap dengan tombol salin rekening dan panduan transfer.

---

## Format Versi

Versi mengikuti [Semantic Versioning](https://semver.org/):

- `MAJOR.MINOR.PATCH`
- `MAJOR` — perubahan yang tidak kompatibel dengan versi sebelumnya
- `MINOR` — penambahan fitur baru yang kompatibel
- `PATCH` — perbaikan bug yang kompatibel

Contoh: `1.0.0` (rilis pertama), `1.1.0` (fitur baru, kompatibel), `2.0.0` (perubahan besar, tidak kompatibel).
