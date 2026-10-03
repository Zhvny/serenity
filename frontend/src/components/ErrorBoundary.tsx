import { Component, type ReactNode } from "react";
import { useT } from "../i18n/t.ts";

type Props = { children: ReactNode };
type State = { hasError: boolean };

// Fallback fungsional agar teks ikut berganti bahasa (komponen kelas tak bisa memakai hook).
function ErrorFallback() {
  const t = useT();
  return (
    <main className="state">
      <h1>{t("orders.error.title")}</h1>
      <p>{t("orders.error.text")}</p>
      <a className="btn-secondary" href="/">{t("orders.error.reload")}</a>
    </main>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    // Jangan simpan message error ke state/DOM: hindari bocor detail ke pengguna.
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return <ErrorFallback />;
    return this.props.children;
  }
}
