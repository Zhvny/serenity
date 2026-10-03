import { useEffect, useState } from "react";
import { Sprite } from "../pixel/Sprite.tsx";
import { CLOUD_2, MOON, STAR, SUN } from "../pixel/data/scene.ts";
import { playSound } from "../fx/sound.ts";
import { useT } from "../i18n/t.ts";

const THEME_KEY = "serenity-theme";
export type Theme = "light" | "dark";

function initialTheme(): Theme {
  try {
    return window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

// Saklar siang/malam pixel: jempol persegi (matahari/bulan) bergeser bertahap di trek langit/malam.
export function ThemeToggle() {
  const t = useT();
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const dark = theme === "dark";

  useEffect(() => {
    document.documentElement.dataset.theme = theme === "dark" ? "dark" : "";
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // abaikan (mode privat)
    }
  }, [theme]);

  return (
    <button
      type="button"
      className="daynight"
      aria-label={dark ? t("shell.theme.toLight") : t("shell.theme.toDark")}
      aria-pressed={dark}
      onClick={() => {
        const next: Theme = dark ? "light" : "dark";
        playSound(next === "light" ? "bell" : "click");
        setTheme(next);
      }}
    >
      <span className="dn-track" aria-hidden="true">
        <Sprite sprite={CLOUD_2} className="dn-cloud" />
        <Sprite sprite={STAR} className="dn-star dn-star--a" />
        <Sprite sprite={STAR} className="dn-star dn-star--b" />
        <span className="dn-label">{dark ? t("shell.theme.night") : t("shell.theme.day")}</span>
        <span className="dn-thumb">
          <Sprite sprite={dark ? MOON : SUN} className="dn-orb" />
        </span>
      </span>
    </button>
  );
}
