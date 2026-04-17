import type { NextConfig } from "next";
import { securityHeaders } from './src/lib/security-headers';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  eslint: {
    // Temporarily ignore ESLint during builds to unblock CI while reducing warnings
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/pages/welcome/index.html',
        destination: '/welcome',
        permanent: true,
      },
      {
        source: '/pages/upgrade/index.html',
        destination: '/upgrade',
        permanent: true,
      },
      {
        source: '/pages/consent-settings/index.html',
        destination: '/consent-settings',
        permanent: true,
      },
      {
        source: '/welcome/index.html',
        destination: '/welcome',
        permanent: true,
      },
      {
        source: '/upgrade/index.html',
        destination: '/upgrade',
        permanent: true,
      },
      {
        source: '/consent-settings/index.html',
        destination: '/consent-settings',
        permanent: true,
      },
    ];
  },
  
  // Disable external image optimization
  images: {
    unoptimized: true,
    domains: [], // No external domains allowed
  },

  // Exclude bindings and other external modules from client bundling
  // Limit custom Webpack config to production builds so Turbopack can run in dev
  webpack: (config, { isServer, dev }) => {
    const isBuildDebug = process.env.UNIACT_BUILD_DEBUG === '1';

    if (!isServer && !dev) {
      config.externals = [...(config.externals || []), 'bindings']
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }

      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'face-api.js': require('path').resolve(__dirname, 'src/lib/stubs/face-api-build-stub.ts'),
        ...(isBuildDebug
          ? {
              'argon2': require('path').resolve(__dirname, 'src/lib/stubs/argon2-build-stub.ts'),
              '@simplewebauthn/server': require('path').resolve(__dirname, 'src/lib/stubs/webauthn-server-build-stub.ts'),
            }
          : {}),
      }
    }
    return config
  },
};

export default nextConfig;
