import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatOptionType(type: string): string {
  switch (type.toLowerCase()) {
    case 'number': return 'No.'
    case 'dropdown': return 'Type'
    default: return type.charAt(0).toUpperCase() + type.slice(1)
  }
}

export function formatOptionLabel(label: string): string {
  if (!label) return label
  return label
    .replace(/\(number\)/gi, '(No.)')
    .replace(/\(dropdown\)/gi, '(Type)')
}

export function validatePassword(password: string) {
  return {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }
}
