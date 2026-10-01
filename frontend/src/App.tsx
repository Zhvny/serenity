import { Routes, Route } from "react-router";
import { MenuPage } from "./pages/MenuPage.tsx";
import { DetailPage } from "./pages/DetailPage.tsx";
import { CartPage } from "./pages/CartPage.tsx";
import { NotFoundPage } from "./pages/NotFoundPage.tsx";
import { AdminPage } from "./pages/AdminPage.tsx";
import { ThanksPage } from "./pages/ThanksPage.tsx";
import { CheckoutPage } from "./pages/CheckoutPage.tsx";
import { StatusPage } from "./pages/StatusPage.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<MenuPage />} />
        <Route path="/products/:id" element={<DetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/thanks" element={<ThanksPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/status/:code" element={<StatusPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
