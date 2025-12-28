import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a user's display name in the standard format: "Rank LastName, FirstName MI"
 * @param user - User object with rank, lastName, firstName, and optional mi properties
 * @param fallback - Fallback string if user is null/undefined
 * @returns Formatted display name or fallback
 */
export function formatActorName(
  user: { rank?: string; lastName?: string; firstName?: string; mi?: string } | null | undefined,
  fallback: string = 'Unknown'
): string {
  if (!user) return fallback
  const { rank = '', lastName = '', firstName = '', mi } = user
  const name = `${rank} ${lastName}, ${firstName}${mi ? ` ${mi}` : ''}`.trim()
  return name || fallback
}
