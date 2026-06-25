import type { NextConfig } from "next";

// Backend URL is a SERVER-SIDE private variable — never exposed to the browser.
// Set BACKEND_URL in .env.local for dev, or in the host environment for production.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

const nextConfig: NextConfig = {
  // Allow all common private IP ranges to reach the dev server.
  // Covers 192.168.x.x, 10.x.x.x, and 172.16–31.x.x (RFC 1918) and *.local mDNS.
  // No specific IP is hardcoded — any device on a private network is allowed.
  allowedDevOrigins: [
    "*.local",
    "192.168.*.*",
    "10.*.*.*",
    "172.16.*.*",
  ],
  turbopack: {
    root: __dirname,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },

  /**
   * API Rewrites — Next.js server proxies /api/v1/* to the NestJS backend.
   *
   * Benefits:
   *  • Browser sees only the frontend origin (no cross-origin API calls)
   *  • No CORS configuration needed in the browser
   *  • Works on localhost, LAN, production without code changes
   *  • Only BACKEND_URL env var needs to change per environment
   *
   * Nginx / Apache (production):
   *  Keep these rewrites OR let the reverse proxy handle /api/v1/* directly.
   */
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
