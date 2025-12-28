import { describe, it, expect } from 'vitest'
import { hasCommandDashboardAccess } from '../lib/visibility'

describe('hasCommandDashboardAccess', () => {
  describe('when user is null or undefined', () => {
    it('should return false for null user', () => {
      expect(hasCommandDashboardAccess(null, {})).toBe(false)
    })

    it('should return false for undefined user', () => {
      expect(hasCommandDashboardAccess(undefined, {})).toBe(false)
    })
  })

  describe('when user is COMMANDER', () => {
    it('should return true regardless of unit structure', () => {
      const user = { role: 'COMMANDER', unitUic: 'M12345' }
      expect(hasCommandDashboardAccess(user, {})).toBe(true)
    })

    it('should return true even with empty command sections', () => {
      const user = { role: 'COMMANDER', unitUic: 'M12345' }
      const unitStructure = { M12345: { _commandSections: [] } }
      expect(hasCommandDashboardAccess(user, unitStructure)).toBe(true)
    })
  })

  describe('when user has isCommandStaff flag', () => {
    it('should return true when command sections exist for their UIC', () => {
      const user = {
        role: 'MEMBER',
        isCommandStaff: true,
        unitUic: 'M12345'
      }
      const unitStructure = {
        M12345: { _commandSections: ['S-1', 'S-3', 'S-4'] }
      }
      expect(hasCommandDashboardAccess(user, unitStructure)).toBe(true)
    })

    it('should return false when no command sections exist for their UIC', () => {
      const user = {
        role: 'MEMBER',
        isCommandStaff: true,
        unitUic: 'M12345'
      }
      const unitStructure = {
        M12345: { _commandSections: [] }
      }
      expect(hasCommandDashboardAccess(user, unitStructure)).toBe(false)
    })

    it('should return false when UIC not in unit structure', () => {
      const user = {
        role: 'MEMBER',
        isCommandStaff: true,
        unitUic: 'M99999'
      }
      const unitStructure = {
        M12345: { _commandSections: ['S-1'] }
      }
      expect(hasCommandDashboardAccess(user, unitStructure)).toBe(false)
    })

    it('should return false when _commandSections is undefined', () => {
      const user = {
        role: 'MEMBER',
        isCommandStaff: true,
        unitUic: 'M12345'
      }
      const unitStructure = {
        M12345: {}
      }
      expect(hasCommandDashboardAccess(user, unitStructure)).toBe(false)
    })
  })

  describe('when user is not COMMANDER and not command staff', () => {
    it('should return false for regular member', () => {
      const user = {
        role: 'MEMBER',
        isCommandStaff: false,
        unitUic: 'M12345'
      }
      const unitStructure = {
        M12345: { _commandSections: ['S-1', 'S-3'] }
      }
      expect(hasCommandDashboardAccess(user, unitStructure)).toBe(false)
    })

    it('should return false for PLATOON_REVIEWER', () => {
      const user = {
        role: 'PLATOON_REVIEWER',
        isCommandStaff: false,
        unitUic: 'M12345'
      }
      const unitStructure = {
        M12345: { _commandSections: ['S-1'] }
      }
      expect(hasCommandDashboardAccess(user, unitStructure)).toBe(false)
    })

    it('should return false for COMPANY_REVIEWER', () => {
      const user = {
        role: 'COMPANY_REVIEWER',
        isCommandStaff: false,
        unitUic: 'M12345'
      }
      const unitStructure = {
        M12345: { _commandSections: ['S-1'] }
      }
      expect(hasCommandDashboardAccess(user, unitStructure)).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle user with no role property', () => {
      const user = { unitUic: 'M12345' }
      expect(hasCommandDashboardAccess(user, {})).toBe(false)
    })

    it('should handle user with empty role string', () => {
      const user = { role: '', unitUic: 'M12345' }
      expect(hasCommandDashboardAccess(user, {})).toBe(false)
    })

    it('should handle user with no unitUic', () => {
      const user = { role: 'MEMBER', isCommandStaff: true }
      const unitStructure = {
        '': { _commandSections: ['S-1'] }
      }
      expect(hasCommandDashboardAccess(user, unitStructure)).toBe(true)
    })

    it('should handle null unit structure', () => {
      const user = { role: 'MEMBER', isCommandStaff: true, unitUic: 'M12345' }
      expect(hasCommandDashboardAccess(user, null as any)).toBe(false)
    })

    it('should handle undefined unit structure', () => {
      const user = { role: 'MEMBER', isCommandStaff: true, unitUic: 'M12345' }
      expect(hasCommandDashboardAccess(user, undefined as any)).toBe(false)
    })
  })
})
