'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
}>({ theme: 'system', setTheme: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored) setTimeout(() => setTheme(stored))
  }, [])

  useEffect(() => {
    if (!mounted.current) return
    const root = document.documentElement
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    root.classList.toggle('dark', isDark)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', isDark ? '#0f172a' : '#ffffff')
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
