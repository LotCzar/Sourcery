/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ["@freshsheet/database", "@freshsheet/shared", "@freshsheet/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://img.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev",
              "font-src 'self' data:",
              "connect-src 'self' https://*.clerk.dev https://*.clerk.com https://*.clerk.accounts.dev https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.stripe.com https://api.resend.com",
              "frame-src https://*.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev https://challenges.cloudflare.com https://js.stripe.com",
              "worker-src 'self' blob:",
            ].join("; "),
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
