/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@sourcery/database", "@sourcery/shared", "@sourcery/ui"],
};

export default nextConfig;
