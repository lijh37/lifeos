import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Sidebar, MobileNav } from "@/components/sidebar"
import { PwaHandler } from "@/components/pwa-handler"
import { PageAnimation } from "@/components/page-animation"
import { RouteLoadingBar } from "@/components/route-loading-bar"
import { Toaster } from "sonner"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "LifeOS - 生活助手",
  description: "个人生活助手，记录笔记、追踪习惯、管理预算",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "LifeOS" },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-512.png" />
        <meta name="theme-color" content="#ffffff" id="theme-color" />
      </head>
      <body className="h-full overflow-x-hidden">
        <ThemeProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              className: "text-sm",
              duration: 3000,
            }}
          />
          <PwaHandler />
          <RouteLoadingBar />
          <div className="flex h-full">
            <Sidebar />
            <PageAnimation>
              <main className="pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
            </PageAnimation>
            <MobileNav />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
