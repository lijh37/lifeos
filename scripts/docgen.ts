/**
 * 文档生成脚本（docs:gen）
 *
 * 从 git 跟踪文件（git ls-files）生成两个自动维护区块，原地写回 AGENTS.md：
 *   1. <!-- docgen:tree -->  目录树（全量已跟踪文件，目录在前、文件在后，各自字母序）
 *   2. <!-- docgen:tests --> 单元测试清单（*.test.ts / *.test.tsx / 含 __tests__/ 的路径，静态扫描）
 *
 * 任一标记块缺失 → 报错并以退出码 1 结束（需先在 AGENTS.md 的对应章节添加标记）。
 * 无第三方依赖（node:fs / node:child_process / node:path）。
 *
 * 用法：npm run docs:gen（= tsx scripts/docgen.ts）
 */

import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = process.cwd()
const AGENTS_PATH = path.join(ROOT, 'AGENTS.md')

// ─── 基础工具 ───────────────────────────────────────────────────────────────

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8')
}

function getTrackedFiles(): string[] {
  try {
    const out = execSync('git ls-files', { cwd: ROOT, encoding: 'utf-8' })
    return out.split('\n').filter(f => f.trim() !== '')
  } catch (err) {
    console.error('✗ 无法执行 `git ls-files`，请确认当前目录位于 git 仓库内。')
    console.error('  ' + (err as Error).message.split('\n')[0])
    process.exit(1)
  }
}

// ─── 区块查找与替换 ─────────────────────────────────────────────────────────
// 等价于正则：<!-- docgen:NAME -->([\s\S]*?)<!-- /docgen:NAME -->

function findBlock(src: string, name: string): { innerStart: number; innerEnd: number } | null {
  const open = `<!-- ${name} -->`
  const close = `<!-- /${name} -->`
  const openIdx = src.indexOf(open)
  if (openIdx === -1) return null
  const innerStart = openIdx + open.length
  const closeIdx = src.indexOf(close, innerStart)
  if (closeIdx === -1) return null
  return { innerStart, innerEnd: closeIdx }
}

function replaceBlock(
  src: string,
  name: string,
  generated: string
): { src: string; oldBytes: number; newBytes: number } {
  const block = findBlock(src, name)
  if (!block) {
    console.error(`✗ AGENTS.md 中未找到标记块：<!-- ${name} --> ... <!-- /${name} -->`)
    console.error(`  请先在 AGENTS.md 的对应章节添加该标记后重试。`)
    process.exit(1)
  }
  const oldContent = src.slice(block.innerStart, block.innerEnd)
  const newContent = `\n${generated.trimEnd()}\n`
  return {
    src: src.slice(0, block.innerStart) + newContent + src.slice(block.innerEnd),
    oldBytes: Buffer.byteLength(oldContent, 'utf-8'),
    newBytes: Buffer.byteLength(newContent, 'utf-8'),
  }
}

// ─── 区块 1：目录树 ──────────────────────────────────────────────────────────

interface TreeNode {
  children: Map<string, TreeNode>
  isFile: boolean
}

function renderTree(node: TreeNode, prefix: string, out: string[]): void {
  // 目录在前、文件在后，各自按字母序（code unit 序，确定性输出）
  const entries = [...node.children.entries()].sort((a, b) => {
    const aIsDir = !a[1].isFile
    const bIsDir = !b[1].isFile
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
  })
  entries.forEach(([name, child], i) => {
    const last = i === entries.length - 1
    out.push(prefix + (last ? '└── ' : '├── ') + name + (child.isFile ? '' : '/'))
    if (!child.isFile && child.children.size > 0) {
      renderTree(child, prefix + (last ? '    ' : '│   '), out)
    }
  })
}

function buildTree(files: string[]): TreeNode {
  const root: TreeNode = { children: new Map(), isFile: false }
  for (const f of files) {
    const parts = f.split('/')
    let cur = root
    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1
      if (!cur.children.has(parts[i])) {
        cur.children.set(parts[i], { children: new Map(), isFile: isLast })
      }
      cur = cur.children.get(parts[i])!
    }
  }
  return root
}

