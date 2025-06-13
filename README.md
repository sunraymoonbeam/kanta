_/kæntæ/_

Kanta, meaning lens in Malay, is a disposable film camera app that allows event
participants to take photos and share them.

## Project Layout

- **backend/** – FastAPI service providing the REST API
- **frontend/** – original Streamlit UI
- **nextjs/** – modern Next.js replacement for the Streamlit pages
- **docker-compose.yml** – run all services together

## Quick Start

1. Copy `.env.example` to `.env` and adjust settings if needed.
2. Build and start the stack:
   ```bash
   docker compose up --build
   ```
3. Open `http://localhost:8501` for the Streamlit frontend or
   `http://localhost:3000` for the Next.js frontend.

Both frontends talk to the same FastAPI backend at `http://localhost:8000/api/v1`.
