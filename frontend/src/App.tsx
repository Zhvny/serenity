import { BrowserRouter, Routes, Route } from "react-router";
import { MenuPage } from "./pages/MenuPage.tsx";
import { DetailPage } from "./pages/DetailPage.tsx";
import { CartPage } from "./pages/CartPage.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MenuPage />} />
        <Route path="/products/:id" element={<DetailPage />} />
        <Route path="/cart" element={<CartPage />} />
      </Routes>
    </BrowserRouter>
  );
}
