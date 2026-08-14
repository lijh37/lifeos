/**
 * 主题初始化脚本注入（build:mobile 后处理）
 *
 * 背景（真机复现确认）：
 * 1. 静态导出（APK）下，服务端组件/next/script 中的内联 <script> 只进入 RSC 载荷
 *    （self.__next_f.push），不会产出真实可执行标签（dev/SSR 正常、APK 失效）。
 * 2. 即使构建期注入真实 <script>（本脚本），React 水合在导出下会报 #418 并恢复重渲染，
 *    把 documentElement 上已应用的 .dark 类重置掉。因此必须定时重应用兜底
 *    （幂等：重复执行只是重设同一状态；0.3s/1s/2.5s/load 覆盖水合恢复窗口）。
 *
 * 幂等：已含 id="lifeos-theme-init" 的页面跳过（重复构建安全）。
 */
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.join(process.cwd(), '.next-export')
const SCRIPT_ID = 'lifeos-theme-init'

const THEME_SCRIPT = `(function(){function apply(){try{var s=localStorage.getItem('lifeos-theme');var dark=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark);document.documentElement.style.colorScheme=dark?'dark':'light'}catch(e){}}apply();try{window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',apply)}catch(e){}try{document.addEventListener('visibilitychange',function(){if(!document.hidden)apply()})}catch(e){}try{setTimeout(apply,300)}catch(e){}try{setTimeout(apply,1000)}catch(e){}try{setTimeout(apply,2500)}catch(e){}try{window.addEventListener('load',apply)}catch(e){}})();`

function collectHtml(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) collectHtml(p, acc)
    else if (entry.name.endsWith('.html')) acc.push(p)
  }
  return acc
}

if (!fs.existsSync(OUT)) {
  console.error(`✗ 未找到导出目录 ${OUT}（请先运行 build:mobile）`)
  process.exit(1)
}

const files = collectHtml(OUT)
let injected = 0
for (const file of files) {
  let html = fs.readFileSync(file, 'utf-8')
  if (html.includes(`id="${SCRIPT_ID}"`)) continue
  if (!html.includes('<head>')) {
    console.warn(`⚠ 跳过无 <head> 的页面：${file}`)
    continue
  }
  html = html.replace(
    '<head>',
    `<head>\n<script id="${SCRIPT_ID}">${THEME_SCRIPT}</script>`
  )
  fs.writeFileSync(file, html)
  injected++
}

console.log(`[inject-theme-init] 已注入 ${injected}/${files.length} 个 HTML（${SCRIPT_ID}）`)
