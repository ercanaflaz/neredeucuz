import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { geminiCalis } from './functions/api/gemini.js'
import { barkodokuCoz } from './functions/api/barkod/[[path]].js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), geminiDev(env), barkodDev(env)],
    server: {
      // Yerelde CORS'u aşmak için marketfiyati API'sine proxy (yayında Pages Function).
      proxy: {
        '/api/mf': {
          target: 'https://api.marketfiyati.org.tr',
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/api\/mf/, '/api/v2'),
        },
      },
    },
  }
})

// Yerel geliştirmede /api/barkod/<kod>'u çalıştırır (yayında Cloudflare fonksiyonu yapar).
// Anahtarlar .env'deki BARKODOKU_USER_KEY / BARKODOKU_API_KEY'den okunur (VITE_ öneki YOK).
function barkodDev(env) {
  return {
    name: 'barkod-dev',
    configureServer(server) {
      server.middlewares.use('/api/barkod', async (req, res) => {
        res.setHeader('content-type', 'application/json')
        const kod = String(req.url || '').replace(/^\//, '').split('?')[0]
        try {
          const out = await barkodokuCoz(env, kod)
          res.statusCode = out.status
          res.end(JSON.stringify(out.body))
        } catch (e) {
          res.statusCode = 502
          res.end(JSON.stringify({ bulundu: false, hata: String(e) }))
        }
      })
    },
  }
}

// Yerel geliştirmede /api/gemini'yi çalıştırır (yayında Cloudflare fonksiyonu yapar).
// Anahtar .env içindeki GEMINI_API_KEY'den okunur (VITE_ öneki YOK — sunucu tarafı).
function geminiDev(env) {
  return {
    name: 'gemini-dev',
    configureServer(server) {
      server.middlewares.use('/api/gemini', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end() }
        const key = env.GEMINI_API_KEY
        res.setHeader('content-type', 'application/json')
        if (!key) { res.statusCode = 501; return res.end(JSON.stringify({ error: 'no_key' })) }
        let body = ''
        req.on('data', (c) => (body += c))
        req.on('end', async () => {
          try {
            const out = await geminiCalis(key, env.GEMINI_MODEL, JSON.parse(body || '{}'))
            res.statusCode = out.status
            res.end(JSON.stringify(out.body))
          } catch (e) {
            res.statusCode = 502
            res.end(JSON.stringify({ error: 'x', detail: String(e) }))
          }
        })
      })
    },
  }
}
