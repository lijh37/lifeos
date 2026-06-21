import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: process.env.LAN_IP ? [process.env.LAN_IP] : [],
  serverExternalPackages: ['@libsql/client'],
};

export default nextConfig;
