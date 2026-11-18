-- 025_cart_checkout.sql -- UP (additif): simpan pilihan waktu & pengambilan dari POST /cart/checkout
-- pada keranjang, agar generate-code memakainya saat membuat order (sebelumnya divalidasi lalu dibuang,
-- sehingga setiap order tercatat 'instant' + 'pickup'). Nullable: keranjang lama/tanpa pilihan -> perilaku lama.
-- PII LOKASI: berisi alamat/koordinat pengiriman; dihapus (NULL) saat order terbentuk, sama perlakuan dengan orders.delivery_*.
ALTER TABLE carts ADD COLUMN IF NOT EXISTS checkout_choice JSONB;
