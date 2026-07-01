import type { NextConfig } from "next";

let nextConfig: NextConfig = {
  allowedDevOrigins: ['*'],
  serverExternalPackages: ['@libsql/client'],
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },
};

if (process.env.ANALYZE === 'true') {
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
  })
  nextConfig = withBundleAnalyzer(nextConfig)
}

export default nextConfig;
