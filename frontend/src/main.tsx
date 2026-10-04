import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import '@fontsource/pixelify-sans/latin-400.css'
import '@fontsource/pixelify-sans/latin-500.css'
import '@fontsource/pixelify-sans/latin-600.css'
import '@fontsource/pixelify-sans/latin-700.css'
import './fonts.css'
import './index.css'
import App from './App.tsx'
// Tema pixel harus SETELAH App (admin.css ikut ter-import lewat App) agar menang di specificity sama.
import './theme-pixel.css'
import './theme-bakery-store.css'
import './theme-bakery-menu.css'
import './theme-bakery-fx.css'
import './theme-bakery-pages.css'
import './theme-bakery-layout.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
