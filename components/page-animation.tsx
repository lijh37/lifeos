'use client'

import { useSelectedLayoutSegment } from 'next/navigation'

export function PageAnimation({ children }: { children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment()
  const key = segment ?? '__root__'
  return (
    <div key={key} className="animate-fade-in" style={{ animationFillMode: 'both' }}>
      {children}
    </div>
  )
}
