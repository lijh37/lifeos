'use client'

import { useSelectedLayoutSegment } from 'next/navigation'

export function PageAnimation({ children }: { children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment()
  return (
    <div key={segment} className="animate-fade-in" style={{ animationFillMode: 'both' }}>
      {children}
    </div>
  )
}
