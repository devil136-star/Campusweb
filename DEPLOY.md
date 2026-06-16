# Deploy CampusWeb Online

## Overview

| Part | Platform | Why |
|------|----------|-----|
| Web (`web/`) | **Vercel** | Next.js hosting |
| API (`backend/`) | **Railway** | Socket.io + file uploads need a always-on server |

---

## Step 1 — Push to GitHub

```bash
cd c:\PC\CampusChat
git init
git add .
git commit -m "CampusWeb initial release"
```

Create a repo on GitHub, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/CampusWeb.git
git push -u origin main
```

---

## Step 2 — Deploy backend (Railway)

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Select your repo
3. **Important (monorepo):** either option works:
   - **Option A (recommended):** Service → **Settings** → **Root Directory** → set to `backend`
   - **Option B:** leave root as `/` — the repo root `package.json` + `railway.toml` build `backend/` for you
4. Add variables:

| Variable | Value |
|----------|-------|
| `JWT_SECRET` | Long random string |
| `PORT` | `4000` |
| `DATABASE_URL` | `file:./dev.db` (or Railway Postgres URL) |
| `CLIENT_URL` | `https://YOUR-APP.vercel.app` (update after Step 3) |
| `UPLOAD_DIR` | `./uploads` |

5. **Build Command:** `npm install && npm run build`
6. **Start Command:** `npm run start` (runs migrations automatically via `prestart`)
7. Deploy → copy your public URL (e.g. `https://campusweb-production.up.railway.app`)

Test: open `https://YOUR-RAILWAY-URL/api/health` — should return `{"status":"ok"}`

---

## Step 3 — Deploy web (Vercel)

### Option A — Vercel website (easiest)

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Set **Root Directory** to `web`
4. Add environment variable:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_API_URL` | Your Railway URL from Step 2 |

5. Click **Deploy**

### Option B — Vercel CLI

```bash
cd web
vercel login
vercel
```

When prompted, set root to `web`. Then add the env var:

```bash
vercel env add NEXT_PUBLIC_API_URL production
# paste your Railway URL

vercel --prod
```

---

## Step 4 — Link backend to frontend

In Railway, update `CLIENT_URL` to your live Vercel URL:

```
CLIENT_URL=https://your-app.vercel.app
```

Redeploy the backend so CORS allows your production site.

---

## Step 5 — Mobile app (optional)

In `mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://your-railway-url.up.railway.app
```

---

## Quick checklist

- [ ] Backend health check works
- [ ] `NEXT_PUBLIC_API_URL` points to Railway in Vercel
- [ ] `CLIENT_URL` includes Vercel URL in Railway
- [ ] Register/login works on live site
- [ ] Real-time chat works (WebSocket connected)
