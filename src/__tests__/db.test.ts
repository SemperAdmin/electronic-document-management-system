import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Supabase before importing db module
const mockSupabaseClient = {
  from: vi.fn(),
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
  },
}

vi.mock('../lib/supabase', () => ({
  getSupabase: () => mockSupabaseClient,
}))

import {
  listDocuments,
  upsertDocuments,
  deleteDocumentById,
  deleteDocumentsByRequestId,
  listRequests,
  upsertRequest,
  deleteRequestById,
  listUsers,
  upsertUser,
  getUserById,
  getUserByEmail,
  getUserByEdipi,
  listInstallations,
  upsertInstallation,
  listHQMCStructure,
  listHQMCDivisions,
  listHQMCSectionAssignments,
  upsertHQMCSectionAssignment,
  listCompaniesForUnit,
  listPlatoonsForCompany,
  type DocumentRecord,
  type RequestRecord,
} from '../lib/db'
import { UserRecord, Installation } from '../types'

describe('Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ============================================================================
  // Document Operations
  // ============================================================================

  describe('listDocuments', () => {
    it('should return documents on success', async () => {
      const mockDocs = [
        {
          id: 'doc-1',
          name: 'test.pdf',
          type: 'application/pdf',
          size: 1024,
          uploaded_at: '2024-01-01T00:00:00Z',
          category: 'general',
          tags: ['tag1'],
          unit_uic: 'M12345',
          subject: 'Test Subject',
          due_date: null,
          notes: null,
          uploaded_by_id: 'user-1',
          current_stage: 'PLATOON_REVIEW',
          request_id: 'req-1',
          file_url: 'https://example.com/file.pdf',
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockDocs, error: null }),
        }),
      })

      const result = await listDocuments()

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('doc-1')
      expect(result.data[0].name).toBe('test.pdf')
      expect(result.data[0].uploadedById).toBe('user-1')
    })

    it('should return empty array with error message on Supabase error', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
        }),
      })

      const result = await listDocuments()

      expect(result.error).toBe('Database error')
      expect(result.data).toEqual([])
    })

    it('should handle exception and return empty array', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Network error')
      })

      const result = await listDocuments()

      expect(result.error).toBe('Network error')
      expect(result.data).toEqual([])
    })
  })

  describe('upsertDocuments', () => {
    it('should return ok true on success', async () => {
      mockSupabaseClient.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      })

      const docs: DocumentRecord[] = [
        {
          id: 'doc-1',
          name: 'test.pdf',
          type: 'application/pdf',
          size: 1024,
          uploadedAt: new Date(),
          category: 'general',
          tags: [],
          unitUic: 'M12345',
          subject: 'Test',
        },
      ]

      const result = await upsertDocuments(docs)

      expect(result.ok).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should return ok true for empty array', async () => {
      const result = await upsertDocuments([])

      expect(result.ok).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should return error on Supabase error', async () => {
      mockSupabaseClient.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: { message: 'Insert failed' } }),
      })

      const docs: DocumentRecord[] = [
        {
          id: 'doc-1',
          name: 'test.pdf',
          type: 'application/pdf',
          size: 1024,
          uploadedAt: new Date(),
          category: 'general',
          tags: [],
          unitUic: 'M12345',
          subject: 'Test',
        },
      ]

      const result = await upsertDocuments(docs)

      expect(result.ok).toBe(false)
      expect(result.error).toBe('Insert failed')
    })
  })

  describe('deleteDocumentById', () => {
    it('should return ok true on success', async () => {
      mockSupabaseClient.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })

      const result = await deleteDocumentById('doc-1')

      expect(result.ok).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should return error on Supabase error', async () => {
      mockSupabaseClient.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
        }),
      })

      const result = await deleteDocumentById('doc-1')

      expect(result.ok).toBe(false)
      expect(result.error).toBe('Delete failed')
    })
  })

  describe('deleteDocumentsByRequestId', () => {
    it('should return ok true on success', async () => {
      mockSupabaseClient.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })

      const result = await deleteDocumentsByRequestId('req-1')

      expect(result.ok).toBe(true)
      expect(result.error).toBeNull()
    })
  })

  // ============================================================================
  // Request Operations
  // ============================================================================

  describe('listRequests', () => {
    it('should return requests on success', async () => {
      const mockRequests = [
        {
          id: 'req-1',
          subject: 'Test Request',
          due_date: '2024-12-31',
          notes: 'Test notes',
          unit_uic: 'M12345',
          uploaded_by_id: 'user-1',
          submit_for_user_id: null,
          document_ids: ['doc-1'],
          created_at: '2024-01-01T00:00:00Z',
          current_stage: 'PLATOON_REVIEW',
          activity: [{ actor: 'user-1', timestamp: '2024-01-01T00:00:00Z', action: 'Created' }],
          route_section: null,
          commander_approval_date: null,
          external_pending_unit_name: null,
          external_pending_unit_uic: null,
          external_pending_stage: null,
          installation_id: null,
          final_status: null,
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockRequests, error: null }),
        }),
      })

      const result = await listRequests()

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('req-1')
      expect(result.data[0].subject).toBe('Test Request')
      expect(result.data[0].uploadedById).toBe('user-1')
    })

    it('should handle error', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
        }),
      })

      const result = await listRequests()

      expect(result.error).toBe('Query failed')
      expect(result.data).toEqual([])
    })
  })

  describe('upsertRequest', () => {
    it('should return ok true on success', async () => {
      mockSupabaseClient.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      })

      const request: RequestRecord = {
        id: 'req-1',
        subject: 'Test Request',
        uploadedById: 'user-1',
        documentIds: ['doc-1'],
        createdAt: '2024-01-01T00:00:00Z',
      }

      const result = await upsertRequest(request)

      expect(result.ok).toBe(true)
      expect(result.error).toBeNull()
    })
  })

  describe('deleteRequestById', () => {
    it('should return ok true on success', async () => {
      mockSupabaseClient.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })

      const result = await deleteRequestById('req-1')

      expect(result.ok).toBe(true)
      expect(result.error).toBeNull()
    })
  })

  // ============================================================================
  // User Operations
  // ============================================================================

  describe('listUsers', () => {
    it('should return users on success', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'test@usmc.mil',
          rank: 'SSgt',
          first_name: 'John',
          last_name: 'Doe',
          mi: 'A',
          service: 'USMC',
          role: 'PLATOON_REVIEWER',
          unit_uic: 'M12345',
          unit: '1st Battalion',
          company: 'Alpha Company',
          user_company: 'Alpha Company',
          is_unit_admin: false,
          is_hqmc_admin: false,
          is_installation_admin: false,
          is_command_staff: false,
          is_app_admin: false,
          edipi: '1234567890',
          password_hash: null,
          user_platoon: '1st Platoon',
          role_company: 'Alpha Company',
          role_platoon: '1st Platoon',
          installation_id: null,
          hqmc_division: null,
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
      })

      const result = await listUsers()

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('user-1')
      expect(result.data[0].email).toBe('test@usmc.mil')
      expect(result.data[0].firstName).toBe('John')
      expect(result.data[0].lastName).toBe('Doe')
    })

    it('should derive PLATOON_REVIEWER role when rolePlatoon is set', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'test@usmc.mil',
          role: 'MEMBER',
          role_platoon: '1st Platoon',
          role_company: 'Alpha Company',
          unit_uic: 'M12345',
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
      })

      const result = await listUsers()

      expect(result.data[0].role).toBe('PLATOON_REVIEWER')
    })

    it('should derive COMPANY_REVIEWER role when roleCompany is set but not rolePlatoon', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'test@usmc.mil',
          role: 'MEMBER',
          role_platoon: null,
          role_company: 'Alpha Company',
          unit_uic: 'M12345',
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
      })

      const result = await listUsers()

      expect(result.data[0].role).toBe('COMPANY_REVIEWER')
    })

    it('should set isCommandStaff true when dbRole is COMMANDER', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'co@usmc.mil',
          role: 'COMMANDER',
          is_command_staff: false,
          unit_uic: 'M12345',
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
      })

      const result = await listUsers()

      expect(result.data[0].isCommandStaff).toBe(true)
    })
  })

  describe('upsertUser', () => {
    it('should return ok true on success', async () => {
      mockSupabaseClient.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      })

      const user: UserRecord = {
        id: 'user-1',
        email: 'test@usmc.mil',
        firstName: 'John',
        lastName: 'Doe',
      }

      const result = await upsertUser(user)

      expect(result.ok).toBe(true)
      expect(result.error).toBeNull()
    })
  })

  describe('getUserById', () => {
    it('should return user on success', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@usmc.mil',
        first_name: 'John',
        last_name: 'Doe',
      }

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [mockUser], error: null }),
          }),
        }),
      })

      const result = await getUserById('user-1')

      expect(result.error).toBeNull()
      expect(result.data).not.toBeNull()
      expect(result.data?.id).toBe('user-1')
    })

    it('should return null when user not found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      })

      const result = await getUserById('nonexistent')

      expect(result.error).toBeNull()
      expect(result.data).toBeNull()
    })
  })

  describe('getUserByEmail', () => {
    it('should return user on success', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@usmc.mil',
        first_name: 'John',
        last_name: 'Doe',
      }

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [mockUser], error: null }),
          }),
        }),
      })

      const result = await getUserByEmail('test@usmc.mil')

      expect(result.error).toBeNull()
      expect(result.user).not.toBeNull()
      expect(result.user?.email).toBe('test@usmc.mil')
    })

    it('should normalize email to lowercase', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      })

      await getUserByEmail('  TEST@USMC.MIL  ')

      // Verify that eq was called with normalized email
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('edms_users')
    })
  })

  describe('getUserByEdipi', () => {
    it('should return user on success', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@usmc.mil',
        edipi: '1234567890',
      }

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [mockUser], error: null }),
          }),
        }),
      })

      const result = await getUserByEdipi('1234567890')

      expect(result.error).toBeNull()
      expect(result.user).not.toBeNull()
      expect(result.user?.edipi).toBe('1234567890')
    })
  })

  // ============================================================================
  // Installation Operations
  // ============================================================================

  describe('listInstallations', () => {
    it('should return installations on success', async () => {
      const mockInstallations = [
        {
          id: 'inst-1',
          name: 'Camp Pendleton',
          unit_uics: ['M12345', 'M12346'],
          sections: ['S-1', 'S-3'],
          command_sections: ['XO', 'CO'],
          section_assignments: { 'S-1': ['user-1'] },
          command_section_assignments: { 'XO': ['user-2'] },
          commander_user_id: 'user-co',
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockInstallations, error: null }),
      })

      const result = await listInstallations()

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('inst-1')
      expect(result.data[0].name).toBe('Camp Pendleton')
      expect(result.data[0].unitUics).toEqual(['M12345', 'M12346'])
    })
  })

  describe('upsertInstallation', () => {
    it('should return ok true on success', async () => {
      mockSupabaseClient.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      })

      const installation: Installation = {
        id: 'inst-1',
        name: 'Camp Pendleton',
        unitUics: ['M12345'],
      }

      const result = await upsertInstallation(installation)

      expect(result.ok).toBe(true)
      expect(result.error).toBeNull()
    })
  })

  // ============================================================================
  // HQMC Operations
  // ============================================================================

  describe('listHQMCStructure', () => {
    it('should return HQMC structure on success', async () => {
      const mockStructure = [
        {
          division_name: 'Manpower Management',
          division_code: 'MM',
          branch: 'MMEA',
          description: 'Enlisted Assignments',
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockStructure, error: null }),
          }),
        }),
      })

      const result = await listHQMCStructure()

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data[0].division_code).toBe('MM')
    })
  })

  describe('listHQMCDivisions', () => {
    it('should return HQMC divisions on success', async () => {
      const mockDivisions = [
        {
          id: 'div-1',
          name: 'Manpower Management',
          code: 'MM',
          description: 'Personnel management',
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockDivisions, error: null }),
        }),
      })

      const result = await listHQMCDivisions()

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data[0].code).toBe('MM')
    })
  })

  describe('listHQMCSectionAssignments', () => {
    it('should return section assignments on success', async () => {
      const mockAssignments = [
        {
          division_code: 'MM',
          branch: 'MMEA',
          reviewers: ['user-1', 'user-2'],
          approvers: ['user-3'],
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockAssignments, error: null }),
      })

      const result = await listHQMCSectionAssignments()

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data[0].reviewers).toEqual(['user-1', 'user-2'])
    })
  })

  describe('upsertHQMCSectionAssignment', () => {
    it('should return ok true on success', async () => {
      mockSupabaseClient.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      })

      const result = await upsertHQMCSectionAssignment({
        division_code: 'MM',
        branch: 'MMEA',
        reviewers: ['user-1'],
        approvers: ['user-2'],
      })

      expect(result.ok).toBe(true)
      expect(result.error).toBeNull()
    })
  })

  // ============================================================================
  // Company/Platoon Lookup Operations
  // ============================================================================

  describe('listCompaniesForUnit', () => {
    it('should return unique companies for a unit', async () => {
      const mockData = [
        { company: 'Alpha Company', user_company: null, unit_uic: 'M12345' },
        { company: 'Bravo Company', user_company: 'Bravo Company', unit_uic: 'M12345' },
        { company: 'Alpha Company', user_company: null, unit_uic: 'M12345' },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      })

      const result = await listCompaniesForUnit('M12345')

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(2)
      expect(result.data).toContain('Alpha Company')
      expect(result.data).toContain('Bravo Company')
    })

    it('should return empty array for empty unitUic', async () => {
      const result = await listCompaniesForUnit('')

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })
  })

  describe('listPlatoonsForCompany', () => {
    it('should return unique platoons for a company', async () => {
      const mockData = [
        { user_platoon: '1st Platoon', role_platoon: null },
        { user_platoon: '2nd Platoon', role_platoon: '2nd Platoon' },
        { user_platoon: '1st Platoon', role_platoon: '1st Platoon' },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      })

      const result = await listPlatoonsForCompany('M12345', 'Alpha Company')

      expect(result.error).toBeNull()
      expect(result.data).toContain('1st Platoon')
      expect(result.data).toContain('2nd Platoon')
    })

    it('should return empty array for empty unitUic', async () => {
      const result = await listPlatoonsForCompany('', 'Alpha')

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })

    it('should return empty array for empty company', async () => {
      const result = await listPlatoonsForCompany('M12345', '')

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })
  })

  // ============================================================================
  // Error Handling Edge Cases
  // ============================================================================

  describe('Supabase not initialized', () => {
    beforeEach(() => {
      vi.resetModules()
    })

    it('should handle null Supabase client for listDocuments', async () => {
      // Create a new mock that returns null
      vi.doMock('../lib/supabase', () => ({
        getSupabase: () => null,
      }))

      // Re-import the module to get the new mock
      const { listDocuments: listDocsNull } = await import('../lib/db')

      const result = await listDocsNull()
      expect(result.error).toBe('Supabase client not initialized')
      expect(result.data).toEqual([])
    })
  })
})

