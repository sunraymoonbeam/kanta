# Kanta Next.js Frontend

This directory contains a lightweight Next.js UI that mirrors the original Streamlit pages.

## Setup

1. `cd nextjs`
2. Run `npm install`
3. Create `.env.local` and set:
   - `NEXT_PUBLIC_BACKEND_URL` pointing to the FastAPI backend (default `http://localhost:8000/api/v1`)
   - `NEXT_PUBLIC_ADMIN_PASSWORD` matching the backend admin password
4. `npm run dev` for development
5. For production build run `npm run build` followed by `npm start`

## Structure

- `src/app/` – route pages (`events`, `camera`, `gallery`, `people`)
- `src/api/` – helper modules that call the FastAPI backend
- `src/features/` – feature components like the events context and navbar
- `src/utils/` – shared utilities

Each page roughly corresponds to the Streamlit tab with similar forms and filters.

The navigation bar includes a drop-down to choose the active event. Once selected,
all pages automatically use that event code when making API calls.

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