function generateTreeBlock(files: string[]): string {
  const lines: string[] = [path.basename(ROOT) + '/']
  renderTree(buildTree(files), '', lines)
  return [
    '> 本目录树由 npm run docs:gen 自动生成，基于 git 跟踪文件；可能滞后于未提交的新文件。',
    '',
    '```',
    ...lines,
    '```',
  ].join('\n')
}

// ─── 区块 2：单元测试清单 ────────────────────────────────────────────────────

// 粗略计数：匹配 it(/test(/it.each(/test.each(，按出现行号去重（同一行多个算一次，
// 避免多行 describe 嵌套误计）。计数为近似值，精确数字以 npm test 实际输出为准。
function countTests(src: string): number {
  const re = /\b(?:it|test)(?:\.each)?\s*\(/g
  const lines = new Set<number>()
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    const line = src.slice(0, m.index).split('\n').length
    lines.add(line)
  }
  return lines.size
}

// describe() 标题 → 中文覆盖范围（规则全部来自代码中的 describe 字符串，按需增补）
const DESCRIBE_TRANSLATIONS: Array<[RegExp, string]> = [
  [/^Notes$/i, '笔记'],
  [/^Habits$/i, '习惯'],
  [/^Budgets$/i, '预算'],
  [/^Search and Tags$/i, '搜索与标签'],
  [/^API routes$/i, 'API 路由'],
  [/^MarkdownRenderer sanitization \(stored-XSS defense\)$/i, 'MarkdownRenderer XSS 净化'],
  [/^proxy middleware$/i, '中间件认证'],
  [/^useAppStore$/i, 'Zustand store'],
]

function longestCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return ''
  let prefix = strings[0]
  for (let i = 1; i < strings.length; i++) {
    while (!strings[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1)
      if (prefix === '') return ''
    }
  }
  return prefix
}

