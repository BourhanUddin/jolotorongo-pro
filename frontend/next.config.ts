import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow images from any source
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // API proxy to avoid CORS in dev
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
