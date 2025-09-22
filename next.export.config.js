/** @type {import('next').NextConfig} */
// This config is meant to be used with NODE_ENV=export-static
// Check if we're in export mode
const isExport = process.env.NODE_ENV === "export-static";

const nextConfig = {
  // Static HTML export for cPanel hosting
  output: "export",

  // Disable source maps for better performance
  productionBrowserSourceMaps: false,

  // Only include static pages
  exportPathMap: async function () {
    // Only include static pages, not dynamic routes
    return {
      "/": { page: "/" },
      "/auth/login": { page: "/auth/login" },
      "/auth/signup": { page: "/auth/signup" },
    };
  },

  // Image configuration for static export
  images: {
    unoptimized: true,
    domains: ["localhost", "noreen-events.online"],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/events-api/uploads/**",
      },
      {
        protocol: "https",
        hostname: "noreen-events.online",
        pathname: "/events-api/uploads/**",
      },
      {
        protocol: "https",
        hostname: "**",
        pathname: "/**",
      },
    ],
  },

  // No headers for static export
};

module.exports = nextConfig;