function inferCoverage(src: string): string {
  const titles: string[] = []
  for (const m of src.matchAll(/describe\(\s*['"]([^'"]+)['"]/g)) {
    if (!titles.includes(m[1])) titles.push(m[1])
  }
  if (titles.length === 0) return '—'

  // 公共前缀形如 "Database - " 的子套件 → 全部保留并翻译（如 db.test.ts）
  const commonPrefix = longestCommonPrefix(titles)
  let parts: string[]
  if (commonPrefix.length >= 5 && commonPrefix.trimEnd().endsWith('-')) {
    parts = titles.map(t => t.slice(commonPrefix.length))
  } else if (titles.every(t => /^[A-Za-z][A-Za-z0-9]*$/.test(t))) {
    parts = titles // 全部为单一单词（组件/函数名）→ 拼接
  } else {
    parts = [titles[0]] // 场景式 describe → 只取首个套件名
  }

  const translated = parts.map(t => {
    for (const [re, zh] of DESCRIBE_TRANSLATIONS) if (re.test(t)) return zh
    return t
  })

  let coverage = translated.join(' + ')
  if (coverage.length > 60) coverage = coverage.slice(0, 57) + '…'
  return coverage
}

// ─── Markdown 表格（列对齐） ────────────────────────────────────────────────

function displayWidth(s: string): number {
  return [...s].reduce((n, ch) => n + (ch.charCodeAt(0) > 0xff ? 2 : 1), 0)
}

function padCell(s: string, width: number): string {
  return s + ' '.repeat(Math.max(0, width - displayWidth(s)))
}

function buildTable(rows: string[][]): string {
  const widths = rows[0].map((_, ci) => Math.max(...rows.map(r => displayWidth(r[ci]))))
  const header = '| ' + rows[0].map((c, ci) => padCell(c, widths[ci])).join(' | ') + ' |'
  const separator = '| ' + widths.map(w => '-'.repeat(Math.max(3, w))).join(' | ') + ' |'
  const body = rows
    .slice(1)
    .map(r => '| ' + r.map((c, ci) => padCell(c, widths[ci])).join(' | ') + ' |')
  return [header, separator, ...body].join('\n')
}

function generateTestsBlock(files: string[]): string {
  const testFiles = files
    .filter(f => /\.test\.(ts|tsx)$/.test(f) || f.includes('__tests__/'))
    .sort()
  const header = ['文件', '测试数（约）', '覆盖范围']
  const rows = testFiles.map(f => {
    const src = readFile(f)
    return ['`' + f + '`', String(countTests(src)), inferCoverage(src)]
  })
  const table = buildTable([header, ...rows])
  return [
    '> 本清单由 npm run docs:gen 自动生成，计数为静态扫描近似值；精确数字以 npm test 实际输出为准。',
    '',
    table,
  ].join('\n')
}

// ─── 区块 3：命令表（package.json scripts 派生）────────────────────────────────

// 命令说明（唯一真相在 package.json scripts；说明在此登记，随 docgen 生成）
const COMMAND_DESCRIPTIONS: Record<string, string> = {
  dev: '自动建表 + 启动开发服务器（--webpack）',
  build: '生产构建',
  'build:mobile': '移动端静态导出 + 注入主题初始化脚本（输出 .next-export）',
  'cap:add': '添加 Capacitor Android 平台（首次构建执行一次）',
  'cap:sync': 'build:mobile 后同步 web 产物到 Android 工程（APK 构建核心步骤）',
  'build:apk': 'Gradle 构建 APK（先 cap:sync）',
  'deploy:mobile': '一键 APK 构建（build:mobile → cap sync → gradlew assembleDebug）',
  start: '生产启动',
  lint: 'ESLint',
  migrate: '幂等初始化数据库 schema（终态 DDL 重放）',
  test: 'vitest 单元测试',
  'test:watch': '测试 watch 模式',
  'test:e2e': 'Playwright E2E（自动起 dev server，隔离库自动清理）',
  analyze: '构建产物体积分析（@next/bundle-analyzer）',
  'docs:check': '文档契约断言（API/环境变量/Schema/命令/尺寸红线）',
  'docs:gen': '重新生成 AGENTS.md 生成区块（目录树/测试清单/命令表）',
}

function generateCommandsBlock(pkg: { scripts?: Record<string, string> }): string {
  const scripts = Object.entries(pkg.scripts ?? {})
    .filter(([name]) => !/^(pre|post)/.test(name))
    .sort((a, b) => a[0].localeCompare(b[0]))
  const header = ['命令', '说明']
  const rows = scripts.map(([name]) => [
    '`npm run ' + name + '`',
    COMMAND_DESCRIPTIONS[name] ?? '—（见 package.json）',
  ])
  const table = buildTable([header, ...rows])
  return [
    '> 本命令表由 npm run docs:gen 自动生成（package.json scripts 派生）；新增命令须在 package.json 登记。',
    '',
    table,
  ].join('\n')
}

// ─── 主流程 ──────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(AGENTS_PATH)) {
    console.error(`✗ 未找到 AGENTS.md（${AGENTS_PATH}），请在仓库根目录运行。`)
    process.exit(1)
  }

  const files = getTrackedFiles()
  const agents = readFile('AGENTS.md')
  const pkg = JSON.parse(readFile('package.json')) as { scripts?: Record<string, string> }

  const blocks: Array<{ name: string; generated: string }> = [
    { name: 'docgen:tree', generated: generateTreeBlock(files) },
    { name: 'docgen:tests', generated: generateTestsBlock(files) },
    { name: 'docgen:commands', generated: generateCommandsBlock(pkg) },
  ]

  let src = agents
  for (const b of blocks) {
    const r = replaceBlock(src, b.name, b.generated)
    src = r.src
    const delta = r.newBytes - r.oldBytes
    console.log(
      `[${b.name}] 区块已更新：${r.oldBytes} 字节 → ${r.newBytes} 字节（${delta >= 0 ? '+' : ''}${delta} 字节）`
    )
  }

  fs.writeFileSync(AGENTS_PATH, src)
  console.log('✅ AGENTS.md 已写回')
}

main()
