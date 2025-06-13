// Kanta Design System Configuration
// Inspired by magic-portfolio's once-ui system

import { Inter, Playfair_Display } from 'next/font/google';
import { JetBrains_Mono } from 'next/font/google';

// Base URL for your application
const baseURL = "https://kanta.app"; // Replace with your actual domain

// Route configuration
const routes = {
  "/": true,
  "/events": true,
  "/gallery": true,
  "/gallery/upload": true,
  "/people": true,
  "/about": true,
};

// Display configuration
const display = {
  location: true,
  time: true,
  themeSwitcher: true,
  logo: true,
};

// Font configurations - Using Geist like Magic Portfolio but with Kanta branding
const heading = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const label = Inter({
  variable: "--font-label",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

const code = JetBrains_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  display: "swap",
});

export const fonts = {
  heading,
  body,
  label,
  code,
};

// Design system style configuration
export const style = {
  theme: "system", // dark | light | system
  neutral: "slate", // sand | gray | slate | custom
  brand: "violet", // blue | indigo | violet | magenta | pink | red | orange | yellow | moss | green | emerald | aqua | cyan | custom
  accent: "cyan", // blue | indigo | violet | magenta | pink | red | orange | yellow | moss | green | emerald | aqua | cyan | custom
  solid: "contrast", // color | contrast
  solidStyle: "plastic", // flat | plastic
  border: "playful", // rounded | playful | conservative
  surface: "translucent", // filled | translucent
  transition: "all", // all | micro | macro
  scaling: "100" // 90 | 95 | 100 | 105 | 110
};

// Visual effects configuration
export const effects = {
  mask: {
    cursor: true,
    x: 50,
    y: 0,
    radius: 120,
  },
  gradient: {
    display: true,
    opacity: 80,
    x: 50,
    y: 40,
    width: 120,
    height: 60,
    tilt: 15,
    colorStart: "brand-background-strong",
    colorEnd: "page-background",
  },
  dots: {
    display: true,
    opacity: 30,
    size: "2",
    color: "brand-background-medium",
  },
  grid: {
    display: false,
    opacity: 100,
    color: "neutral-alpha-medium",
    width: "0.25rem",
    height: "0.25rem",
  },
  lines: {
    display: false,
    opacity: 100,
    color: "neutral-alpha-weak",
    size: "16",
    thickness: 1,
    angle: 45,
  },
};

// Color scheme - Kanta specific colors
export const colors = {
  brand: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  violet: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },
  cyan: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
  },
};

// Metadata configuration for SEO
export const meta = {
  home: {
    path: "/",
    title: "Kanta | Collaborative Event Photos",
    description: "Transform your event into a live, shared photo album with AI-powered organization and smart face detection.",
    image: "/og/home.jpg",
    canonical: baseURL,
    robots: "index,follow",
  },
  events: {
    path: "/events",
    title: "Events | Kanta",
    description: "Create and manage your collaborative photo events with QR code sharing.",
    image: "/og/events.jpg",
    canonical: `${baseURL}/events`,
    robots: "index,follow",
  },
  gallery: {
    path: "/gallery",
    title: "Gallery | Kanta",
    description: "Browse and organize your event photos with AI-powered features.",
    image: "/og/gallery.jpg",
    canonical: `${baseURL}/gallery`,
    robots: "index,follow",
  },
  people: {
    path: "/people",
    title: "People | Kanta",
    description: "Discover people in your photos with smart face recognition technology.",
    image: "/og/people.jpg",
    canonical: `${baseURL}/people`,
    robots: "index,follow",
  },
};

// Schema.org data
export const schema = {
  logo: "/logo.png",
  type: "Organization",
  name: "Kanta",
  description: meta.home.description,
  email: "hello@kanta.app",
  url: baseURL,
};

// Social links
export const social = {
  twitter: "https://twitter.com/kanta_app",
  github: "https://github.com/kanta-app",
  linkedin: "https://linkedin.com/company/kanta",
};

// Animation and transition settings
export const animations = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// Layout configuration
export const layout = {
  maxWidth: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
    '2xl': '4rem',
  },
};

export { baseURL, routes, display };
