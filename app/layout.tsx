import type { Metadata } from "next"
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
    >
      <body className="h-full overflow-x-hidden">
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
            <main className="pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
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
