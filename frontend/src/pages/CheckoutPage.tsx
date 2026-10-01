import { useState } from "react";
import { useNavigate } from "react-router";
import { ApiError, generateCode } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Icon } from "../components/Icon.tsx";

export function CheckoutPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function handlePay(): Promise<void> {
    setState("sending");
    setMsg("");
    try {
      const { unique_code } = await generateCode();
      navigate(`/thanks?ref=${encodeURIComponent(unique_code)}`);
    } catch (e: unknown) {
      setMsg(e instanceof ApiError ? e.message : "Gagal membuat pembayaran");
      setState("error");
    }
  }

  return (
    <div>
      <Header />
      <main className="pay-wrap">
        <div className="pay-card">
          <span className="pay-icon"><Icon name="spark" /></span>
          <h1>Pembayaran</h1>
          <p>Buat kode QRIS untuk menyelesaikan pesanan dari keranjang Anda.</p>
          <button type="button" className="btn-primary btn-lg pay-cta" disabled={state === "sending"} onClick={() => void handlePay()}>
            {state === "sending" ? "Memproses…" : "Bayar via QRIS"}
          </button>
          {state === "error" ? <p className="detail-msg detail-msg--err" role="alert">{msg}</p> : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}
