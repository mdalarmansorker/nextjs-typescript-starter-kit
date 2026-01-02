import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: any[]): string {
  return twMerge(clsx(inputs))
}
