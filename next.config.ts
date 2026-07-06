import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'no-cache' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      { hostname: '*.supabase.co' },
      { hostname: 'greenhouse.io' },
    ],
  },
  // Compress and optimize
  compress: true,
  poweredByHeader: false,
}

export default nextConfig
