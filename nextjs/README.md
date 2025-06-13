# Kanta Next.js Frontend

This directory contains a lightweight Next.js UI that mirrors the original Streamlit pages.

## Setup

1. `cd nextjs`
2. Run `npm install`
3. Create `.env.local` and set `NEXT_PUBLIC_BACKEND_URL` to the FastAPI backend URL (default `http://localhost:8000/api/v1`).
4. `npm run dev`

## Structure

- `app/` – route pages (`events`, `camera`, `gallery`, `people`)
- `lib/api.ts` – helper functions that call the FastAPI endpoints
- `components/` – shared React components such as the navbar

Each page roughly corresponds to the Streamlit tab with similar forms and filters.

## Docker usage

A production `Dockerfile` is included. You can build and run the frontend with Docker directly:

```bash
docker build -t kanta-nextjs ./nextjs
docker run -p 3000:3000 -e NEXT_PUBLIC_BACKEND_URL=http://localhost:8000/api/v1 kanta-nextjs
```

When using the provided `docker-compose.yml`, start only the frontend service with:

```bash
docker compose up nextjs-frontend
```

This will build the image and expose the app on `http://localhost:3000` while linking to the backend container.
