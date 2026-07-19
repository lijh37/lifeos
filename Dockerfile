# 多阶段构建 LifeOS（Next.js 16）
# 使用 npm ci（与 package-lock.json 严格一致，等价于 yarn --frozen-lockfile）
# 基础镜像 Node 22，匹配 package.json engines 要求

# ── 依赖阶段 ──
FROM node:22-slim AS deps
WORKDIR /app
# 默认使用公共 npm registry（registry.npmmirror.com 在容器内仅解析到 IPv6 易失败；
# 如需加速可传 --build-arg NPM_REGISTRY=https://registry.npmmirror.com 覆盖）
ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN npm config set registry ${NPM_REGISTRY}
# 仅复制依赖清单，利用层缓存
COPY package.json package-lock.json ./
# npm ci 要求 package-lock.json 存在且严格一致
RUN npm ci --no-audit --no-fund

# ── 构建阶段 ──
FROM node:22-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN npm config set registry ${NPM_REGISTRY}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 构建期不注入生产环境变量；运行时由容器 env 提供
RUN npm run build

# ── 运行阶段 ──
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 非 root 用户运行
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -s /bin/sh nextjs

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/next.config.ts ./next.config.ts

# 数据目录（SQLite + 上传附件），由 volume 挂载
# 必须预建 db/ 子目录，否则 libsql 打开 file:./data/db/lifeos.db 时父目录不存在报 SQLITE_CANTOPEN(14)
RUN mkdir -p /app/data/uploads /app/data/db && chown -R nextjs:nodejs /app/data
USER nextjs

EXPOSE 3000
CMD ["npm", "run", "start"]
