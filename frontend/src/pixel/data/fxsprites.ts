import type { Sprite } from "../types.ts";

// Partikel efek kecil: kilau, hati, remah, asap, koin, konfeti.

// Satu ledakan kilau tiga frame: plus kecil -> bintang 4 titik -> cincin titik.
export const SPARKLE_BURST_1: Sprite = {
  name: "sparkle-burst-1",
  rows: [
    "..y..",
    "..y..",
    "yywyy",
    "..y..",
    "..y..",
  ],
};

export const SPARKLE_BURST_2: Sprite = {
  name: "sparkle-burst-2",
  rows: [
    "....y....",
    "....y....",
    "...yyy...",
    "..yywyy..",
    "yyywwwyyy",
    "..yywyy..",
    "...yyy...",
    "....y....",
    "....y....",
  ],
};

export const SPARKLE_BURST_3: Sprite = {
  name: "sparkle-burst-3",
  rows: [
    "......y......",
    "......y......",
    "..y.......y..",
    ".............",
    ".............",
    ".............",
    "yy....w....yy",
    ".............",
    ".............",
    ".............",
    "..y.......y..",
    "......y......",
    "......y......",
  ],
};

export const HEART_FLOAT: Sprite = {
  name: "heart-float",
  rows: [
    ".pp.pp.",
    "pwppppP",
    "pppppPP",
    ".pppPP.",
    "..pPP..",
    "...P...",
  ],
};

export const CRUMB_A: Sprite = {
  name: "crumb-a",
  rows: [
    "tt.",
    "tbt",
    ".tb",
  ],
};

export const CRUMB_B: Sprite = {
  name: "crumb-b",
  rows: [
    ".tt.",
    "tttb",
    ".bb.",
  ],
};

export const CRUMB_C: Sprite = {
  name: "crumb-c",
  rows: [
    "tt.",
    "tbb",
  ],
};

// Asap: makin besar dan makin pudar; frame terakhir berongga.
export const POOF_1: Sprite = {
  name: "poof-1",
  rows: [
    "...eee...",
    ".eewwwee.",
    "..ewwce..",
    "eewwccsee",
    "ewwccssse",
    "eeccsssee",
    "..essse..",
    ".eesssee.",
    "...eee...",
  ],
};

export const POOF_2: Sprite = {
  name: "poof-2",
  rows: [
    "....eeeee....",
    "..eecccccee..",
    ".eccccccccce.",
    "..eccccccce..",
    "eeccccccccsee",
    "eccccccccssse",
    ".eccccccssse.",
    "eccccccssssse",
    "eeccccsssssee",
    "..eccssssse..",
    ".eccssssssse.",
    "..eesssssee..",
    "....eeeee....",
  ],
};

export const POOF_3: Sprite = {
  name: "poof-3",
  rows: [
    ".....eeeee.....",
    "...eecccccee...",
    "..ecc.....cce..",
    "...ec.....ce...",
    ".ee.........ee.",
    "ecc.........sse",
    "ec...........se",
    ".ec.........se.",
    "ec...........se",
    "ee...........ee",
    "..ec.......se..",
    ".ec.........se.",
    "..ess.....sse..",
    "...eesssssee...",
    ".....eeeee.....",
  ],
};

// Koin berputar: depan -> miring -> sisi -> miring (balik). Tinggi semua 8.
export const COIN_1: Sprite = {
  name: "coin-1",
  rows: [
    "..OOOO..",
    ".OyyymO.",
    "OywmmmYO",
    "OymYYmYO",
    "OymYYmYO",
    "OymmmmYO",
    ".OYYYYO.",
    "..OOOO..",
  ],
};

export const COIN_2: Sprite = {
  name: "coin-2",
  rows: [
    ".OOOO.",
    "OyymYO",
    "OywmYO",
    "OymYYO",
    "OymYYO",
    "OymmYO",
    "OmmmYO",
    ".OOOO.",
  ],
};

export const COIN_3: Sprite = {
  name: "coin-3",
  rows: [
    "OO",
    "yO",
    "mO",
    "yO",
    "mO",
    "yO",
    "mO",
    "OO",
  ],
};

export const COIN_4: Sprite = {
  name: "coin-4",
  rows: [
    ".OOOO.",
    "OYmyyO",
    "OYmwyO",
    "OYYmyO",
    "OYYmyO",
    "OYmmyO",
    "OYmmmO",
    ".OOOO.",
  ],
};

// Konfeti: potongan kertas miring, satu warna + satu piksel lebih terang.
export const CONFETTI_PINK: Sprite = {
  name: "confetti-pink",
  rows: [
    "wp.",
    "pp.",
    ".pp",
    ".pP",
    "..P",
  ],
};

export const CONFETTI_BUTTER: Sprite = {
  name: "confetti-butter",
  rows: [
    "wy.",
    "yy.",
    ".yy",
    ".yY",
    "..Y",
  ],
};

export const CONFETTI_MINT: Sprite = {
  name: "confetti-mint",
  palette: { x: "#8fdcb8", X: "#d3f5e3", z: "#5fb890" },
  rows: [
    "Xx.",
    "xx.",
    ".xx",
    ".xz",
    "..z",
  ],
};

export const CONFETTI_SKY: Sprite = {
  name: "confetti-sky",
  rows: [
    "wn.",
    "nn.",
    ".nn",
    ".nN",
    "..N",
  ],
};
