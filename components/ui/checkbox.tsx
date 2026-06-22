'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'checked' | 'onChange'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export function Checkbox({ checked, onCheckedChange, className, disabled, ...props }: CheckboxProps) {
  return (
    <label className={cn(
      'flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border border-input transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      disabled && 'cursor-not-allowed opacity-50',
      checked ? 'bg-primary border-primary' : 'bg-background',
      className
    )}>
      <input
        type="checkbox"
        checked={checked ?? false}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        disabled={disabled}
        className="sr-only"
        {...props}
      />
      {checked && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary-foreground"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </label>
  )
}
