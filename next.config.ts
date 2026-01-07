import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Disable static optimization for pages that use Firebase
  // This prevents build errors when Firebase credentials aren't set
  experimental: {
    // Allow dynamic rendering
  },
};

export default nextConfig;
