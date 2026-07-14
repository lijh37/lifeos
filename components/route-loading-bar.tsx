'use client'

import { usePathname, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

function LoadingBarInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const prevPathname = useRef(pathname)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const pathChanged = prevPathname.current !== pathname
    if (pathChanged) {
      prevPathname.current = pathname
      setIsLoading(true)
      const timer = setTimeout(() => setIsLoading(false), 400)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => setIsLoading(false), 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <div
      className={cn(
        "fixed left-0 top-0 z-[100] h-0.5 bg-primary transition-all duration-300 ease-in-out",
        isLoading ? "w-[90%] opacity-100" : "w-0 opacity-0",
      )}
      style={{ transitionProperty: "width, opacity" }}
      role="progressbar"
      aria-valuenow={isLoading ? 90 : 0}
      aria-valuemin={0}
      aria-valuemax={100}
    />
  )
}

export function RouteLoadingBar() {
  return (
    <Suspense fallback={null}>
      <LoadingBarInner />
    </Suspense>
  )
}
