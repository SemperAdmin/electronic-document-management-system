import { describe, it, expect } from 'vitest'
import {
  Stage,
  formatStageLabel,
  lastActivity,
  isReturned,
  hasActivity,
  isUnitApproved,
  isUnitEndorsed,
  canRequesterEdit,
  originatorArchiveOnly,
} from '../lib/stage'

describe('Stage enum', () => {
  it('should have all expected stages', () => {
    expect(Stage.PLATOON_REVIEW).toBe('PLATOON_REVIEW')
    expect(Stage.COMPANY_REVIEW).toBe('COMPANY_REVIEW')
    expect(Stage.BATTALION_REVIEW).toBe('BATTALION_REVIEW')
    expect(Stage.COMMANDER_REVIEW).toBe('COMMANDER_REVIEW')
    expect(Stage.INSTALLATION_REVIEW).toBe('INSTALLATION_REVIEW')
    expect(Stage.HQMC_REVIEW).toBe('HQMC_REVIEW')
    expect(Stage.EXTERNAL_REVIEW).toBe('EXTERNAL_REVIEW')
    expect(Stage.ORIGINATOR_REVIEW).toBe('ORIGINATOR_REVIEW')
    expect(Stage.ARCHIVED).toBe('ARCHIVED')
  })
})

describe('formatStageLabel', () => {
  it('should format PLATOON_REVIEW as "Platoon"', () => {
    expect(formatStageLabel({ currentStage: Stage.PLATOON_REVIEW })).toBe('Platoon')
  })

  it('should format COMPANY_REVIEW as "Company"', () => {
    expect(formatStageLabel({ currentStage: Stage.COMPANY_REVIEW })).toBe('Company')
  })

  it('should format BATTALION_REVIEW with routeSection', () => {
    expect(formatStageLabel({ currentStage: Stage.BATTALION_REVIEW, routeSection: 'S-1' })).toBe('S-1')
  })

  it('should format BATTALION_REVIEW without routeSection as "Battalion"', () => {
    expect(formatStageLabel({ currentStage: Stage.BATTALION_REVIEW })).toBe('Battalion')
  })

  it('should format COMMANDER_REVIEW with routeSection', () => {
    expect(formatStageLabel({ currentStage: Stage.COMMANDER_REVIEW, routeSection: 'Commanding Officer' })).toBe('Commanding Officer')
  })

  it('should format INSTALLATION_REVIEW with routeSection', () => {
    expect(formatStageLabel({ currentStage: Stage.INSTALLATION_REVIEW, routeSection: 'G-1' })).toBe('Installation - G-1')
  })

  it('should format INSTALLATION_REVIEW without routeSection', () => {
    expect(formatStageLabel({ currentStage: Stage.INSTALLATION_REVIEW })).toBe('Installation Commander')
  })

  it('should format HQMC_REVIEW with routeSection', () => {
    expect(formatStageLabel({ currentStage: Stage.HQMC_REVIEW, routeSection: 'MM' })).toBe('HQMC - MM')
  })

  it('should format EXTERNAL_REVIEW with externalPendingUnitName', () => {
    expect(formatStageLabel({ currentStage: Stage.EXTERNAL_REVIEW, externalPendingUnitName: '1st MarDiv' })).toBe('1st MarDiv')
  })

  it('should format ARCHIVED as "Archived"', () => {
    expect(formatStageLabel({ currentStage: Stage.ARCHIVED })).toBe('Archived')
  })

  it('should default to PLATOON_REVIEW when currentStage is undefined', () => {
    expect(formatStageLabel({})).toBe('Platoon')
  })
})

describe('lastActivity', () => {
  it('should return null for empty activity array', () => {
    expect(lastActivity({ activity: [] })).toBeNull()
  })

  it('should return null when activity is undefined', () => {
    expect(lastActivity({})).toBeNull()
  })

  it('should return the last activity entry', () => {
    const activity = [
      { action: 'Created', timestamp: '2024-01-01' },
      { action: 'Approved', timestamp: '2024-01-02' },
    ]
    expect(lastActivity({ activity })).toEqual({ action: 'Approved', timestamp: '2024-01-02' })
  })
})

describe('isReturned', () => {
  it('should return false for empty activity', () => {
    expect(isReturned({})).toBe(false)
  })

  it('should return true when last action contains "returned"', () => {
    expect(isReturned({ activity: [{ action: 'Returned for corrections' }] })).toBe(true)
  })

  it('should return true for case-insensitive match', () => {
    expect(isReturned({ activity: [{ action: 'RETURNED' }] })).toBe(true)
  })

  it('should return false when last action does not contain "returned"', () => {
    expect(isReturned({ activity: [{ action: 'Approved' }] })).toBe(false)
  })
})

