# Core Technologies & Framework

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