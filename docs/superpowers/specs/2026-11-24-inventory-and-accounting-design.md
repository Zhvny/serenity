# Spesifikasi Desain: Manajemen Stok Bahan Baku & Akuntansi Otomatis Serenity

Dokumen desain arsitektural untuk dua subsistem baru di platform Serenity:
1. **Manajemen Bahan Baku & Resep Produk (Inventory & BOM)**
2. **Kasir Cepat & Akuntansi Otomatis (POS & Automated Accounting)**

Tanggal: 2026-11-24  
Status: Draft Menunggu Review Pengguna  

---

## 1. Latar Belakang & Tujuan

### Masalah yang Diselesaikan:
- **Ketiadaan Visibilitas Bahan**: Saat ini sistem hanya mencatat produk jadi (`prod_pb_bar`, `prod_roasted_milktea`). Jika persediaan susu Greenfields atau botol 300ml habis, sistem tetap menerima pesanan yang berujung pembatalan manual mengecewakan pelanggan.
- **Pencatatan Keuangan Manual**: Pengeluaran operasional dan belanja bahan baku masih tercatat manual di folder struk belanja lokal. Admin tidak memiliki visibilitas otomatis mengenai Harga Pokok Penjualan (HPP / COGS), Laba Kotor, Laba Bersih, dan Titik Impas (BEP) secara harian maupun bulanan.
- **Pelanggan Walk-In**: Belum ada antarmuka kasir cepat bagi pembeli yang datang langsung ke toko fisik/stan tanpa melalui checkout web publik.

### Tujuan Sistem:
1. Melacak stok bahan baku berbasis resep produk (*Bill of Materials*). Stok terpotong otomatis saat pesanan dinyatakan lunas (`paid`) dan dikembalikan jika pesanan dibatalkan (`cancelled`).
2. Antarmuka Kasir Cepat (*Quick POS*) untuk pesanan langsung di tempat.
3. Pencatatan pengeluaran operasional (*Opex*) terstruktur beserta unggah foto bukti struk belanja.
4. Laporan keuangan terpadu (*Financial Dashboard*): Omset, HPP riil, Laba Kotor, Laba Bersih, dan Break-Even Point (BEP) otomatis dengan opsi ekspor CSV.

---

## 2. Subsistem 1: Manajemen Stok Bahan Baku & Resep (Inventory & BOM)

### 2.1 Skema Basis Data

```sql
-- 1. Master Bahan Baku
CREATE TABLE ingredients (
  id VARCHAR(50) PRIMARY KEY, -- misal: 'ing_milk', 'ing_tea', 'ing_stevia', 'ing_bottle_300ml'
  name VARCHAR(100) NOT NULL,
  unit VARCHAR(20) NOT NULL, -- 'ml', 'gram', 'pcs'
  stock_qty NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  min_threshold NUMERIC(12, 2) NOT NULL DEFAULT 0, -- batas peringatan stok menipis
  cost_per_unit NUMERIC(12, 2) NOT NULL DEFAULT 0, -- harga beli per satuan (untuk kalkulasi HPP)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Resep Produk (Bill of Materials)
CREATE TABLE recipe_items (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id VARCHAR(50) NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity_required NUMERIC(10, 2) NOT NULL CHECK (quantity_required > 0),
  UNIQUE(product_id, ingredient_id)
);

-- 3. Riwayat Mutasi Stok
CREATE TABLE stock_mutations (
  id BIGSERIAL PRIMARY KEY,
  ingredient_id VARCHAR(50) NOT NULL REFERENCES ingredients(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('in_purchase', 'out_order', 'rollback_cancel', 'adjustment')),
  qty_delta NUMERIC(12, 2) NOT NULL, -- positif = bertambah, negatif = berkurang
  balance_after NUMERIC(12, 2) NOT NULL,
  ref_code VARCHAR(100), -- order_id atau id pengeluaran belanja
  notes TEXT,
  actor VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_mutations_ing ON stock_mutations(ingredient_id, created_at DESC);
```

### 2.2 Seed Resep Standar Serenity

