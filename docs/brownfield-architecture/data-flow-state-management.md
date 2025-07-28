# Data Flow & State Management

  * **Global State (Context/Zustand)**: `EventContext` will manage the currently selected `eventId` and potentially user authentication status.
  * **Server State (React Query)**: All data fetched from the Kanta backend API (e.g., event details, list of images, face clusters) will be managed by React Query. This includes:
      * Caching event data, image lists.
      * Managing mutations for image uploads.
      * Automatic re-fetching on focus or data invalidation.
  * **Component State**: Local state within components (e.g., input values, UI toggles).
  * **Data Flow**:
    1.  User actions trigger API calls via `services/kantaApi.ts`.
    2.  `React Query` handles the request, caching, and state updates.
    3.  Components re-render based on state changes.
    4.  Next.js routing (`pages/`) ensures correct content for different views.