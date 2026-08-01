/**
 * 文档契约断言脚本（docs:check）
 *
 * 把关键契约硬编码为「唯一真相」，检查代码与 AGENTS.md 文档是否一致：
 *   断言组 1：API 路径 + 导出 HTTP 方法（route.ts 实际导出 === 契约清单，不多不少）
 *   断言组 2：关键契约细节
 *             - notes/batch action 白名单含 'tag'、不含已废弃 'addTag'
 *             - attachments DELETE 用 'attachmentId' 参数、不含已废弃 '?url='
 *             - AGENTS.md 防回潮：不得出现已废弃表述
 *             - AGENTS.md 必须包含全部契约路径字符串
 *   断言组 3：环境变量双向一致性
 *             - 代码引用 ⊆ 文档表 ∪ 白名单 ∪ 平台内置（缺文档表记录 → 报错）
 *             - 文档表有但代码无引用 → 仅 info 提示
 *   断言组 4：README 技术栈版本 vs package.json
 *             - README 出现的三段版本号 ⊆ package.json 依赖版本（升级依赖须同步 README）
 *   断言组 5：AGENTS.md 环境变量表 vs .env 示例文件
 *             - 文档表变量 ⊆ .env.example / .env.prod.example（新增变量须同步示例文件）
 *             - 示例文件有但表无 → 仅 info 提示
 *
 * 任一断言失败 → 退出码 1。无第三方依赖（node:fs / node:child_process / node:path）。
 *
 * 用法：npm run docs:check（= tsx scripts/docs-check.ts）
 */

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = process.cwd()

let passes = 0
let failures = 0

function ok(msg: string) {
  passes++
  console.log(`  ✓ ${msg}`)
}
function fail(msg: string) {
  failures++
  console.error(`  ✗ ${msg}`)
}
function info(msg: string) {
  console.log(`  ℹ ${msg}`)
}
function assert(cond: boolean, msg: string) {
  cond ? ok(msg) : fail(msg)
}
function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8')
}

// ─── 断言组 1：API 路径与 HTTP 方法存在性 ──────────────────────────────────
console.log('\n[断言组 1] API 路径与 HTTP 方法存在性')

// 契约清单（唯一真相）：路径 → 应导出方法集合（不多不少）
const API_CONTRACTS: Array<{ path: string; methods: string[] }> = [
  { path: '/api/auth', methods: ['POST'] },
  { path: '/api/notes', methods: ['GET', 'POST', 'DELETE'] },
  { path: '/api/notes/[id]', methods: ['GET', 'PATCH', 'DELETE'] },
  { path: '/api/notes/batch', methods: ['POST'] },
  { path: '/api/notes/[id]/attachments', methods: ['GET', 'POST', 'DELETE'] },
  { path: '/api/budgets', methods: ['GET', 'POST'] },
  { path: '/api/habits', methods: ['GET', 'POST', 'PATCH', 'DELETE'] },
  { path: '/api/tags', methods: ['GET', 'PATCH', 'DELETE'] },
  { path: '/api/backup', methods: ['GET', 'POST'] },
  { path: '/api/export', methods: ['GET'] },
  { path: '/api/weight', methods: ['GET', 'POST', 'DELETE'] },
]

