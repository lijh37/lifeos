'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { login } from '@/lib/services/auth'

function LoginForm() {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const from = searchParams.get('from') || '/'
    login('')
      .then(d => { if (d.ok) window.location.href = from })
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await login(password)
      setLoading(false)
      if (data.ok) {
        window.location.href = searchParams.get('from') || '/'
      } else {
        setError('密码错误')
      }
    } catch {
      setLoading(false)
      setError('密码错误')
    }
  }

  return (
    <div className="relative flex h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-background to-muted p-4">
      {/* 主色光斑装饰（纯 CSS，无外部资源） */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      <form onSubmit={handleSubmit} className="relative w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">LifeOS</h1>
          <p className="text-sm text-muted-foreground">输入密码进入</p>
        </div>

        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="密码"
            autoFocus
            className="w-full rounded-xl border bg-background px-4 py-2.5 pr-10 text-base outline-ring sm:text-sm"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {error && <p className="text-center text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
        >
          {loading ? '验证中...' : '进入'}
        </button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
