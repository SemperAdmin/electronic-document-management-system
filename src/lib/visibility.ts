export function hasCommandDashboardAccess(currentUser: any, unitStructure: Record<string, any>): boolean {
  if (!currentUser) return false
  const role = String(currentUser.role || '')
  if (role === 'COMMANDER') return true
  if (!currentUser.isCommandStaff) return false
  const uic = currentUser.unitUic || ''
  const list = (unitStructure?.[uic]?.['_commandSections'] || []) as string[]
  return Array.isArray(list) && list.length > 0
}
