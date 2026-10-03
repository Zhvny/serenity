import { useLang } from "../i18n/useLang.ts";
import type { Lang } from "../i18n/store.ts";
import { useT } from "../i18n/t.ts";

const OPTIONS: readonly { lang: Lang; text: string; label: "shell.lang.id" | "shell.lang.en" }[] = [
  { lang: "id", text: "ID", label: "shell.lang.id" },
  { lang: "en", text: "EN", label: "shell.lang.en" },
];

// Pil dua segmen "ID | EN": hanya Bahasa Indonesia dan English.
export function LanguageToggle() {
  const [lang, setLang] = useLang();
  const t = useT();
  return (
    <div className="lang-toggle" role="group" aria-label={t("shell.lang.label")}>
      {OPTIONS.map((o) => (
        <button
          key={o.lang}
          type="button"
          lang={o.lang}
          aria-pressed={lang === o.lang}
          aria-label={t(o.label)}
          onClick={() => setLang(o.lang)}
        >
          {o.text}
        </button>
      ))}
    </div>
  );
}
