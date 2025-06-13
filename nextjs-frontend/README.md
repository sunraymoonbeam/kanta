nextjs-frontend/
├── src/
│   ├── app/                    # Next.js 14+ App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── gallery/
│   │   ├── events/
│   │   ├── people/
│   │   └── api/
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── ...
│   │   ├── layout/             # Layout components
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   └── features/           # Feature-specific components
│   │       ├── gallery/
│   │       ├── events/
│   │       └── people/
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities and API functions
│   ├── types/                  # TypeScript type definitions
│   ├── contexts/               # React contexts
│   └── styles/                 # Global styles
├── public/                     # Static assets
├── package.json
└── next.config.js