describe('hasActivity', () => {
  it('should return false for empty activity', () => {
    expect(hasActivity({}, /approved/i)).toBe(false)
  })

  it('should return true when pattern matches any activity', () => {
    const activity = [
      { action: 'Created' },
      { action: 'Approved by Commander' },
    ]
    expect(hasActivity({ activity }, /approved/i)).toBe(true)
  })

  it('should return false when pattern matches no activity', () => {
    const activity = [{ action: 'Created' }, { action: 'Submitted' }]
    expect(hasActivity({ activity }, /approved/i)).toBe(false)
  })
})

describe('isUnitApproved', () => {
  it('should return true when approved by commander', () => {
    const activity = [{ action: 'Approved by Commander' }]
    expect(isUnitApproved({ activity })).toBe(true)
  })

  it('should return true for "commander approved" format', () => {
    const activity = [{ action: 'Commander has approved' }]
    expect(isUnitApproved({ activity })).toBe(true)
  })

  it('should return false when approved by installation commander', () => {
    const activity = [
      { action: 'Approved by Commander' },
      { action: 'Installation Commander reviewed' },
    ]
    expect(isUnitApproved({ activity })).toBe(false)
  })

  it('should return false when not approved', () => {
    expect(isUnitApproved({ activity: [{ action: 'Submitted' }] })).toBe(false)
  })
})

describe('isUnitEndorsed', () => {
  it('should return true when endorsed by commander', () => {
    const activity = [{ action: 'Endorsed by Commander' }]
    expect(isUnitEndorsed({ activity })).toBe(true)
  })

  it('should return false when endorsed by installation commander', () => {
    const activity = [
      { action: 'Endorsed by Commander' },
      { action: 'Installation Commander reviewed' },
    ]
    expect(isUnitEndorsed({ activity })).toBe(false)
  })
})

describe('canRequesterEdit', () => {
  const requesterId = 'user-123'

  it('should return false when requester is not the owner', () => {
    const r = { uploadedById: 'other-user', currentStage: Stage.PLATOON_REVIEW }
    expect(canRequesterEdit(r, requesterId)).toBe(false)
  })

  it('should return true during PLATOON_REVIEW for owner', () => {
    const r = { uploadedById: requesterId, currentStage: Stage.PLATOON_REVIEW }
    expect(canRequesterEdit(r, requesterId)).toBe(true)
  })

  it('should return true during COMPANY_REVIEW for owner', () => {
    const r = { uploadedById: requesterId, currentStage: Stage.COMPANY_REVIEW }
    expect(canRequesterEdit(r, requesterId)).toBe(true)
  })

  it('should return true during BATTALION_REVIEW for owner', () => {
    const r = { uploadedById: requesterId, currentStage: Stage.BATTALION_REVIEW }
    expect(canRequesterEdit(r, requesterId)).toBe(true)
  })

  it('should return false during ORIGINATOR_REVIEW after unit approval', () => {
    const r = {
      uploadedById: requesterId,
      currentStage: Stage.ORIGINATOR_REVIEW,
      activity: [{ action: 'Approved by Commander' }],
    }
    expect(canRequesterEdit(r, requesterId)).toBe(false)
  })

  it('should return true during ORIGINATOR_REVIEW if returned (not approved)', () => {
    const r = {
      uploadedById: requesterId,
      currentStage: Stage.ORIGINATOR_REVIEW,
      activity: [{ action: 'Returned for corrections' }],
    }
    expect(canRequesterEdit(r, requesterId)).toBe(true)
  })
})

describe('originatorArchiveOnly', () => {
  const requesterId = 'user-123'

  it('should return false when requester is not the owner', () => {
    const r = {
      uploadedById: 'other-user',
      currentStage: Stage.ORIGINATOR_REVIEW,
      activity: [{ action: 'Approved by Commander' }],
    }
    expect(originatorArchiveOnly(r, requesterId)).toBe(false)
  })

  it('should return true when in ORIGINATOR_REVIEW after unit approval', () => {
    const r = {
      uploadedById: requesterId,
      currentStage: Stage.ORIGINATOR_REVIEW,
      activity: [{ action: 'Approved by Commander' }],
    }
    expect(originatorArchiveOnly(r, requesterId)).toBe(true)
  })

  it('should return true when in ORIGINATOR_REVIEW after unit endorsement', () => {
    const r = {
      uploadedById: requesterId,
      currentStage: Stage.ORIGINATOR_REVIEW,
      activity: [{ action: 'Endorsed by Commander' }],
    }
    expect(originatorArchiveOnly(r, requesterId)).toBe(true)
  })

  it('should return false when not in ORIGINATOR_REVIEW', () => {
    const r = {
      uploadedById: requesterId,
      currentStage: Stage.PLATOON_REVIEW,
      activity: [{ action: 'Approved by Commander' }],
    }
    expect(originatorArchiveOnly(r, requesterId)).toBe(false)
  })
})
