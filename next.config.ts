import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next.js doesn't infer it from an unrelated
  // lockfile higher up the tree (e.g. ~/package-lock.json).
  turbopack: {
    root: __dirname,
  },
  // Hide the dev overlay badge so it doesn't pollute visual-diff screenshots.
  devIndicators: false,
};

export default nextConfig;
