import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*'],
  serverExternalPackages: ['@libsql/client'],
};

export default nextConfig;
