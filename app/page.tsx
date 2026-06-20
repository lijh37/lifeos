'use client'

import dynamic from 'next/dynamic'

const Chat = dynamic(() => import('@/components/chat'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-muted-foreground">加载中...</div>,
})

export default function Home() {
  return <Chat />
}
