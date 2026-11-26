# TheeInsurance

TheeInsurance is maintained as a monorepo containing these applications:

| Path | What it is |
|---|---|
| `apps/frontend` | React, TypeScript and Vite portal for staff, providers and distributors |
| `apps/backend` | NestJS and Prisma API (PostgreSQL, Redis, Cloudinary) |
| `apps/legacy_backend` | The previous Django REST API, kept for reference |

## Run the frontend

```sh
cd apps/frontend
bun install
bun run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` to the backend set by `BACKEND_API_ORIGIN` in `apps/frontend/.env`.

## Run the backend

Requires Node.js, pnpm, PostgreSQL and Redis.

```sh
cd apps/backend
cp .env.example .env   # fill in database, Redis, JWT and Cloudinary values
pnpm install           # also runs prisma generate
pnpm prisma:migrate
pnpm start:dev
```

The API is served under `/api/v1` on `PORT` (default `3000`). `GET /health` is a liveness check, and Swagger is at `/docs` when it is enabled. Add the frontend's origin to `CORS_ORIGINS`.

Other useful scripts:

```sh
pnpm start:worker:dev   # background job worker
pnpm test               # unit tests
pnpm test:e2e           # end-to-end tests
pnpm build && pnpm seed:admin   # create the first Super Admin
```

## Deployment

Keep each app's environment variables and deployment settings in its own directory.

- **Frontend (Vercel):** set the project root to `apps/frontend`. `vercel.json` rewrites `/api/*` to the backend.
- **Backend (Render):** set the service root directory to `apps/backend` and use `build.sh` as the build command and `pnpm start:prod` as the start command. Staging runs at `https://thee-main.onrender.com`.

The original frontend and backend histories are retained in this repository.