1. **Roasted Milk Tea (300ml)** (`prod_roasted_milktea`):
   - `ing_tea`: 15 gram (Teh Hitam Sangrai)
   - `ing_milk`: 200 ml (Susu Segar Greenfields)
   - `ing_stevia`: 2 ml (Ekstrak Daun Stevia Murni)
   - `ing_bottle_300ml`: 1 pcs (Botol PET Food-Grade 300ml)
2. **Peanut Butter Chocolate Bar** (`prod_pb_bar`):
   - `ing_oats`: 40 gram (Rolled Oats Panggang)
   - `ing_peanut_butter`: 30 gram (Selai Kacang Murni)
   - `ing_dark_choco`: 25 gram (Dark Chocolate Premium)
   - `ing_wrapper`: 1 pcs (Kemasan Snack Bar Food-Grade)

### 2.3 Logika Bisnis & Transaksi Stok

- **Pemotongan Otomatis (Saat Order `paid`)**:
  - Saat `POST /admin/orders/:code/mark-paid` atau webhook settlement berhasil mengubah status menjadi `paid`, sistem mengambil daftar item pesanan dari `order_items`.
  - Melakukan `SELECT stock_qty FROM ingredients WHERE id = ... FOR UPDATE` untuk mencegah *race condition*.
  - Mengurangi `stock_qty` sebanyak `quantity * quantity_required`.
  - Mencatat mutasi bertipe `'out_order'`.
- **Pengembalian Otomatis (Saat Order `cancelled`)**:
  - Jika pesanan yang dibatalkan sebelumnya sudah sempat berstatus `paid`, `preparing`, atau `ready`, sistem secara atomik mengembalikan kuantitas bahan baku dan mencatat mutasi bertipe `'rollback_cancel'`.
- **Peringatan Stok Menipis**:
  - Jika `stock_qty <= min_threshold`, indikator di dashboard admin berubah menjadi kuning/merah dan memberi peringatan.

### 2.4 API Endpoints Inventory

- `GET /api/v1/admin/ingredients` — Daftar semua bahan baku, jumlah stok, status threshold, dan HPP per unit.
- `POST /api/v1/admin/ingredients` — Tambah master bahan baku baru.
- `PUT /api/v1/admin/ingredients/:id` — Ubah data bahan baku (nama, threshold, unit, cost).
- `POST /api/v1/admin/ingredients/:id/adjust` — Penyesuaian stok manual / restock belanja (input `qty_add`, `cost_per_unit`, `notes`).
- `GET /api/v1/admin/products/:id/recipe` — Ambil rincian resep produk.
- `PUT /api/v1/admin/products/:id/recipe` — Atur daftar bahan dan takaran per produk.

---

## 3. Subsistem 2: Kasir POS Cepat & Akuntansi Otomatis

### 3.1 Skema Basis Data Keuangan

```sql
-- 1. Pengeluaran Operasional / Belanja Bahan (Opex)
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category VARCHAR(50) NOT NULL CHECK (category IN ('raw_material', 'packaging', 'operational', 'transport', 'marketing', 'other')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  vendor VARCHAR(100),
  receipt_image_url VARCHAR(500), -- foto nota/struk belanja
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);

-- 2. Buku Kas & Entri Jurnal Keuangan (Accounting Ledger)
CREATE TABLE accounting_entries (
  id BIGSERIAL PRIMARY KEY,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('revenue', 'cogs', 'expense')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  ref_type VARCHAR(50) NOT NULL, -- 'order', 'expense'
  ref_id VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounting_entries_date ON accounting_entries(entry_date DESC);
```

### 3.2 Alur Kasir Cepat (Quick POS Cashier)

