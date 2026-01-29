import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // PostgreSQL database configuration
  // The pg library uses Node.js-only modules (fs, path) that aren't available in Edge Runtime
  // This tells Next.js to keep pg as a server-side external package
  serverExternalPackages: ['pg'],
}

export default nextConfig


