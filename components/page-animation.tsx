'use client'

export function PageAnimation({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in min-w-0 flex-1" style={{ animationFillMode: 'both' }}>
      {children}
    </div>
  )
}
