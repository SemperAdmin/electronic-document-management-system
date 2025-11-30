import { describe, it, expect } from 'vitest'
import { hasCommandDashboardAccess } from '../lib/visibility'

describe('hasCommandDashboardAccess', () => {
  it('shows for COMMANDER regardless of command sections', () => {
    const cu = { role: 'COMMANDER', unitUic: 'M11111' }
    const us = {}
    expect(hasCommandDashboardAccess(cu, us)).toBe(true)
  })

  it('shows for command staff with sections configured', () => {
    const cu = { role: 'COMPANY_REVIEWER', isCommandStaff: true, unitUic: 'M11111' }
    const us = { M11111: { _commandSections: ['XO'] } }
    expect(hasCommandDashboardAccess(cu, us)).toBe(true)
  })

  it('hides for command staff without sections configured', () => {
    const cu = { role: 'COMPANY_REVIEWER', isCommandStaff: true, unitUic: 'M11111' }
    const us = { M11111: { _commandSections: [] } }
    expect(hasCommandDashboardAccess(cu, us)).toBe(false)
  })

  it('hides for non-command staff', () => {
    const cu = { role: 'COMPANY_REVIEWER', isCommandStaff: false, unitUic: 'M11111' }
    const us = { M11111: { _commandSections: ['XO'] } }
    expect(hasCommandDashboardAccess(cu, us)).toBe(false)
  })
})
