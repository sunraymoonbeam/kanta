# Key Architectural Considerations

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