import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
