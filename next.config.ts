import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        // Yandex Object Storage (path-style: storage.yandexcloud.net/<bucket>/...)
        protocol: "https",
        hostname: "storage.yandexcloud.net",
      },
      {
        // Yandex Object Storage (virtual-hosted style: <bucket>.storage.yandexcloud.net)
        protocol: "https",
        hostname: "*.storage.yandexcloud.net",
      },
    ],
  },
  async headers() {
    return [
      {
        // Never cache the service worker — ensures updates reach devices immediately
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
