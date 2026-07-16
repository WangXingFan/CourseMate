import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  experimental: {
    useTypeScriptCli: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
