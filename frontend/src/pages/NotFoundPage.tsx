import { Link } from "react-router";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Sprite } from "../pixel/Sprite.tsx";
import { TOAST_BURNT } from "../pixel/data/mascot2.ts";
import { useT } from "../i18n/t.ts";

export function NotFoundPage() {
  const t = useT();
  return (
    <div>
      <Header />
      <main className="pay-wrap">
        <div className="pay-card">
          <Sprite sprite={TOAST_BURNT} className="mascot" />
          <h1>{t("orders.notfound.title")}</h1>
          <p>{t("orders.notfound.text")}</p>
          <Link className="btn-primary btn-lg pay-cta" to="/">{t("orders.common.backHome")}</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
