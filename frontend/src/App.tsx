import { Routes, Route } from "react-router";
import { MenuPage } from "./pages/MenuPage.tsx";
import { DetailPage } from "./pages/DetailPage.tsx";
import { CartPage } from "./pages/CartPage.tsx";
import { NotFoundPage } from "./pages/NotFoundPage.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<MenuPage />} />
        <Route path="/products/:id" element={<DetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
