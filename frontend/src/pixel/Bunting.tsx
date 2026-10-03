import { Sprite } from "./Sprite.tsx";
import { BUNTING_PINK, BUNTING_CREAM, BUNTING_MINT } from "./data/signs.ts";

const FLAGS = [BUNTING_PINK, BUNTING_CREAM, BUNTING_MINT];
const COUNT = 120; // 120 x 36px = 4320px: menutup layar sangat lebar

// Untaian bendera kecil khas toko roti (dekoratif). Lebih dari cukup; sisanya terpotong overflow.
export function Bunting() {
  return (
    <div className="bunting" aria-hidden="true">
      {Array.from({ length: COUNT }, (_, i) => (
        <Sprite key={i} sprite={FLAGS[i % FLAGS.length] ?? BUNTING_PINK} />
      ))}
    </div>
  );
}
