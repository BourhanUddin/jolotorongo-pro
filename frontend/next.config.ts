import type { NextConfig } from "next";
import path from "node:path";

const backendApiUrl = process.env.BACKEND_API_URL || "http://localhost:5000/api";
const backendAssetUrl = backendApiUrl.replace(/\/api\/?$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.0.100"],
  turbopack: {
    root: path.resolve(__dirname),
  },
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
        destination: `${backendApiUrl}/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendAssetUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
