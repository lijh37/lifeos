import type { NextConfig } from "next";

let nextConfig: NextConfig = {
  serverExternalPackages: ['@libsql/client'],
  experimental: {
    proxyClientMaxBodySize: '10mb',
  },
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },
};

if (process.env.ANALYZE === 'true') {
  // next.config.ts 被 Next.js 转译为 CJS，require() 在此安全
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
  })
  nextConfig = withBundleAnalyzer(nextConfig)
}

export default nextConfig;
