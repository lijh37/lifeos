import type { Metadata } from "next"
import Script from "next/script"
import "./globals.css"
import { Sidebar, MobileNav } from "@/components/sidebar"
import { PageAnimation } from "@/components/page-animation"
import { RouteLoadingBar } from "@/components/route-loading-bar"
import { Toaster } from "sonner"

export const metadata: Metadata = {
  title: "LifeOS - 生活助手",
  description: "个人生活助手，记录笔记、追踪习惯、管理预算",
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

// 备案号页脚：仅公网域名部署（ECS Docker）时通过 NEXT_PUBLIC_ICP_BEIAN 注入；
// APK / 桌面本地（localhost）非公开网站不要求展示，不设变量即不渲染。
const ICP_BEIAN = process.env.NEXT_PUBLIC_ICP_BEIAN

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="h-full overflow-x-hidden">
        {/* 旧 PWA 清理：sw.js 已移除，但浏览器已注册的 Service Worker 不会因 404 自动注销，
            会持续拉取 /sw.js 并缓存旧静态资源。每次加载显式注销并清空缓存自愈。 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){for(var i=0;i<rs.length;i++){rs[i].unregister()}})}if('caches'in window){caches.keys().then(function(ks){for(var i=0;i<ks.length;i++){caches.delete(ks[i])}})}}catch(e){}})();`,
          }}
        />
        {/* 主题应用：localStorage('lifeos-theme') ∈ system|light|dark，缺省跟随系统。
            必须用 next/script beforeInteractive —— 静态导出（APK）下服务端组件的
            dangerouslySetInnerHTML <script> 只进 RSC 载荷、不产出真实标签（曾导致
            APK 内主题完全不生效，真机复现确认）；beforeInteractive 会在 <head> 输出
            真实内联脚本，首帧执行避免闪烁。设置页可切换（app/settings/page.tsx）。
            visibilitychange 兜底 WebView 后台切系统深色时 change 事件不触发。 */}
        <Script
          id="lifeos-theme-init"
          strategy="beforeInteractive"
        >
          {`(function(){function apply(){try{var s=localStorage.getItem('lifeos-theme');var dark=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark);document.documentElement.style.colorScheme=dark?'dark':'light'}catch(e){}}apply();try{window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',apply)}catch(e){}try{document.addEventListener('visibilitychange',function(){if(!document.hidden)apply()})}catch(e){}})();`}
        </Script>
        <Toaster
          position="top-center"
          toastOptions={{
            className: "text-sm",
            duration: 3000,
          }}
        />
        <RouteLoadingBar />
        <div className="flex h-full">
          <Sidebar />
          <PageAnimation>
            <main className="pt-[env(safe-area-inset-top)] pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
              {children}
              {ICP_BEIAN ? (
                <footer className="flex justify-center px-4 py-5 md:justify-start">
                  <a
                    href="https://beian.miit.gov.cn/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                  >
                    {ICP_BEIAN}
                  </a>
                </footer>
              ) : null}
            </main>
          </PageAnimation>
          <MobileNav />
        </div>
      </body>
    </html>
  )
}
