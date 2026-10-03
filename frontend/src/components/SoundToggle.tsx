import { Icon } from "./Icon.tsx";
import { useSound } from "../fx/useSound.ts";
import { useT } from "../i18n/t.ts";

// Tombol speaker. `where` memilih tempat (header disembunyikan di ponsel; footer hanya tampil di ponsel).
export function SoundToggle({ where = "header" }: { where?: "header" | "footer" }) {
  const t = useT();
  const [soundOn, setSoundOn] = useSound();
  return (
    <button
      type="button"
      className={`sound-toggle sound-toggle--${where}`}
      aria-label={soundOn ? t("shell.sound.on") : t("shell.sound.off")}
      aria-pressed={soundOn}
      onClick={() => setSoundOn(!soundOn)}
    >
      <Icon name={soundOn ? "volume-on" : "volume-off"} />
    </button>
  );
}