- **Layar Kasir di Admin (`/admin?tab=cashier`)**:
  - Menampilkan grid menu dengan foto & harga.
  - Kasir klik item untuk memasukkan ke keranjang cepat, atur jumlah.
  - Masukkan nama pembeli & metode bayar:
    - **Tunai (Cash)**: Langsung dibuatkan pesanan dengan status `paid` (lunas).
    - **Transfer BCA**: Tampilkan rekening & QR, admin konfirmasi saat mutasi masuk.
  - Sistem otomatis membuat `orders` dengan flag `mode = 'instant'`, `delivery_method = 'pickup'`, memotong stok bahan baku resep, dan mencatat pendapatan ke buku kas.
  - Tombol **"Cetak / Bagikan Struk Ringkas"** (struk teks ramah printer thermal 58mm/80mm atau tautan web).

### 3.3 Akuntansi Otomatis & Perhitungan Laba / BEP

1. **Pendapatan Kotor (Gross Revenue)**:
   - Dijumlahkan secara otomatis dari seluruh pesanan `paid` dalam rentang tanggal yang dipilih.
2. **HPP (Harga Pokok Penjualan / COGS)**:
   - Terhitung otomatis saat pesanan dibuat:
     $$\text{HPP Produk} = \sum (\text{Takaran Bahan}_i \times \text{Cost per Satuan}_i)$$
   - Menghasilkan **Laba Kotor (Gross Profit)** = Omset - HPP.
3. **Pengeluaran Operasional (Opex)**:
   - Diambil dari data tabel `expenses`.
4. **Laba Bersih (Net Profit)**:
   $$\text{Laba Bersih} = \text{Laba Kotor} - \text{Total Pengeluaran Operasional}$$
5. **Titik Impas (Break-Even Point / BEP)**:
   - **BEP Nominal (Rp)** = $\frac{\text{Total Biaya Tetap (Fixed Costs)}}{\text{Margin Kontribusi \%}}$
   - **BEP Volume (Porsi Menu)**: Menampilkan berapa botol Roasted Milk Tea dan berapa Peanut Butter Bar yang harus terjual untuk menutupi total biaya bulan berjalan.
6. **Ekspor Laporan**:
   - Ekspor tabel rekap harian/bulanan ke format `.csv` yang kompatibel dengan Microsoft Excel dan Google Sheets.

### 3.4 API Endpoints POS & Accounting

- `POST /api/v1/admin/cashier/order` — Buat pesanan langsung dari kasir POS.
- `GET /api/v1/admin/accounting/summary?month=YYYY-MM` — Ringkasan Laba/Rugi, Total Omset, HPP, Opex, Laba Bersih, dan BEP.
- `GET /api/v1/admin/accounting/export?month=YYYY-MM` — Download rekapitulasi CSV.
- `GET /api/v1/admin/expenses` — Daftar pengeluaran operasional.
- `POST /api/v1/admin/expenses` — Tambah catatan pengeluaran baru beserta URL foto struk.
- `DELETE /api/v1/admin/expenses/:id` — Hapus / batalkan pengeluaran.

---

## 4. Keamanan & Kontrol Integritas

- **Autentikasi & Otorisasi**: Seluruh endpoint inventory, POS, dan akuntansi dilindungi oleh middleware sesi admin (`admin_session`) dan validasi CSRF double-submit token.
- **Konsistensi Mutasi Stok**: Transaksi database Postgres dengan level isolasi atomik (`BEGIN ... COMMIT`) disertai *lock* baris bahan baku agar perhitungan stok bersamaan tidak pernah minus atau hilang (*no lost updates*).
- **Audit Logging**: Setiap penambahan pengeluaran, koreksi stok, dan pembatalan transaksi dicatat permanen di tabel `audit_logs`.

---

## 5. Rencana Tahap Implementasi

1. **Fase 1 (Selesai di sesi ini)**: Bounded tasks (Pemisahan nomor antrian riwayat, alasan pembatalan admin, slot waktu 09-17, bukti foto ongkir, dan penerbitan 3 artikel).
2. **Fase 2 (Setelah Spec Disetujui)**: Migrasi tabel bahan baku (`ingredients`), resep (`recipe_items`), dan mutasi stok (`stock_mutations`) serta UI tab Stok di Admin.
3. **Fase 3**: Migrasi tabel keuangan (`expenses`, `accounting_entries`), modul Kasir POS Cepat, dan Dashboard Laporan Laba/Rugi & BEP otomatis.
