# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with TurboPack on http://localhost:3000
- `npm run build` - Build production-ready application
- `npm start` - Start production server
- `npm run lint` - Run Next.js linting

## Architecture Overview

This is a Next.js 15 application for Kanta, an AI-powered photo sharing platform for events. The app uses:

- **Framework**: Next.js 15.4.6 with App Router
- **Styling**: Tailwind CSS v4 with custom UI components
- **API Integration**: Custom API client in `lib/api.ts` connecting to backend at `http://localhost:8000/api/v1`
- **State Management**: React Context API via `contexts/AppContext.tsx`
- **TypeScript**: Strict mode enabled with path aliases (`@/*`)

### Key Application Routes

- `/` - Landing page with marketing content
- `/events` - List all events
- `/events/new` - Create new event form
- `/events/[code]` - Event details with QR code and management
- `/event/[code]/landing` - Guest-facing event landing page
- `/event/[code]/camera` - Camera interface for photo capture

### Core Components Structure

- **UI Components** (`components/ui/`): Reusable shadcn/ui-style components (Button, Dialog, LoadingState)
- **Feature Components**: 
  - `events/` - EventCard, EventForm, QRCodeDisplay
  - `camera/` - CameraControls, CameraViewfinder, RefactoredCameraScreen
  - `gallery/` - GalleryGrid, GalleryHeader, RefactoredGalleryScreen
  - `landing/` - Hero, Features

### API Integration Pattern

The app uses a centralized API client (`lib/api.ts`) with:
- Type-safe interfaces for all API operations
- Automatic Azurite URL fixing for local development
- Comprehensive error handling with ApiError class
- Support for Events, Images, and Clusters endpoints

### Custom Hooks

- `useCamera` - Camera stream management
- `usePhotoCapture` - Photo capture logic
- `useLocalStorage` - Persistent local storage
- `useToast` - Toast notifications
- `useApiIntegration` - API state management

### Environment Configuration

The app expects `NEXT_PUBLIC_API_URL` environment variable (defaults to `http://localhost:8000/api/v1`).

### Docker Support

Two Dockerfiles are provided:
- `Dockerfile` - Production build with standalone output
- `Dockerfile.dev` - Development environment with hot reload