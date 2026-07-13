import type { NextConfig } from "next";

/**
 * Content-Security-Policy.
 * 'unsafe-inline'/'unsafe-eval' on script-src are required by Next.js's
 * inline bootstrap/runtime; the high-value protections here are
 * frame-ancestors (anti-clickjacking), object-src 'none', base-uri and
 * form-action 'self'. media/img allow blob: for mascot video + TTS audio.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Don't advertise the framework/version in X-Powered-By (fingerprinting).
  poweredByHeader: false,
  // Pin the workspace root to this project — a stray lockfile in the home
  // directory otherwise makes Next infer the wrong root and pull in files
  // (e.g. the bundled manyasha-main subproject) outside this app.
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
