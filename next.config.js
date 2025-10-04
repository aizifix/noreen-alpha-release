/** @type {import('next').NextConfig} */

// Check if we're in export mode
const isExport = process.env.NODE_ENV === "export-static";

const nextConfig = {
  // Static HTML export for cPanel hosting
  ...(isExport && { output: "export" }),

  // Disable source maps for better performance
  productionBrowserSourceMaps: false,

  // Remove console.* calls in production builds (keeps errors if excluded)
  compiler: {
    removeConsole: {
      exclude: ["error"],
    },
  },

  // Optimize webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Disable source maps in development
    if (dev) {
      config.devtool = false;
    }

    // Optimize module resolution
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };

    return config;
  },

  // Reduce Fast Refresh rebuilds
  experimental: {
    optimizePackageImports: ["clsx", "lucide-react"],
  },

  // Configure server actions body size limit for file uploads
  serverActions: {
    bodySizeLimit: "10mb",
  },

  // Image configuration
  images: {
    ...(isExport && { unoptimized: true }),
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/events-api/uploads/**",
      },
      {
        protocol: "https",
        hostname: "noreen-events.online",
        pathname: "/events-api/uploads/**",
      },
      ...(isExport
        ? [
            {
              protocol: "https",
              hostname: "**",
              pathname: "/**",
            },
          ]
        : []),
    ],
    domains: ["localhost", "noreen-events.online"],
  },

  // Include only static routes
  ...(isExport && {
    // For App Router, we need to skip dynamic routes
    // and can't use exportPathMap
    trailingSlash: true,
    skipTrailingSlashRedirect: true,
  }),

  // Security headers
  async headers() {
    // Skip headers in export mode
    if (isExport) {
      return [];
    }

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self' http: https: data: blob:; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com blob:; " +
              "worker-src 'self' blob:; " +
              "child-src 'self' blob:; " +
              "style-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://fonts.googleapis.com; " +
              "font-src 'self' data: blob: https://fonts.googleapis.com https://fonts.gstatic.com; " +
              "connect-src 'self' http://localhost http://localhost:3000 ws://localhost:3000 http://localhost/events-api " +
              "http://192.168.0.100 http://192.168.0.100:3000 ws://192.168.0.100:3000 http://192.168.0.100/events-api " +
              "https://noreen-events.online https://noreen-events.online/noreen-events " +
              "https://www.google.com https://www.gstatic.com https://www.google-analytics.com data: blob:; " +
              "img-src 'self' data: blob: https: http: http://localhost:3000/uploads/ uploads/ " +
              "http://192.168.0.100:3000/uploads/ http://192.168.0.100/events-api/uploads/ " +
              "https://noreen-events.online/noreen-events/uploads/; " +
              "frame-src 'self' https://www.google.com/recaptcha/ https://www.recaptcha.net;",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=(), payment=()",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
