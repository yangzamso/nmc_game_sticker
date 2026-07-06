import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'

// Vercel 서버리스 함수(api/*.js)를 순수 Vite dev 서버에서도 그대로 실행시키는 미들웨어.
// Vercel CLI(`vercel dev`) 없이 `npm run dev`만으로 /api 라우트가 동작하도록 함.
function vercelApiDevPlugin() {
  return {
    name: 'vercel-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next()

        const url = new URL(req.url, 'http://localhost')
        const routeName = url.pathname.replace('/api/', '')
        const modPath = path.resolve(__dirname, 'api', `${routeName}.js`)
        if (!fs.existsSync(modPath)) return next()

        const chunks = []
        req.on('data', (chunk) => chunks.push(chunk))
        req.on('end', async () => {
          const rawBody = Buffer.concat(chunks).toString('utf-8')
          try {
            req.body = rawBody ? JSON.parse(rawBody) : {}
          } catch {
            req.body = {}
          }
          req.query = Object.fromEntries(url.searchParams)

          res.status = (code) => {
            res.statusCode = code
            return res
          }
          res.json = (data) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
          }

          try {
            const mod = await server.ssrLoadModule(modPath)
            await mod.default(req, res)
          } catch (err) {
            console.error(`[vercel-api-dev] ${routeName} 실행 실패:`, err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // .env.local 등에 있는 DATABASE_URL/ADMIN_PASSWORD를 api/*.js가 읽을 process.env에 주입
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [react(), vercelApiDevPlugin()],
    server: {
      port: Number(process.env.PORT) || 5173,
    },
  }
})
