/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@heard/database", "@heard/shared", "@heard/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
};

export default nextConfig;
