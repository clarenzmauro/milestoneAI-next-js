import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  crossOrigin: "anonymous",
  productionBrowserSourceMaps: false,
  output: "standalone",
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "react-icons",
      "@radix-ui/react-icons",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  compiler: isProd
    ? {
        removeConsole: { exclude: ["error", "warn"] },
      }
    : undefined,
  /**
   * @description
   * Returns security and caching headers for all routes. CSP is configured to
   * support Clerk auth, Convex, and Gemini. Adds worker-src for Clerk web
   * workers and allows Clerk telemetry domain in connect-src.
   *
   * @receives data from:
   * - Next.js runtime; build-time header injection
   *
   * @sends data to:
   * - HTTP clients; sets strict security and cache headers
   *
   * @sideEffects:
   * - None beyond response headers
   */
  async headers() {
    const securityHeaders = [
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          // Allow Clerk and other third-party scripts if needed
          "script-src 'self' 'unsafe-inline' https: https://*.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev",
          "style-src 'self' 'unsafe-inline' https:",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data: https:",
          "connect-src 'self' https://*.convex.cloud https://api.clerk.com https://*.clerk.accounts.dev https://*.clerk.com https://generativelanguage.googleapis.com https://*.googleapis.com https://clerk-telemetry.com",
          "worker-src 'self' blob:",
          // Allow Clerk iFrames to render auth widgets
          "frame-src 'self' https://*.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev",
          "frame-ancestors 'none'",
          "form-action 'self'",
          "base-uri 'self'",
        ].join("; "),
      },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
    ];

    return [
      // Security headers for all routes
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // Long-term caching for Next.js static assets
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Long-term caching for common static assets in public
      {
        source:
          "/:all*(svg|png|jpg|jpeg|webp|gif|ico|ttf|otf|woff|woff2|eot)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
