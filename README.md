# CampusWeb

Real-time campus chat — **web**, **mobile**, and a shared API.

## Project Structure

```
CampusWeb/
├── backend/     # Express + Socket.io + Prisma API
├── web/         # Next.js web app (deploy to Vercel)
└── mobile/      # React Native (Expo) app
```

## Features

- User registration & login with campus email validation
- Public channels with real-time messaging
- **Direct messages (1-on-1)**
- **File & image sharing** (up to 10 MB)
- Shared REST + WebSocket API for web and mobile

### Allowed emails

- University domains: `.edu`, `.edu.com`, `.ac.in`, `.in.ac`, and other common academic TLDs
- Gmail (`@gmail.com`)

## Local Development

### 1. Backend

```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

API: **http://localhost:4000**

Demo account: `demo@campus.edu` / `demo123`

### 2. Web

```bash
cd web
npm install
npm run dev
```

Web: **http://localhost:3000**

### 3. Mobile (React Native / Expo)

```bash
cd mobile
npm install
npm start
```

Scan the QR code with Expo Go. For Android emulator, use `http://10.0.2.2:4000` as API URL. For a physical device on the same Wi‑Fi, use your computer's LAN IP.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Example | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./dev.db` | SQLite path (use Postgres in production) |
| `JWT_SECRET` | `your-secret` | JWT signing key |
| `PORT` | `4000` | API port |
| `CLIENT_URL` | `http://localhost:3000,https://your-app.vercel.app` | CORS origins (comma-separated) |
| `UPLOAD_DIR` | `./uploads` | File upload directory |

### Web (`web/.env.local`)

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` |

### Mobile (`mobile/.env`)

| Variable | Example |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | `http://192.168.1.10:4000` |

## Deploy Online

### Web → Vercel

1. Push the repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Set **Root Directory** to `web`
4. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = your backend URL (e.g. `https://campusweb-api.up.railway.app`)
5. Deploy

Or via CLI:

```bash
cd web
npx vercel --prod
```

### Backend → Railway (recommended)

Socket.io and file uploads need a persistent server — Vercel serverless is not suitable for the API.

1. Create a project at [Railway](https://railway.app)
2. Connect your repo, set **Root Directory** to `backend`
3. Add environment variables:
   - `DATABASE_URL` — use Railway Postgres or keep SQLite with a volume
   - `JWT_SECRET` — strong random secret
   - `CLIENT_URL` — your Vercel URL + Expo origins
   - `PORT` — `4000`
4. Railway will run `npm run start` via `Procfile`

After deploy, update `NEXT_PUBLIC_API_URL` in Vercel and `EXPO_PUBLIC_API_URL` in mobile.

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register (campus email required) |
| POST | `/api/auth/login` | Login |
| GET | `/api/channels` | User's channels |
| GET | `/api/dm` | DM conversations |
| POST | `/api/dm` | Start DM `{ userId }` |
| GET | `/api/dm/:id/messages` | DM history |
| GET | `/api/users/search?q=` | Find users for DM |
| POST | `/api/upload` | Upload file (multipart) |

### WebSocket events

| Event | Description |
|-------|-------------|
| `join_channel` / `send_message` / `new_message` | Channel chat |
| `join_dm` / `send_dm` / `new_dm_message` | Direct messages |
| `dm_updated` | Conversation list refresh |

## Tech Stack

- **Backend:** Node.js, Express, Socket.io, Prisma, SQLite, JWT, Multer
- **Web:** Next.js 16, React 19, Tailwind CSS 4
- **Mobile:** React Native, Expo, Socket.io Client