for (const c of API_CONTRACTS) {
  const rel = path.posix.join('app', c.path.replace(/^\//, ''), 'route.ts')

  if (!fs.existsSync(path.join(ROOT, rel))) {
    fail(`${c.path}：缺少 route 文件 ${rel}`)
    continue
  }

  const src = readFile(rel)
  const exported = new Set(
    [...src.matchAll(/export\s+async\s+function\s+(GET|POST|PATCH|DELETE)\b/g)].map(m => m[1])
  )
  const expected = new Set(c.methods)
  const missing = [...expected].filter(m => !exported.has(m))
  const extra = [...exported].filter(m => !expected.has(m))

  if (missing.length === 0 && extra.length === 0) {
    ok(`${c.path} 导出方法 [${c.methods.join(', ')}]（${rel}）`)
  } else {
    fail(
      `${c.path}（${rel}）方法不匹配：期望 [${c.methods.join(', ')}]，实际 [${[...exported].join(', ')}]` +
      (missing.length ? `；缺失 ${missing.join(', ')}` : '') +
      (extra.length ? `；多余 ${extra.join(', ')}` : '')
    )
  }
}

// ─── 断言组 2：关键契约细节 ────────────────────────────────────────────────
console.log('\n[断言组 2] 关键契约细节')

// 2.1 notes/batch：action 白名单含 'tag'，不含已废弃 'addTag'
const batchSrc = readFile('app/api/notes/batch/route.ts')
assert(
  /action\s*===\s*'tag'/.test(batchSrc) && batchSrc.includes("'tag'"),
  'notes/batch action 白名单含 "tag"（存在 action === \'tag\' 分支）'
)
assert(!batchSrc.includes('addTag'), 'notes/batch 不含已废弃 action "addTag"')

// 2.2 attachments DELETE：使用 attachmentId 参数，而非 ?url=
const attSrc = readFile('app/api/notes/[id]/attachments/route.ts')
assert(attSrc.includes('attachmentId'), 'attachments DELETE 使用 "attachmentId" 参数')
assert(!attSrc.includes('?url='), 'attachments 不含已废弃删除参数 "?url="')

// 2.3 AGENTS.md 防回潮：全文不得出现已废弃表述（精确匹配）
const agents = readFile('AGENTS.md')
const DEPRECATED_PHRASES = ['addTag', '?url=', '游标分页', '校验和']
for (const phrase of DEPRECATED_PHRASES) {
  assert(!agents.includes(phrase), `AGENTS.md 不含已废弃表述 "${phrase}"`)
}

// 2.4 AGENTS.md 必须包含每个契约路径字符串
const CONTRACT_PATHS = API_CONTRACTS.map(c => c.path)
for (const p of CONTRACT_PATHS) {
  assert(agents.includes(p), `AGENTS.md 包含契约路径 "${p}"`)
}

// ─── 断言组 3：环境变量双向一致性 ───────────────────────────────────────────
console.log('\n[断言组 3] 环境变量双向一致性')

// 代码侧：git ls-files 中的 .ts/.tsx/.js/.mjs（node_modules 不会被 git 跟踪）
const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf-8' })
  .split('\n')
  .filter(f => /\.(ts|tsx|js|mjs)$/.test(f))

const codeEnv = new Set<string>()
for (const f of tracked) {
  const src = readFile(f)
  for (const m of src.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
    codeEnv.add(m[1])
  }
}

// 文档侧：AGENTS.md 环境变量表（表格行 `| \`NAME\` | ...`）
const docEnv = new Set<string>()
for (const m of agents.matchAll(/^\|\s*`([A-Z0-9_]+)`\s*\|/gm)) {
  docEnv.add(m[1])
}

// 白名单：代码无直接引用但文档有记录的合理差异（BLOB_READ_WRITE_TOKEN 由
// @vercel/blob 隐式读取；BASE_URL 仅 E2E 使用，文档保留记录）
const WHITELIST = new Set(['BLOB_READ_WRITE_TOKEN', 'BASE_URL'])
// 平台/CI 注入的内置变量，非应用配置，无需在文档表中记录
const PLATFORM_ENV = new Set(['NODE_ENV', 'CI'])

const codeOnly = [...codeEnv]
  .filter(v => !docEnv.has(v) && !WHITELIST.has(v) && !PLATFORM_ENV.has(v))
  .sort()
const docOnly = [...docEnv].filter(v => !codeEnv.has(v)).sort()

if (codeOnly.length === 0) {
  ok('代码引用的环境变量 ⊆ 文档表 ∪ 白名单 ∪ 平台内置')
} else {
  fail(
    `代码引用了但 AGENTS.md 环境变量表未记录：${codeOnly.join(', ')}` +
    '（新增环境变量需同步文档表）'
  )
}

for (const v of docOnly) {
  info(`文档表有记录但代码无直接引用（合理差异，不报错）：${v}`)
}

// ─── 断言组 4：README 技术栈版本 vs package.json ─────────────────────────────
console.log('\n[断言组 4] README 技术栈版本 vs package.json')

const pkg = JSON.parse(readFile('package.json')) as {
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

// V_pkg：dependencies + devDependencies 中的三段版本号（"^16.2.9" → "16.2.9"，
// "^5" / "^4" 等纯 major 版本无三段版本，不提取）。
// 另纳入根 version 字段：README「版本: 0.2.1」与 package.json 的 version 对应，
// 同属版本漂移守护范围（项目版本升级同样需要同步 README）。
const pkgVersionStrings = [
  ...Object.values(pkg.dependencies ?? {}),
  ...Object.values(pkg.devDependencies ?? {}),
  pkg.version ?? '',
]
const V_PKG = new Set<string>()
for (const v of pkgVersionStrings) {
  for (const m of v.matchAll(/\d+\.\d+\.\d+/g)) {
    V_PKG.add(m[0])
  }
}

// V_readme：README 全文所有三段版本号（"Node >= 20" 不含三段版本，不会误匹配）
const readme = readFile('README.md')
const V_README = [...new Set([...readme.matchAll(/\b\d+\.\d+\.\d+\b/g)].map(m => m[0]))]

const readmeOnly = V_README.filter(v => !V_PKG.has(v))
if (readmeOnly.length === 0) {
  ok(`README 出现的三段版本号 [${V_README.join(', ')}] ⊆ package.json 依赖版本`)
} else {
  fail(
    `README 出现但 package.json 依赖中不存在：${readmeOnly.join(', ')}` +
    '（依赖升级后需同步 README 技术栈章节；若为项目版本或其他非依赖版本号，请人工确认）'
  )
}

// ─── 断言组 5：AGENTS.md 环境变量表 vs .env 示例文件 ────────────────────────
console.log('\n[断言组 5] AGENTS.md 环境变量表 vs .env 示例文件')

// V_docs 复用断言组 3 的 docEnv 提取结果（AGENTS.md 环境变量表 `| \`NAME\` |` 行）
// V_env：合并两份示例文件全文提取。正则锚定到赋值形式 `NAME=`（注释掉的赋值也算，
// 如 `# ANALYZE=1`），避免把注释里的普通大写单词（OS/SQL/HTTP 等）误当成变量名。
const V_ENV = new Set<string>()
for (const m of `${readFile('.env.example')}\n${readFile('.env.prod.example')}`.matchAll(/[A-Z][A-Z0-9_]+(?==)/g)) {
  V_ENV.add(m[0])
}

const envMissing = [...docEnv].filter(v => !V_ENV.has(v)).sort()
if (envMissing.length === 0) {
  ok('AGENTS.md 环境变量表的每个变量在 .env 示例文件（.env.example / .env.prod.example）中出现')
} else {
  fail(
    `AGENTS.md 环境变量表有记录但 .env 示例文件缺失：${envMissing.join(', ')}` +
    '（新增环境变量需同步 .env.example / .env.prod.example）'
  )
}

const envOnly = [...V_ENV].filter(v => !docEnv.has(v)).sort()
for (const v of envOnly) {
  info(`示例文件有但环境变量表无记录（合理冗余/注释指引，不报错）：${v}`)
}

// ─── 汇总与退出码 ───────────────────────────────────────────────────────────
console.log(`\n—— 结果：${passes} 项通过，${failures} 项失败 ——`)
if (failures > 0) {
  console.error('docs:check 失败（代码与 AGENTS.md 契约不一致）')
  process.exit(1)
}
console.log('docs:check 全部通过')
