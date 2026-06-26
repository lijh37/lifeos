import type { NextConfig } from "next";

let nextConfig: NextConfig = {
  allowedDevOrigins: ['*'],
  serverExternalPackages: ['@libsql/client'],
};

if (process.env.ANALYZE === 'true') {
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
  })
  nextConfig = withBundleAnalyzer(nextConfig)
}

export default nextConfig;
