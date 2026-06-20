'use client'

import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import { Sun, Moon, Monitor } from 'lucide-react'

const next: Record<string, 'light' | 'dark' | 'system'> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

const icons: Record<string, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const Icon = icons[theme]

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => setTheme(next[theme])}
      title={`主题: ${theme === 'light' ? '亮色' : theme === 'dark' ? '深色' : '跟随系统'}`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}
