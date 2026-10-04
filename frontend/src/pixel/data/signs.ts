// Signage and decoration: hanging sign board, chalkboard, bunting pennants, price tag, gingham tile.
// One character = one pixel, '.' = transparent. Palette: see ../palette.ts
// SIGN_BOARD / CHALKBOARD / PRICE_TAG faces are intentionally EMPTY: real text is overlaid by the UI.
import type { Sprite } from "../types.ts";

export const SIGN_BOARD: Sprite = {
  name: "sign-board",
  rows: [
    ".......kEk........................kEk.......",
    "........k..........................k........",
    ".......kEk........................kEk.......",
    ".......kEk........................kEk.......",
    ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
    "kttttttttttttttttttttttttttttttttttttttttttk",
    "ktbbbbbbbbbbbbKKbbbbbbbbbbbbbKbbbbbbbbbbbbKk",
    "ktbbbBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBbbbKk",
    "ktEbBttttttttttttttttttttttttttttttttttsbEKk",
    "ktbbBttttttttttttttttttttttttttttttttttsbbKk",
    "ktbbBttttttttttttttttttttttttttttttttttsbbKk",
    "ktbbBttttttttttttttttttttttttttttttttttsbbKk",
    "ktbbBttttttttttttttttttttttttttttttttttsbbKk",
    "ktbbBttttttttttttttttttttttttttttttttttsbbKk",
    "ktbbBttttttttttttttttttttttttttttttttttsbbKk",
    "ktEbBttttttttttttttttttttttttttttttttttsbEKk",
    "ktbbbssssssssssssssssssssssssssssssssssbbbKk",
    "ktbbbbbbbKKbbbbbbbbbbbbbKKbbbbbbbKbbbbbbbbKk",
    "kKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKk",
    ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
  ],
};

export const CHALKBOARD: Sprite = {
  name: "chalkboard",
  palette: {x:"#2f3b36",z:"#3d4b45"},
  rows: [
    "..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
    ".kttttttttttttttttttttttttttttttttttttk.",
    "ktbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbKk",
    "ktbbBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBbbKk",
    "ktbBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxtbKk",
    "ktbBxzzxxxxxxxxxxxxxxxxxxxxxxxxxxzxxtbKk",
    "ktbBxzxzxxxxxxxxxxxxxxxxxxxxxxxxxxzxtbKk",
    "ktbBxxxxzxxxxxxxxxxxxxxxxxxxxxxxxxxxtbKk",
    "ktbBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxtbKk",
    "ktbBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxtbKk",
    "ktbBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxtbKk",
    "ktbBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxtbKk",
    "ktbBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxtbKk",
    "ktbBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxtbKk",
    "ktbBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxtbKk",
    "ktbBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxtbKk",
    "ktbBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxtbKk",
    "ktbBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxtbKk",
    "ktbBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxtbKk",
    "ktbBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxzxtbKk",
    "ktbBxxzxxxxxxxxxxxxxxxxxxxxxxxxxzzxxtbKk",
    "ktbBxxxzxxxxxxxxxxxxxxxxxxxxxxzxxxxxtbKk",
    "ktbbttttttttttttttttttttttttttttttttbbKk",
    "ktbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbKk",
    "ktbbbbbbcwwwwwbbbbbbbbbbbbeeeeeeebbbbbKk",
    "ktbbbbbbcsssssbbbbbbbbbbbbEEEEEEEbbbbbKk",
    ".kKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKk.",
    "..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
  ],
};

export const BUNTING_PINK: Sprite = {
  name: "bunting-pink",
  rows: [
    "bbbbbbbbbbbb",
    ".kkkkkkkkkk.",
    ".kwpppppppk.",
    "..kwppppPk..",
    "..kwppppPk..",
    "..kpppppPk..",
    "...kpppPk...",
    "...kpppPk...",
    "...kpppPk...",
    "....kpPk....",
    "....kpPk....",
    "....kpPk....",
    ".....kk.....",
    ".....kk.....",
  ],
};

export const BUNTING_CREAM: Sprite = {
  name: "bunting-cream",
  rows: [
    "bbbbbbbbbbbb",
    ".kkkkkkkkkk.",
    ".kwccccccck.",
    "..kwccccsk..",
    "..kwccccsk..",
    "..kcccccsk..",
    "...kcccsk...",
    "...kcccsk...",
    "...kcccsk...",
    "....kcsk....",
    "....kcsk....",
    "....kcsk....",
    ".....kk.....",
    ".....kk.....",
  ],
};

export const BUNTING_MINT: Sprite = {
  name: "bunting-mint",
  rows: [
    "bbbbbbbbbbbb",
    ".kkkkkkkkkk.",
    ".kwlllllllk.",
    "..kwllllgk..",
    "..kwllllgk..",
    "..klllllgk..",
    "...klllgk...",
    "...klllgk...",
    "...klllgk...",
    "....klgk....",
    "....klgk....",
    "....klgk....",
    ".....kk.....",
    ".....kk.....",
  ],
};

export const PRICE_TAG: Sprite = {
  name: "price-tag",
  rows: [
    ".....bbbb.....",
    "....b....b....",
    "....b....b....",
    ".....b..b.....",
    "..kkkkbbkkkk..",
    ".kwcccbbcccsk.",
    "kwccccbbccccsk",
    "kwcccskkscccsk",
    "kwcccskkscccsk",
    "kwccccssccccsk",
    "kwccccccccccsk",
    "kwccccccccccsk",
    "kwccccccccccsk",
    "kwccccccccccsk",
    "kwccccccccccsk",
    "kwccccccccccsk",
    "kssssssssssssk",
    ".kkkkkkkkkkkk.",
  ],
};

export const GINGHAM_TILE: Sprite = {
  name: "gingham-tile",
  rows: [
    "PPppPPpp",
    "PPppPPpp",
    "ppccppcc",
    "ppccppcc",
    "PPppPPpp",
    "PPppPPpp",
    "ppccppcc",
    "ppccppcc",
  ],
};
