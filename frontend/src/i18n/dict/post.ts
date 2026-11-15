// Kamus area "post" (detail post). Kunci berawalan post.*. Indonesia = teks asli persis; Inggris = terjemahan alami.
export const id = {
  "post.loading": "Memuat post",
  "post.error.title": "Post gagal dimuat",
  "post.error.text": "Ada gangguan sementara. Coba lagi sebentar.",
  "post.notfound.title": "Post tidak ditemukan",
  "post.notfound.back": "Kembali ke Fun Fact",
  "post.back": "← Fun Fact",
  "post.suggested.label": "Produk yang disarankan",
  "post.suggested.eyebrow": "Disarankan",
  "post.suggested.title": "Produk Serenity",
} as const;
export const en = {
  "post.loading": "Loading post",
  "post.error.title": "Couldn't load this post",
  "post.error.text": "There was a temporary problem. Please try again in a moment.",
  "post.notfound.title": "Post not found",
  "post.notfound.back": "Back to Fun Facts",
  "post.back": "← Fun Facts",
  "post.suggested.label": "Suggested products",
  "post.suggested.eyebrow": "Suggested",
  "post.suggested.title": "Serenity products",
} satisfies Record<keyof typeof id, string>;
