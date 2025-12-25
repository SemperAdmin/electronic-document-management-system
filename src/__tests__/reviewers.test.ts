import { describe, it, expect } from 'vitest'
import { normalizeString, hasReviewer } from '../lib/reviewers'
import { UserRecord } from '../types'

describe('normalizeString', () => {
  it('should return empty string for undefined', () => {
    expect(normalizeString(undefined)).toBe('')
  })

  it('should return empty string for null', () => {
    expect(normalizeString(null as unknown as string)).toBe('')
  })

  it('should return empty string for "N/A"', () => {
    expect(normalizeString('N/A')).toBe('')
  })

  it('should trim whitespace', () => {
    expect(normalizeString('  Alpha Company  ')).toBe('Alpha Company')
  })

  it('should return empty string for whitespace-only input', () => {
    expect(normalizeString('   ')).toBe('')
  })

  it('should return the string as-is when valid', () => {
    expect(normalizeString('Bravo Company')).toBe('Bravo Company')
  })
})

describe('hasReviewer', () => {
  const baseUser: UserRecord = {
    id: 'user-1',
    role: 'PLATOON_REVIEWER',
    unitUic: 'M12345',
    company: 'Alpha Company',
    platoon: '1st Platoon',
    roleCompany: 'Alpha Company',
    rolePlatoon: '1st Platoon',
  }

  describe('PLATOON_REVIEWER', () => {
    it('should return true when matching platoon reviewer exists', () => {
      const users: UserRecord[] = [baseUser]
      const scope = { company: 'Alpha Company', platoon: '1st Platoon', uic: 'M12345' }
      expect(hasReviewer(users, 'PLATOON_REVIEWER', scope)).toBe(true)
    })

    it('should return false when platoon does not match', () => {
      const users: UserRecord[] = [baseUser]
      const scope = { company: 'Alpha Company', platoon: '2nd Platoon', uic: 'M12345' }
      expect(hasReviewer(users, 'PLATOON_REVIEWER', scope)).toBe(false)
    })

    it('should return false when company does not match', () => {
      const users: UserRecord[] = [baseUser]
      const scope = { company: 'Bravo Company', platoon: '1st Platoon', uic: 'M12345' }
      expect(hasReviewer(users, 'PLATOON_REVIEWER', scope)).toBe(false)
    })

    it('should return false when UIC does not match', () => {
      const users: UserRecord[] = [baseUser]
      const scope = { company: 'Alpha Company', platoon: '1st Platoon', uic: 'M99999' }
      expect(hasReviewer(users, 'PLATOON_REVIEWER', scope)).toBe(false)
    })

    it('should return false when user role is not PLATOON_REVIEWER', () => {
      const users: UserRecord[] = [{ ...baseUser, role: 'MEMBER' }]
      const scope = { company: 'Alpha Company', platoon: '1st Platoon', uic: 'M12345' }
      expect(hasReviewer(users, 'PLATOON_REVIEWER', scope)).toBe(false)
    })

    it('should return false for empty users array', () => {
      const scope = { company: 'Alpha Company', platoon: '1st Platoon', uic: 'M12345' }
      expect(hasReviewer([], 'PLATOON_REVIEWER', scope)).toBe(false)
    })

    it('should use company field when roleCompany is not set', () => {
      const users: UserRecord[] = [{
        ...baseUser,
        roleCompany: undefined,
        company: 'Alpha Company',
      }]
      const scope = { company: 'Alpha Company', platoon: '1st Platoon', uic: 'M12345' }
      expect(hasReviewer(users, 'PLATOON_REVIEWER', scope)).toBe(true)
    })

    it('should use platoon field when rolePlatoon is not set', () => {
      const users: UserRecord[] = [{
        ...baseUser,
        rolePlatoon: undefined,
        platoon: '1st Platoon',
      }]
      const scope = { company: 'Alpha Company', platoon: '1st Platoon', uic: 'M12345' }
      expect(hasReviewer(users, 'PLATOON_REVIEWER', scope)).toBe(true)
    })
  })

  describe('COMPANY_REVIEWER', () => {
    const companyReviewer: UserRecord = {
      ...baseUser,
      role: 'COMPANY_REVIEWER',
    }

    it('should return true when matching company reviewer exists', () => {
      const users: UserRecord[] = [companyReviewer]
      const scope = { company: 'Alpha Company', uic: 'M12345' }
      expect(hasReviewer(users, 'COMPANY_REVIEWER', scope)).toBe(true)
    })

    it('should return false when company does not match', () => {
      const users: UserRecord[] = [companyReviewer]
      const scope = { company: 'Bravo Company', uic: 'M12345' }
      expect(hasReviewer(users, 'COMPANY_REVIEWER', scope)).toBe(false)
    })

    it('should return false when UIC does not match', () => {
      const users: UserRecord[] = [companyReviewer]
      const scope = { company: 'Alpha Company', uic: 'M99999' }
      expect(hasReviewer(users, 'COMPANY_REVIEWER', scope)).toBe(false)
    })

    it('should ignore platoon for company reviewer', () => {
      const users: UserRecord[] = [companyReviewer]
      const scope = { company: 'Alpha Company', platoon: 'Any Platoon', uic: 'M12345' }
      expect(hasReviewer(users, 'COMPANY_REVIEWER', scope)).toBe(true)
    })
  })

  describe('multiple users', () => {
    it('should find reviewer among multiple users', () => {
      const users: UserRecord[] = [
        { id: 'user-1', role: 'MEMBER', unitUic: 'M12345', company: 'Alpha Company' },
        { id: 'user-2', role: 'COMPANY_REVIEWER', unitUic: 'M12345', company: 'Bravo Company', roleCompany: 'Bravo Company' },
        { id: 'user-3', role: 'COMPANY_REVIEWER', unitUic: 'M12345', company: 'Alpha Company', roleCompany: 'Alpha Company' },
      ]
      const scope = { company: 'Alpha Company', uic: 'M12345' }
      expect(hasReviewer(users, 'COMPANY_REVIEWER', scope)).toBe(true)
    })
  })
})
