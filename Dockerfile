# 多阶段构建 LifeOS（Next.js 16）
# 基础镜像 Node 22，匹配 package.json engines 要求

# ── 依赖阶段 ──
FROM node:22-alpine AS deps
WORKDIR /app
# 仅复制依赖清单，利用层缓存
COPY package.json package-lock.json* ./
RUN npm ci

# ── 构建阶段 ──
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 构建期不注入生产环境变量；运行时由容器 env 提供
RUN npm run build

# ── 运行阶段 ──
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 非 root 用户运行
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

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
RUN mkdir -p /app/data/uploads && chown -R nextjs:nodejs /app/data
USER nextjs

EXPOSE 3000
CMD ["npm", "run", "start"]
