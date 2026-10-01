import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    // Jangan simpan message error ke state/DOM: hindari bocor detail ke pengguna.
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="state">
          <h1>Terjadi kesalahan</h1>
          <p>Silakan muat ulang halaman.</p>
          <a className="btn-secondary" href="/">Muat ulang</a>
        </main>
      );
    }
    return this.props.children;
  }
}
