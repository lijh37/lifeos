import type { NextConfig } from "next";

// 双轨构建：BUILD_TARGET=export 走 Capacitor 静态导出（无服务端运行时），否则 web SSR 构建。
// Next 无 --config 标志，标准做法是单文件内按环境变量分支。
const isExport = process.env.BUILD_TARGET === 'export';

let nextConfig: NextConfig = isExport
  ? {
      output: 'export',
      images: { unoptimized: true }, // export 下默认 image loader 不可用，必须 unoptimized
      // 不设 serverExternalPackages：export 无服务端运行时，@libsql/client 不会被打进 web bundle
      //（lib/db 动态 import 分支由 lib/services/env.ts 保证）
      distDir: '.next-export', // 隔离构建缓存，避免本地 web/mobile 构建互相污染 .next
      experimental: {
        proxyClientMaxBodySize: '10mb',
      },
      modularizeImports: {
        'lucide-react': {
          transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
        },
      },
    }
  : {
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
  // next.config.ts 被 Next.js 转译为 CJS，require() 在此安全（保留条件 require 避免生产环境加载 devDependency）
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
  })
  nextConfig = withBundleAnalyzer(nextConfig)
}

export default nextConfig;
