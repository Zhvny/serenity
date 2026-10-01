import { useState } from "react";
import { useNavigate } from "react-router";
import { ApiError, generateCode } from "../services/api.ts";
import { Header } from "../components/Header.tsx";

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
      <main className="state">
        <h1>Pembayaran</h1>
        <p>Buat kode QRIS untuk menyelesaikan pesanan dari keranjang Anda.</p>
        <button type="button" className="btn-primary" disabled={state === "sending"} onClick={() => void handlePay()}>
          Bayar via QRIS
        </button>
        {state === "error" ? <p className="admin-error" role="alert">{msg}</p> : null}
      </main>
    </div>
  );
}
