import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency in Kenyan Shillings (KSh)
export function formatKES(
  value: number | string | null | undefined,
  options?: {
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  }
) {
  const num = typeof value === "string" ? Number(value) : value ?? 0
  const { minimumFractionDigits = 2, maximumFractionDigits = 2 } = options || {}
  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(Number.isFinite(num as number) ? (num as number) : 0)
  } catch {
    // Fallback if Intl fails
    const fixed = (Number.isFinite(num as number) ? (num as number) : 0).toFixed(
      Math.max(minimumFractionDigits, 0)
    )
    return `KSh ${fixed}`
  }
}
