import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev'
import type { NextConfig } from "next"

// Setup Cloudflare dev platform for local development
if (process.env.NODE_ENV === 'development') {
  setupDevPlatform()
}

const nextConfig: NextConfig = {
  // Required for Cloudflare Pages
  experimental: {
    // Enable edge runtime for API routes
  },
}

export default nextConfig
