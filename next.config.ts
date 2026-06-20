import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.31.111'],
  serverExternalPackages: ['@libsql/client'],
};

export default nextConfig;
