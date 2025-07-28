# API Integration Strategy

  * The Next.js frontend will directly interact with the Kanta backend API (FastAPI) via HTTP requests (using Axios or Fetch).
  * API endpoints will be clearly defined in `services/kantaApi.ts`.
  * Authentication tokens (e.g., JWT from backend) will be securely stored (e.g., HttpOnly cookies) and sent with authenticated requests.
  * Error handling will be centralized in `kantaApi.ts` and propagated to React Query for UI feedback.