import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-ebe0a22eb8c24fb5833c1ebbce55fd3d.r2.dev",
      },
    ],
  },
  // Allow large file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "55mb",
    },
  },
};

export default nextConfig;
