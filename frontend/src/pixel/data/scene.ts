// Cozy cafe scenery sprites (clouds, mug, steam, plant, sparkles, sun, moon, sprout logo, bulb, daisy, heart).
// One character = one pixel, '.' = transparent. Palette: see ../palette.ts
import type { Sprite } from "../types.ts";

export const CLOUD_1: Sprite = {
  name: "cloud-1",
  rows: [
    "...........ccc..........",
    ".........ccwwwc.........",
    "........cwwwwwwc.ccc....",
    "....ccc.cwwwwwwwcwwwc...",
    "...cwwwcwwwwwwwwwwwwwc..",
    "..cwwwwwwwwwwwwwwwwwwwc.",
    "..cwwwwwwwwwwwwwwwwwwwc.",
    "..cwwwwwwwwwwwwwwwwwwcc.",
    "..cccccccccccccccccccs..",
    "...ssssssssssssssssss...",
  ],
};

export const CLOUD_2: Sprite = {
  name: "cloud-2",
  rows: [
    ".......ccc......",
    "......cwwwc.....",
    "...cccwwwwwccc..",
    "..cwwwwwwwwwwwc.",
    ".cwwwwwwwwwwwwwc",
    ".cwwwwwwwwwwwwwc",
    ".ccccccccccccccc",
    "..sssssssssssss.",
  ],
};

export const MUG: Sprite = {
  name: "mug",
  rows: [
    ".kkkkkkkkk......",
    "kwHHhhhhhwk.....",
    "kwwwwwwwwsk.....",
    "kwcccccccsk.kkk.",
    "kwgggggggGkwccsk",
    "kwgggggggGkkkksk",
    "kwGGGGGGGsk..ksk",
    "kwcccccccsk..ksk",
    "kwcccccccskkkksk",
    "kwcccccccskcccsk",
    "kwcccccccsk.kkk.",
    "kwccccccssk.....",
    ".ksssssssk......",
    "..kkkkkkk.......",
  ],
};

export const STEAM_1: Sprite = {
  name: "steam-1",
  rows: [
    "......c.",
    "...cw...",
    "....cw..",
    ".....cws",
    "....cws.",
    "...cws..",
    "..cws...",
    "..cws...",
    "...cw...",
    "....c...",
  ],
};

export const STEAM_2: Sprite = {
  name: "steam-2",
  rows: [
    ".c......",
    "...cw...",
    "..cw....",
    "cws.....",
    ".cws....",
    "..cws...",
    "...cws..",
    "...cws..",
    "...cw...",
    "...c....",
  ],
};

export const PLANT: Sprite = {
  name: "plant",
  rows: [
    ".......kk.......",
    ".....kllggk.....",
    ".....kllggk.....",
    "....klllgggk....",
    "...kklllgggkk...",
    "kk.kkllggggkk.kk",
    "klklklgggggklklk",
    "kllgkggggggklggk",
    "kllgkgggggGkgggk",
    ".kgggkkgGkkgggk.",
    ".kggggkgGkggggk.",
    "..kkgGkgGkGgkk..",
    ".....kkgGkk.....",
    "......kgGk......",
    "..kkkkkkkkkkkk..",
    "..kmmoooooooOk..",
    "..kooooooooOOk..",
    "..kkkkkkkkkkkk..",
    "...kmooooooOk...",
    "...kmooooooOk...",
    "...kmoooooOOk...",
    "....kmooooOk....",
    "....kooooOOk....",
    ".....kkkkkk.....",
  ],
};

export const SPARKLE_SM: Sprite = {
  name: "sparkle-sm",
  rows: [
    "...y...",
    "...y...",
    "..ywy..",
    "yywwwyy",
    "..ywy..",
    "...y...",
    "...y...",
  ],
};

export const SPARKLE_LG: Sprite = {
  name: "sparkle-lg",
  rows: [
    ".....y.....",
    ".....y.....",
    ".....y.....",
    "....ywy....",
    "...ywwwy...",
    "yyywwwwwyyy",
    "...ywwwy...",
    "....ywy....",
    ".....y.....",
    ".....y.....",
    ".....y.....",
  ],
};

