import { Link } from "react-router";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { useT } from "../i18n/t.ts";
import type { DictKey } from "../i18n/t.ts";
import { usePageTitle } from "../hooks/usePageTitle.ts";

const QA: ReadonlyArray<{ q: DictKey; a: DictKey }> = [
  { q: "faq.q1", a: "faq.a1" },
  { q: "faq.q2", a: "faq.a2" },
  { q: "faq.q3", a: "faq.a3" },
  { q: "faq.q4", a: "faq.a4" },
  { q: "faq.q5", a: "faq.a5" },
  { q: "faq.q6", a: "faq.a6" },
  { q: "faq.q7", a: "faq.a7" },
  { q: "faq.q8", a: "faq.a8" },
  { q: "faq.q9", a: "faq.a9" },
  { q: "faq.q10", a: "faq.a10" },
];

export function FaqPage() {
  const t = useT();
  usePageTitle(t("faq.title"));
  return (
    <div>
      <Header />
      <main id="main" tabIndex={-1} className="content content--wide faq-page">
        <div className="section-head">
          <h1>{t("faq.title")}</h1>
        </div>
        <p className="subtitle">{t("faq.intro")}</p>
        <div className="faq-list">
          {QA.map((x) => (
            <details key={x.q} className="faq-item">
              <summary>{t(x.q)}</summary>
              <p>{t(x.a)}</p>
            </details>
          ))}
        </div>
        <p className="faq-cta"><Link className="btn-primary" to="/menu#menu">{t("faq.cta")}</Link></p>
      </main>
      <Footer />
    </div>
  );
}
