/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@freshsheet/database", "@freshsheet/shared", "@freshsheet/ui"],
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