export const STAR: Sprite = {
  name: "star",
  palette: {"x":"#fff2b3"},
  rows: [
    "....x....",
    "...yxy...",
    "...xwx...",
    ".yxxwxxy.",
    "xxxwwwxxx",
    ".yxxwxxy.",
    "...xwx...",
    "...yxy...",
    "....x....",
  ],
};

export const SUN: Sprite = {
  name: "sun",
  rows: [
    "...........mm...........",
    "...........oo...........",
    "...........oo...........",
    "...m................m...",
    "....oo.....oo.....oo....",
    "....oo..oooooooo..oo....",
    ".......owyyyyyyoo.......",
    "......owyyyyyyyyyo......",
    ".....owyyyyyyyyyyoo.....",
    ".....oyyyyyyyyyyyyo.....",
    ".....oyyyyyyyyyyyyo.....",
    "moo.ooyyykyyyykyyYOO.ooO",
    "moo.ooyyykyyyykyyYOO.ooO",
    ".....oyyyyyyyyyyYYO.....",
    ".....oyppykyykyppYO.....",
    ".....ooyyyykkyyYYOO.....",
    "......oyyyyyyYYYYO......",
    ".......ooyyYYYYOO.......",
    "....oo..oooOOOOO..OO....",
    "....oo.....OO.....OO....",
    "...o................O...",
    "...........oo...........",
    "...........oo...........",
    "...........OO...........",
  ],
};

export const MOON: Sprite = {
  name: "moon",
  rows: [
    "........................",
    ".............tttt.......",
    "..........ttwwwcct......",
    ".........twwwwwccct.....",
    "........twwwwwccttt.....",
    ".......twwswwcttt.......",
    "......twwsswcctt........",
    "......twwwswctt.........",
    ".....twwwwcccct.........",
    ".....twwwwcccct.........",
    ".....twsswcccct.........",
    ".....twwswcccct.........",
    ".....twwwwcccct.........",
    ".....twwwwcccct.........",
    ".....twswwcccct.........",
    ".....twwwwcccct.........",
    "......twwwwwctt.........",
    "......twwswwcctt........",
    ".......twwwwwcttt.......",
    "........twwswwccttt.....",
    ".........twwwwwccct.....",
    "..........ttwwwcct......",
    ".............tttt.......",
    "........................",
  ],
};

export const SPROUT: Sprite = {
  name: "sprout",
  rows: [
    "................",
    ".kkk........kkk.",
    "klllkk....kklllk",
    "kllllgk..kgllllk",
    "klllggk..kgglllk",
    "kllgggk..kgggllk",
    ".kgggGGkkGGgggk.",
    "..kgGGkgGkGGgk..",
    "...kkkkgGkkkk...",
    "......kgGk......",
    ".....kkgGkk.....",
    "...kkHHHHbbkk...",
    "..kHHHHHbbHbbk..",
    ".kHHHBHbBbbbbbk.",
    ".kHBHHBBBBBBBBk.",
    "kkkkkkkkkkkkkkkk",
  ],
};

export const BULB: Sprite = {
  name: "bulb",
  rows: [
    "..kkk..",
    "..kBk..",
    "..kBk..",
    ".kyyyk.",
    "kywwyYk",
    "kywwyYk",
    "kyyyyYk",
    ".kyyYk.",
    "..kkk..",
  ],
};

export const DAISY: Sprite = {
  name: "daisy",
  rows: [
    "....kkk....",
    "...kwwck...",
    "...kwwck...",
    ".kkkwwckkk.",
    "kwwwyyywwck",
    "kwwwyyYwwck",
    "kcccyyyccck",
    ".kkkwwckkk.",
    "...kwwck...",
    "...kwcck...",
    "....kkk....",
  ],
};

export const HEART_SM: Sprite = {
  name: "heart-sm",
  rows: [
    ".kkk.kkk.",
    "kwwrkrrRk",
    "kwrrrrrRk",
    "krrrrrrRk",
    ".krrrrRk.",
    "..krrRk..",
    "...kRk...",
    "....k....",
  ],
};
