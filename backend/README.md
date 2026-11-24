# NewsMania Backend

Express 5 + MongoDB/Mongoose API for NewsMania. Node.js ESM.

## Requirements

- Node.js 20+
- A MongoDB database (Atlas or self-hosted)
- Optional: Gmail app password for verification/reset emails, Google OAuth
  client, GNews and Gemini API keys, S3 or Cloudflare R2 for Static GK

## Setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in the values in .env
npm run dev
```

The API listens on `PORT` (default `5000`). Health check: `GET /health`
returns `{ "ok": true }`.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `MONGO_URI` | Yes | MongoDB connection string. |
| `PORT` | No | HTTP port, defaults to `5000`. |
| `EMAIL_USER` | For email | Gmail address used by nodemailer. |
| `EMAIL_PASS` | For email | 16-character Gmail app password. |
| `JWT_SECRET` | Yes | Signs session and password reset tokens. Use a long random value. |
| `JWT_ACCESS_SECRET` | No | Optional separate secret for access tokens. Falls back to `JWT_SECRET`. |
| `FRONTEND_URL` | Yes | Public URL of the frontend, used to build password reset links. |
| `CORS_ORIGINS` | Production | Comma-separated list of allowed browser origins. Required when `NODE_ENV=production`. |
| `GOOGLE_CLIENT_ID` | No | Google OAuth web client ID. Leave blank to disable Google sign in. |
| `GEMINI_API_KEY` | For AI | Gemini API key used for summaries and MCQs. |
| `NEWS_API_KEY` | For news fetch | GNews API key. |
| `STATIC_GK_STORAGE_DRIVER` | No | `local` (default) or `s3` for Static GK uploads. |
| `STATIC_GK_MAX_FILE_MB` | No | Maximum PDF upload size in MB, defaults to `25`. |
| `STATIC_GK_MAX_THUMBNAIL_MB` | No | Maximum thumbnail size in MB, defaults to `2`. |
| `STATIC_GK_UPLOAD_DIR` | No | Local directory for Static GK files. Defaults to `backend/uploads/static-gk`. |
| `STATIC_GK_S3_BUCKET` | For S3 | Private bucket name for Static GK files. |
| `STATIC_GK_S3_REGION` | For S3 | Bucket region. Use `auto` for Cloudflare R2. |
| `STATIC_GK_S3_ENDPOINT` | For S3 | Custom endpoint, required for R2. |
| `STATIC_GK_S3_PREFIX` | No | Key prefix inside the bucket, defaults to `static-gk`. |
| `STATIC_GK_S3_ACCESS_KEY_ID` | For S3 | S3/R2 access key ID. |
| `STATIC_GK_S3_SECRET_ACCESS_KEY` | For S3 | S3/R2 secret access key. |
| `STATIC_GK_S3_FORCE_PATH_STYLE` | No | `true` for path-style bucket URLs, defaults to `false`. |
| `STATIC_GK_SIGNED_URL_SECONDS` | No | Lifetime of signed download URLs, defaults to `300`. |
| `MONGO_DNS_SERVERS` | No | Comma-separated DNS servers for MongoDB SRV lookups, defaults to `8.8.8.8,1.1.1.1`. |

Never commit `.env`. Keep production secrets in the platform's secret manager.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start with nodemon hot reload. |
| `npm start` | Start the production server (`server.js`). |
| `npm test` | Run Jest in ESM mode. |

`server.js` validates that `MONGO_URI`, `JWT_SECRET` and `FRONTEND_URL` are
set and exits with a clear message if any are missing. It also requires
`CORS_ORIGINS` when `NODE_ENV=production`.

## API overview

- `GET /health` - health check
- `GET /api/news`, `GET /api/news/:id` - public news reads
- `POST/PUT/DELETE /api/news...` - admin only
- `GET /api/news/fetch/newsapi`, `GET /api/news/fetch/pib` - admin only
- `POST /api/ai/news/:id/analyze` - authenticated, rate limited, returns
  the cached analysis when a summary and facts already exist
- Auth endpoints under `/api/auth` have login/email rate limits

## Deployment checklist

- [ ] For a single Render web service, set **Root Directory** to the repository
      root (leave it blank), **Build Command** to `npm run build`, and
      **Start Command** to `npm start`.
- [ ] Set the frontend build variable `VITE_API_BASE_URL` to `/api` (or leave
      it unset to use the production default).
- [ ] Keep the frontend and backend in the same service; the production
      frontend uses the same-origin `/api` path by default.
- [ ] Set `NODE_ENV=production`.
- [ ] Set `CORS_ORIGINS` to the exact production frontend origins,
      comma-separated, with no trailing slash.
- [ ] Set strong, unique `JWT_SECRET` and (optionally) `JWT_ACCESS_SECRET`.
- [ ] Configure production `MONGO_URI` with a least-privilege database user.
- [ ] Set `FRONTEND_URL` to the production frontend URL.
- [ ] Configure `EMAIL_USER` / `EMAIL_PASS` for transactional email.
- [ ] Set `GOOGLE_CLIENT_ID`, `GEMINI_API_KEY` and `NEWS_API_KEY` if used.
- [ ] For Static GK uploads, set `STATIC_GK_STORAGE_DRIVER=s3` and configure
      the S3 or Cloudflare R2 bucket variables. Keep the bucket private.
- [ ] Ensure the app runs behind a trusted proxy; the app sets
      `trust proxy` to `1`.
- [ ] Serve over HTTPS and run behind a process manager or container
      orchestrator.
- [ ] Point monitoring at `GET /health`.
- [ ] Rotate any secrets that were ever committed or shared.

For the combined Render service, set both `FRONTEND_URL` and `CORS_ORIGINS`
to the service origin (for example, `https://newsmania-dfel.onrender.com`).
`FRONTEND_URL` is also allowed by the API CORS policy.
The root `npm run build` command builds the Vite app and installs backend
dependencies; `npm start` starts the API, which serves the generated frontend.
