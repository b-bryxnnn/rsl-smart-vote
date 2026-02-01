import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // PostgreSQL database configuration
  // The pg library uses Node.js-only modules (fs, path) that aren't available in Edge Runtime
  serverExternalPackages: ['pg', 'pg-pool', 'pg-connection-string', 'pgpass'],

  // Webpack configuration to handle pg library externals
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark pg-related modules as external to prevent bundling
      config.externals = config.externals || [];
      config.externals.push({
        'pg': 'commonjs pg',
        'pg-native': 'commonjs pg-native',
        'pg-pool': 'commonjs pg-pool',
        'pg-connection-string': 'commonjs pg-connection-string',
        'pgpass': 'commonjs pgpass',
      });
    }
    return config;
  },
}

export default nextConfig


