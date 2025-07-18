import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable source maps for better performance
  productionBrowserSourceMaps: false,

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

  // Image configuration
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/events-api/uploads/**",
      },
    ],
    domains: ["localhost"],
  },

  // Security headers
  async headers() {
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
              "https://www.google.com https://www.gstatic.com https://www.google-analytics.com data: blob:; " +
              "img-src 'self' data: blob: https: http: http://localhost:3000/uploads/ http://localhost/events-api/uploads/ " +
              "http://192.168.0.100:3000/uploads/ http://192.168.0.100/events-api/uploads/; " +
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

export default nextConfig;
