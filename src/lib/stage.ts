export enum Stage {
  PLATOON_REVIEW = 'PLATOON_REVIEW',
  COMPANY_REVIEW = 'COMPANY_REVIEW',
  BATTALION_REVIEW = 'BATTALION_REVIEW',
  COMMANDER_REVIEW = 'COMMANDER_REVIEW',
  INSTALLATION_REVIEW = 'INSTALLATION_REVIEW',
  HQMC_REVIEW = 'HQMC_REVIEW',
  EXTERNAL_REVIEW = 'EXTERNAL_REVIEW',
  ORIGINATOR_REVIEW = 'ORIGINATOR_REVIEW',
  ARCHIVED = 'ARCHIVED'
}

export function formatStageLabel(r: { currentStage?: string; routeSection?: string; externalPendingUnitName?: string }): string {
  const s = String(r.currentStage || Stage.PLATOON_REVIEW)
  if (s === Stage.PLATOON_REVIEW) return 'Platoon'
  if (s === Stage.COMPANY_REVIEW) return 'Company'
  if (s === Stage.BATTALION_REVIEW) return r.routeSection || 'Battalion'
  if (s === Stage.COMMANDER_REVIEW) return r.routeSection || 'Commander'
  if (s === Stage.INSTALLATION_REVIEW) return r.routeSection ? `Installation - ${r.routeSection}` : 'Installation Commander'
  if (s === Stage.HQMC_REVIEW) return r.routeSection ? `HQMC - ${r.routeSection}` : 'HQMC'
  if (s === Stage.EXTERNAL_REVIEW) return r.externalPendingUnitName || 'External'
  if (s === Stage.ARCHIVED) return 'Archived'
  return s
}

export function lastActivity(r: { activity?: Array<{ action: string; timestamp?: string }> }): { action: string; timestamp?: string } | null {
  const a = Array.isArray(r.activity) ? r.activity : []
  return a.length ? a[a.length - 1] : null
}

export function isReturned(r: { activity?: Array<{ action: string; timestamp?: string }> }): boolean {
  const a = lastActivity(r)
  return !!a && /returned/i.test(String(a.action || ''))
}

export function hasActivity(r: { activity?: Array<{ action: string; timestamp?: string }> }, pattern: RegExp): boolean {
  return (r.activity || []).some(a => pattern.test(String(a.action || '')))
}

export function isUnitApproved(r: { activity?: Array<{ action: string; timestamp?: string }> }): boolean {
  return hasActivity(r, /(approved by commander|commander.*approved)/i) && !hasActivity(r, /installation commander/i)
}

export function isUnitEndorsed(r: { activity?: Array<{ action: string; timestamp?: string }> }): boolean {
  return hasActivity(r, /(endorsed by commander|commander.*endorsed)/i) && !hasActivity(r, /installation commander/i)
}

export function canRequesterEdit(r: { currentStage?: string; uploadedById?: string; activity?: Array<{ action: string; timestamp?: string }> }, requesterId: string): boolean {
  const owner = String(r.uploadedById || '') === String(requesterId || '')
  if (!owner) return false
  const s = String(r.currentStage || Stage.PLATOON_REVIEW)
  if (s === Stage.PLATOON_REVIEW || s === Stage.COMPANY_REVIEW || s === Stage.BATTALION_REVIEW) return true
  // If request was approved or endorsed and returned to originator, editing is not allowed
  if (s === Stage.ORIGINATOR_REVIEW && (isUnitApproved(r) || isUnitEndorsed(r))) return false
  return isReturned(r)
}

export function originatorArchiveOnly(r: { currentStage?: string; uploadedById?: string; activity?: Array<{ action: string; timestamp?: string }> }, requesterId: string): boolean {
  const owner = String(r.uploadedById || '') === String(requesterId || '')
  if (!owner) return false
  const s = String(r.currentStage || '')
  return s === Stage.ORIGINATOR_REVIEW && (isUnitApproved(r) || isUnitEndorsed(r))
}
