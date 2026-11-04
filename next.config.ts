import type { NextConfig } from "next";
import { getProductionSecurityHeaders } from "./src/lib/transport-security";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return getProductionSecurityHeaders(process.env.NODE_ENV);
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
