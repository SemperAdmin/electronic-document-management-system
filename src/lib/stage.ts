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

// Check if installation commander approved
export function isInstallationApproved(r: { activity?: Array<{ action: string; timestamp?: string }> }): boolean {
  return hasActivity(r, /installation commander.*approved/i)
}

// Check if installation commander endorsed
export function isInstallationEndorsed(r: { activity?: Array<{ action: string; timestamp?: string }> }): boolean {
  return hasActivity(r, /installation commander.*endorsed/i)
}

// Check if HQMC approved
export function isHQMCApproved(r: { activity?: Array<{ action: string; timestamp?: string }> }): boolean {
  return hasActivity(r, /(hqmc.*approved|approved.*hqmc)/i)
}

// Check if battalion has taken action after unit commander approval
export function hasBattalionActionPostApproval(r: { activity?: Array<{ action: string; timestamp?: string }> }): boolean {
  const activities = r.activity || []
  let foundCommanderApproval = false

  for (const a of activities) {
    const action = String(a.action || '').toLowerCase()

    // Check for commander approval/endorsement (unit level)
    if (/(approved|endorsed) by commander/i.test(action) && !/installation commander/i.test(action)) {
      foundCommanderApproval = true
    }

    // After commander approval, check if battalion took any action
    if (foundCommanderApproval) {
      if (/battalion/i.test(action) && /(archived|sent|routed|assigned)/i.test(action)) {
        return true
      }
    }
  }

  return false
}

// Determine if delete is allowed - only before unit commander approval/endorsement
export function canDeleteRequest(
  r: { currentStage?: string; uploadedById?: string; activity?: Array<{ action: string; timestamp?: string }> },
  requesterId: string
): boolean {
  const owner = String(r.uploadedById || '') === String(requesterId || '')
  if (!owner) return false

  // Cannot delete once any commander has approved or endorsed
  if (
    isUnitApproved(r) ||
    isUnitEndorsed(r) ||
    isInstallationApproved(r) ||
    isInstallationEndorsed(r)
  ) {
    return false
  }

  // Cannot delete if archived
  const s = String(r.currentStage || '')
  if (s === Stage.ARCHIVED) return false

  return true
}

// Determine who can archive based on approval level scope
export interface ArchiveContext {
  userLevel: 'originator' | 'unit' | 'installation' | 'hqmc' | 'external';
  userUnitUic?: string;
  userInstallationId?: string;
}

export function canArchiveAtLevel(
  r: {
    currentStage?: string;
    uploadedById?: string;
    unitUic?: string;
    installationId?: string;
    activity?: Array<{ action: string; timestamp?: string }>;
  },
  context: ArchiveContext
): boolean {
  const stage = String(r.currentStage || '')

  // Already archived
  if (stage === Stage.ARCHIVED) return false

  switch (context.userLevel) {
    case 'originator':
      // Originator can archive when in ORIGINATOR_REVIEW and approved/endorsed
      return stage === Stage.ORIGINATOR_REVIEW && (isUnitApproved(r) || isUnitEndorsed(r))

    case 'unit':
      // Unit command (battalion) can archive after unit commander approval
      // Must be in BATTALION_REVIEW and commander approved/endorsed
      if (stage !== Stage.BATTALION_REVIEW) return false
      if (!isUnitApproved(r) && !isUnitEndorsed(r)) return false
      // Check unit scope
      return context.userUnitUic === r.unitUic

    case 'installation':
      // Installation can archive after installation commander approval
      if (!isInstallationApproved(r) && !isInstallationEndorsed(r)) return false
      // Check installation scope
      return context.userInstallationId === r.installationId

    case 'hqmc':
      // HQMC can archive after HQMC approval
      return isHQMCApproved(r)

    case 'external':
      // External unit cannot archive until their command approves
      // This would need the external unit's commander to approve
      return false

    default:
      return false
  }
}
