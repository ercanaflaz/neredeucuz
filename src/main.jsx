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

// PWA service worker kaydı + OTOMATİK GÜNCELLEME
// Yeni bir sürüm yayınlanınca kullanıcı hard-refresh yapmadan otomatik tazelenir
// (eski önbellekte takılı kalma sorununu önler).
if ('serviceWorker' in navigator) {
  const vardiKontrol = !!navigator.serviceWorker.controller
  let yenilendi = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (yenilendi) return
    yenilendi = true
    // Yalnızca zaten bir SW varken (yani GÜNCELLEME durumunda) tazele — ilk ziyarette değil.
    if (vardiKontrol) window.location.reload()
  })
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Saatte bir güncelleme kontrolü + sekmeye dönünce kontrol
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {})
      })
    }).catch(() => {})
  })
}
