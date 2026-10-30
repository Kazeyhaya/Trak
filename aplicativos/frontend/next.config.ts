import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  connect-src 'self' https: wss: http://localhost:* ws://localhost:*;
  worker-src 'self' blob:;
  ${isProd ? "upgrade-insecure-requests;" : ""}
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 128, 200, 240, 384],
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
      { protocol: "https", hostname: "media.rawg.io", pathname: "/media/**" },
      { protocol: "https", hostname: "covers.openlibrary.org", pathname: "/b/**" },
      { protocol: "https", hostname: "cdn2.steamgriddb.com", pathname: "/**" },
      { protocol: "https", hostname: "books.google.com", pathname: "/**" },
      { protocol: "https", hostname: "assets.hardcover.app", pathname: "/**" }
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" }
        ]
      },
      {
        // O navegador precisa sempre buscar a versao mais nova do service worker.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }
        ]
      }
    ];
  }
};

export default nextConfig;
