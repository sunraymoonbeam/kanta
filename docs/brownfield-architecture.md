### Frontend Architecture: Kanta React & Next.js Frontend

Based on the detailed UI/UX Specification, here's the proposed architecture for the Kanta React & Next.js frontend:

#### 1\. Core Technologies & Framework

  * **Primary Framework**: **Next.js**
      * **Reasoning**: Provides a robust foundation for React applications, supporting server-side rendering (SSR), static site generation (SSG), and API routes. This is ideal for improving initial load performance, SEO (though less critical for a private event app, it's a good practice), and offering a flexible backend-for-frontend (BFF) layer if needed. It also simplifies routing and build processes.
  * **UI Library**: **React**
      * **Reasoning**: Core library for building interactive user interfaces, known for its component-based architecture and efficient DOM updates.
  * **Styling**:
      * **CSS-in-JS (e.g., Styled Components or Emotion)**: For component-scoped styles, dynamic styling based on props, and maintaining component encapsulation.
      * **Utility-First CSS (e.g., Tailwind CSS)**: For rapid prototyping and consistent spacing/sizing, especially for responsive design.
      * **Custom CSS Modules**: For global styles or complex, unique layouts (e.g., the "lens effect").
      * **Reasoning**: A hybrid approach allows for flexibility: component-specific styling with CSS-in-JS, rapid utility-driven styling, and custom fine-tuning for unique visual elements.
  * **State Management**: **React Context API with `useReducer` or Zustand/Jotai (Lightweight Global State)**
      * **Reasoning**: For most application-wide state (e.g., current event ID, user session), the Context API is sufficient. For more complex, granular state management or performance-critical global state, a lightweight library like Zustand or Jotai can be considered over Redux for simplicity.
  * **Data Fetching**: **React Query (TanStack Query)**
      * **Reasoning**: Handles caching, re-fetching, data synchronization, and error handling for server-side data, simplifying API interactions and improving perceived performance.
  * **Form Handling**: **React Hook Form**
      * **Reasoning**: Lightweight and performant library for managing form state and validation, critical for user input.
  * **Video/Camera Access**: **WebRTC API (via a wrapper library)**
      * **Reasoning**: Directly interacts with the user's camera. A React-specific wrapper library can simplify integration.
  * **Image Uploads**: **Standard HTML `multipart/form-data` with Axios/Fetch**
      * **Reasoning**: Direct interaction with the Kanta backend API for image uploads.
  * **Linting/Formatting**: ESLint, Prettier (aligned with `.pre-commit-config.yaml` from backend).

#### 2\. Application Structure (Folder & Component Organization)

```
/src
├── pages/                  # Next.js pages (routes)
│   ├── index.tsx           # Event Landing Page (future)
│   ├── [eventId]/          # Dynamic route for a specific event
│   │   ├── index.tsx       # Main Event App (with tabs)
│   │   ├── camera.tsx      # Sub-page for "Take Pictures" tab
│   │   ├── album.tsx       # Sub-page for "View Pictures" (Shared Album) tab
│   │   └── faces.tsx       # Sub-page for "View Clustered Faces" tab
├── components/             # Reusable UI components
│   ├── common/             # Global components (buttons, modals, layouts)
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   └── Layout.tsx
│   ├── camera/             # Components specific to camera view
│   │   ├── CameraFeed.tsx
│   │   ├── ShutterButton.tsx
│   │   ├── ShotCounter.tsx
│   │   └── FlashOverlay.tsx
│   ├── album/              # Components specific to album view
│   │   ├── ImageGrid.tsx
│   │   ├── ImageCard.tsx
│   │   └── ImageViewer.tsx # For full-screen image display
│   ├── faces/              # Components specific to face clustering view
│   │   ├── ClusterCard.tsx
│   │   └── ClusterDetailGallery.tsx
│   └── navigation/         # Tab navigation component
│       └── Tabs.tsx
├── hooks/                  # Custom React Hooks for reusable logic
│   ├── useCamera.ts
│   ├── useImageUpload.ts
│   └── useEventData.ts
├── services/               # API interaction logic (e.g., Axios instances, API calls)
│   ├── kantaApi.ts         # Centralized API service for Kanta backend
│   └── authService.ts      # For authentication/session management
├── contexts/               # React Contexts for global state
│   └── EventContext.tsx
├── styles/                 # Global styles, CSS variables, utility classes
│   ├── globals.css
│   ├── theme.ts            # Defines color palette, typography etc.
│   └── utils.css           # Custom utility classes for effects
├── lib/                    # Utility functions, helpers
│   ├── constants.ts
│   └── utils.ts
├── public/                 # Static assets (fonts, images, sounds)
│   └── # retro icons, sound effects, background textures
└── types/                  # TypeScript type definitions
    ├── api.ts
    └── ui.ts
```

#### 3\. Data Flow & State Management

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

#### 4\. API Integration Strategy

  * The Next.js frontend will directly interact with the Kanta backend API (FastAPI) via HTTP requests (using Axios or Fetch).
  * API endpoints will be clearly defined in `services/kantaApi.ts`.
  * Authentication tokens (e.g., JWT from backend) will be securely stored (e.g., HttpOnly cookies) and sent with authenticated requests.
  * Error handling will be centralized in `kantaApi.ts` and propagated to React Query for UI feedback.

#### 5\. Key Architectural Considerations

  * **Server-Side Rendering (SSR) vs. Client-Side Rendering (CSR)**:
      * Initial Event Landing Page (`index.tsx`): Can benefit from SSR/SSG for faster initial load and potential SEO (though less critical for a private app).
      * Main Event App (`[eventId]/index.tsx` and its tabs): Likely a mix. Initial data for the event can be fetched via `getServerSideProps` or `getStaticProps` (if event data is static) for the initial render, then subsequent interactions within tabs will use CSR via React Query.
  * **Image Optimization**: Next.js `Image` component will be used for automatic image optimization (resizing, lazy loading, modern formats like WebP) to ensure fast loading of shared album photos.
  * **Performance**:
      * Code Splitting: Next.js automatically splits code per page.
      * Lazy Loading: Components and modules can be lazily loaded to reduce initial bundle size.
      * Optimistic UI updates for actions like image uploads.
  * **Error Boundaries**: Implement React Error Boundaries to gracefully handle UI errors and prevent entire application crashes.
  * **Security**: Implement proper input sanitization, protect against XSS, and ensure secure handling of user sessions and tokens.
  * **Reusable Components**: Emphasize building small, focused, and reusable React components that are pure functions of their props.
  * **"Disposable Camera" Implementation**:
      * The "lens" effect will likely be a combination of CSS overlays, SVG masks, and potentially `mix-blend-mode` properties.
      * The shot counter will be a dedicated React component, updating global state.
      * Camera access (`getUserMedia`) will be managed within a dedicated hook (`useCamera`).

#### 6\. Development Workflow & Best Practices

  * **Linting & Formatting**: Enforce consistent code style using ESLint and Prettier, integrated into pre-commit hooks (mirroring backend setup).
  * **Testing**: Implement Jest/React Testing Library for unit and integration tests. Cypress for end-to-end (E2E) tests.
  * **CI/CD**: Integrate with a CI/CD pipeline (e.g., Azure DevOps, GitHub Actions) for automated testing, building, and deployment to a static hosting service or Vercel.
  * **TypeScript**: Use TypeScript throughout the codebase for improved code quality, maintainability, and developer experience.