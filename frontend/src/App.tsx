import { Routes, Route } from "react-router";
import { LandingPage } from "./pages/LandingPage.tsx";
import { MenuPage } from "./pages/MenuPage.tsx";
import { DetailPage } from "./pages/DetailPage.tsx";
import { CartPage } from "./pages/CartPage.tsx";
import { NotFoundPage } from "./pages/NotFoundPage.tsx";
import { AdminPage } from "./pages/AdminPage.tsx";
import { ThanksPage } from "./pages/ThanksPage.tsx";
import { CheckoutPage } from "./pages/CheckoutPage.tsx";
import { StatusPage } from "./pages/StatusPage.tsx";
import { HistoryPage } from "./pages/HistoryPage.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/products/:id" element={<DetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/thanks" element={<ThanksPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/status/:code" element={<StatusPage />} />
        <Route path="/riwayat" element={<HistoryPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
