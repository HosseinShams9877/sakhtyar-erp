import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();
const nextConfig: NextConfig = {
  // output: "standalone" → فقط برای Docker/سروهای ابری فعال شود
  // در محیط preview باعث خطای 502 می‌شود
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    // If sharp (native image processing) is not available (common on Windows),
    // fall back to unoptimized image serving.
    // This prevents build/runtime errors when sharp fails to load.
    unoptimized: process.platform === 'win32',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/react-icons'],
  },
};

export default nextConfig;