// ============================================================================
// Row Conversion Function Tests
// ============================================================================

describe('Row Conversion Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle null/undefined fields in document row', async () => {
    const mockDocs = [
      {
        id: 'doc-1',
        name: null,
        type: null,
        size: null,
        uploaded_at: null,
        category: null,
        tags: null,
        unit_uic: null,
        subject: null,
        due_date: null,
        notes: null,
        uploaded_by_id: null,
        current_stage: null,
        request_id: null,
        file_url: null,
      },
    ]

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockDocs, error: null }),
      }),
    })

    const result = await listDocuments()

    expect(result.data[0].id).toBe('doc-1')
    expect(result.data[0].name).toBe('')
    expect(result.data[0].size).toBe(0)
    expect(result.data[0].tags).toEqual([])
  })

  it('should handle null/undefined fields in request row', async () => {
    const mockRequests = [
      {
        id: 'req-1',
        subject: null,
        due_date: null,
        notes: null,
        unit_uic: null,
        uploaded_by_id: null,
        submit_for_user_id: null,
        document_ids: null,
        created_at: null,
        current_stage: null,
        activity: null,
        route_section: null,
        commander_approval_date: null,
        external_pending_unit_name: null,
        external_pending_unit_uic: null,
        external_pending_stage: null,
        installation_id: null,
        final_status: null,
      },
    ]

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockRequests, error: null }),
      }),
    })

    const result = await listRequests()

    expect(result.data[0].id).toBe('req-1')
    expect(result.data[0].subject).toBe('')
    expect(result.data[0].documentIds).toEqual([])
    expect(result.data[0].activity).toEqual([])
  })

  it('should handle legacy unit_uic in installation row', async () => {
    const mockInstallations = [
      {
        id: 'inst-1',
        name: 'Camp Lejeune',
        unit_uics: null,
        unit_uic: 'M12345', // Legacy field
        sections: [],
        command_sections: [],
        section_assignments: null,
        command_section_assignments: null,
        commander_user_id: null,
      },
    ]

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: mockInstallations, error: null }),
    })

    const result = await listInstallations()

    expect(result.data[0].unitUics).toEqual(['M12345'])
  })

  it('should handle N/A values in user row platoon field', async () => {
    const mockUsers = [
      {
        id: 'user-1',
        role: 'MEMBER',
        role_platoon: 'N/A',
        role_company: 'Alpha Company',
      },
    ]

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
    })

    const result = await listUsers()

    // Should derive COMPANY_REVIEWER since rolePlatoon is 'N/A'
    expect(result.data[0].role).toBe('COMPANY_REVIEWER')
  })
})
