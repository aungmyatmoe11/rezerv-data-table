import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This repo is nested inside a larger workspace; pin the Turbopack root so lockfile discovery stays local.
  turbopack: { root: path.resolve(import.meta.dirname) },
};

export default nextConfig;
