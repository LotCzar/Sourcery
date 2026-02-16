/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@sourcery/database", "@sourcery/shared", "@sourcery/ui"],
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
