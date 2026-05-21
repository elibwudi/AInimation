import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ['10.255.1.103', 'localhost:7001'],
  devIndicators: false,
};

export default nextConfig;
