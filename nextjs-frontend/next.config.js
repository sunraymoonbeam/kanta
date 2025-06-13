/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BACKEND_URL: 'http://localhost:8000/api/v1',
    NEXT_PUBLIC_ADMIN_PASSWORD: 'password123',
  },
};
module.exports = nextConfig;
