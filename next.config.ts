import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: this only applies when running Turbopack (`next dev` without `--webpack`).
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
