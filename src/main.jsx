import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initAuth } from './lib/auth.js'
import { pwaBaslat } from './lib/pwa.js'

// Oturumu başlat + PWA yükleme olayını erken dinle (beforeinstallprompt kaçmasın)
initAuth()
pwaBaslat()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// PWA service worker kaydı
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
