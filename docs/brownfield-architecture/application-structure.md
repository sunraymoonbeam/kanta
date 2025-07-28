# Application Structure (Folder & Component Organization)

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