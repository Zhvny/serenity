-- 029_cancel_reason_delivery_receipt_and_posts.sql -- UP: alasan pembatalan, bukti ongkir, dan 3 artikel edukasi Serenity.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_receipt_url VARCHAR(500);

-- 1) Artikel Stevia Palsu & Komitmen Serenity
INSERT INTO posts (
  id, title, excerpt, body, title_en, excerpt_en, body_en, tag, product_id, image_url, product_ids
) VALUES (
  '33333333-3333-3333-3333-333333333331',
  'Heboh Isu Stevia Palsu: Komitmen Serenity Gunakan Ekstrak Alami Murni',
  'Ramai investigasi pemanis stevia viral yang dicampur tanpa transparansi. Bagaimana Serenity menjamin keaslian pemanis rendah kalori kami?',
  'Akhir-akhir ini publik dihebohkan oleh temuan uji laboratorium independen terhadap produk pemanis stevia kemasan (salah satunya kasus merek Beeru) yang diduga tidak murni atau dicampur pemanis lain tanpa pencantuman komposisi yang transparan di label kemasan. Praktik pencampuran dengan maltodextrin atau pemanis sintetis tentu merugikan masyarakat, terutama mereka yang menjaga lonjakan gula darah atau sedang menjalani diet diabetes.

Menanggapi kekhawatiran ini, Serenity menegaskan bahwa seluruh produk minuman kami—termasuk Roasted Milk Tea—hanya menggunakan ekstrak daun Stevia murni (Rebaudioside A) berkualitas farmasi/food-grade dengan sertifikasi resmi BPOM. Kami bermitra langsung dengan pemasok bahan baku terpercaya dengan Certificate of Analysis (CoA) teruji, tanpa tambahan gula pasir, maltodekstrin, maupun pemanis buatan siklamat/sakarin.

Kesehatan Anda adalah prioritas mutlak kami. Nikmati manis alaminya tanpa khawatir lonjakan gula darah!',
  'Controversy on Adulterated Stevia: Serenity Commitment to Pure Natural Sweeteners',
  'Recent lab investigations revealed adulterated commercial stevia brands. Here is how Serenity guarantees 100% genuine sweetener integrity.',
  'Recent public concern arose from lab tests on commercial stevia brands revealing unlisted additives and artificial fillers. For diabetes patients and sugar-conscious individuals, undisclosed fillers like maltodextrin cause dangerous insulin spikes.

At Serenity, we guarantee that all our beverages—including our Roasted Milk Tea—exclusively use 100% pure stevia leaf extract (high-purity Rebaudioside A) certified by BPOM, with full Certificate of Analysis (CoA) verification. We never blend with refined sugar, maltodextrin, or synthetic sweeteners. Pure sweetness, zero health compromise!',
  'Research',
  'prod_roasted_milktea',
  '/images/osmanthus-milktea.jpg',
  ARRAY['prod_roasted_milktea']
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  body = EXCLUDED.body,
  title_en = EXCLUDED.title_en,
  excerpt_en = EXCLUDED.excerpt_en,
  body_en = EXCLUDED.body_en,
  tag = EXCLUDED.tag,
  product_id = EXCLUDED.product_id,
  image_url = EXCLUDED.image_url,
  product_ids = EXCLUDED.product_ids;

-- 2) Artikel Produk Peanut Butter Chocolate Bar
INSERT INTO posts (
  id, title, excerpt, body, title_en, excerpt_en, body_en, tag, product_id, image_url, product_ids
) VALUES (
  '33333333-3333-3333-3333-333333333332',
  'Energi Bersih Bebas Gluten: Rahasia di Balik Peanut Butter Chocolate Bar',
  'Padat nutrisi dari rolled oats panggang, selai kacang murni, dan dark chocolate premium. Camilan lezat pengontrol rasa lapar harianmu.',
  'Mencari camilan yang lezat sekaligus memberi energi berkelanjutan sering kali menjadi tantangan. Kebanyakan snack bar komersial sarat akan sirup fruktosa tinggi dan lemak jenuh yang memicu lonjakan gula serta rasa lemas sesudahnya.

Serenity Peanut Butter Chocolate Bar dirancang khusus dari kombinasi bahan baku utuh (whole foods):
1. Rolled Oats Panggang: Karbohidrat kompleks kaya beta-glukan untuk menjaga rasa kenyang lebih lama.
2. Selai Kacang Alami: Sumber protein nabati dan lemak tak jenuh ganda yang baik untuk kesehatan jantung.
3. Lelehan Dark Chocolate Premium: Antioksidan flavonoid tinggi tanpa lemak trans.

100% bebas gluten, vegan, dan tanpa bahan pengawet sintetik. Pilihan tepat untuk sarapan cepat, bekal kerja, maupun asupan energi sebelum berolahraga!',
  'Clean Energy, Gluten-Free: Inside Our Peanut Butter Chocolate Bar',
  'Packed with wholesome roasted rolled oats, natural peanut butter, and rich dark chocolate. A nutrient-dense snack for clean stamina.',
  'Finding a genuinely healthy snack bar without hidden high-fructose corn syrup is tough. Serenity Peanut Butter Chocolate Bar is crafted strictly from whole ingredients: slow-burning roasted rolled oats, heart-healthy natural peanut butter, and antioxidant-rich premium dark chocolate.

100% vegan, naturally gluten-free, and preservative-free. The ideal fuel for busy mornings, afternoon focus, and pre-workout endurance without any sugar crash.',
  'News',
  'prod_pb_bar',
  '/images/peanut-chocolate-bar.jpg',
  ARRAY['prod_pb_bar']
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  body = EXCLUDED.body,
  title_en = EXCLUDED.title_en,
  excerpt_en = EXCLUDED.excerpt_en,
  body_en = EXCLUDED.body_en,
  tag = EXCLUDED.tag,
  product_id = EXCLUDED.product_id,
  image_url = EXCLUDED.image_url,
  product_ids = EXCLUDED.product_ids;

-- 3) Artikel Produk Roasted Milk Tea
INSERT INTO posts (
  id, title, excerpt, body, title_en, excerpt_en, body_en, tag, product_id, image_url, product_ids
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'Roasted Milk Tea: Kenikmatan Creamy Teh Sangrai Tanpa Beban Gula',
  'Aroma smoky karamel alami daun teh sangrai berpadu susu segar dan stevia nol kalori. Manis menyegarkan, aman untuk gula darah.',
  'Suka milk tea tapi khawatir dengan kandungan gula cairnya yang tinggi? Rata-rata segelas milk tea boba di pasaran mengandung 35 hingga 50 gram gula—melebihi batas harian yang disarankan WHO.

Serenity Roasted Milk Tea (300ml) hadir sebagai solusi elegan. Kami memanggang daun teh hitam pilihan dengan teknik slow-roast khusus untuk mengeluarkan aroma karamel alami dan rasa smoky yang lembut. Teh ini kemudian diseduh segar dan dipadukan dengan susu segar Greenfields serta pemanis alami Stevia nol kalori.

Hasilnya? Tekstur creamy yang memanjakan lidah, rasa manis yang pas dan bersih, dengan kalori terkontrol (hanya 140 kkal per botol 300ml). Pilihan menyegarkan untuk memanjakan diri setiap hari!',
  'Roasted Milk Tea: Creamy Artisanal Pleasure Without the Sugar Burden',
  'Slow-roasted tea leaves paired with fresh milk and zero-calorie stevia. Indulgent, refreshing, and completely blood-sugar friendly.',
  'Most bubble milk teas contain up to 50 grams of refined sugar per cup. Serenity Roasted Milk Tea (300ml) offers an uncompromising healthy alternative.

We slow-roast premium black tea leaves to bring out natural smoky caramel notes, blended with fresh Greenfields milk and zero-calorie natural stevia. Enjoy silky indulgence with only 140 kcal and zero glycemic spike.',
  'News',
  'prod_roasted_milktea',
  '/images/osmanthus-milktea.jpg',
  ARRAY['prod_roasted_milktea']
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  body = EXCLUDED.body,
  title_en = EXCLUDED.title_en,
  excerpt_en = EXCLUDED.excerpt_en,
  body_en = EXCLUDED.body_en,
  tag = EXCLUDED.tag,
  product_id = EXCLUDED.product_id,
  image_url = EXCLUDED.image_url,
  product_ids = EXCLUDED.product_ids;
