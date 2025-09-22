/** @type {import('next').NextConfig} */

const nextConfig = {
  // Static HTML export for landing pages only
  output: "export",

  // Disable source maps for better performance
  productionBrowserSourceMaps: false,

  // Optimize webpack configuration
  webpack: (config) => {
    // Optimize module resolution
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },

  // Image configuration for static export
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "noreen-events.online",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**",
        pathname: "/**",
      },
    ],
    domains: ["localhost", "noreen-events.online"],
  },

  // For App Router, we need to be specific about which paths to include
  // This is achieved by only including the app/page.tsx and a few auth pages
  distDir: ".next-landing",
  trailingSlash: true,

  // Disable routing features that don't work with static export
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
};

module.exports = nextConfig;
