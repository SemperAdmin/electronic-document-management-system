import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase before importing auth module
const mockAuthClient = {
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(),
}

const mockSupabaseClient = {
  auth: mockAuthClient,
}

vi.mock('../lib/supabase', () => ({
  getSupabase: () => mockSupabaseClient,
}))

import {
  signUp,
  signInWithPassword,
  signOut,
  getCurrentAuthUser,
} from '../lib/auth'

describe('Authentication Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // signUp
  // ============================================================================

  describe('signUp', () => {
    it('should call Supabase signUp with email and password', async () => {
      const mockResponse = {
        data: { user: { id: 'user-1', email: 'test@usmc.mil' }, session: {} },
        error: null,
      }
      mockAuthClient.signUp.mockResolvedValue(mockResponse)

      const result = await signUp('test@usmc.mil', 'SecurePassword123!')

      expect(mockAuthClient.signUp).toHaveBeenCalledWith({
        email: 'test@usmc.mil',
        password: 'SecurePassword123!',
      })
      expect(result.data.user.email).toBe('test@usmc.mil')
      expect(result.error).toBeNull()
    })

    it('should return error when signUp fails', async () => {
      const mockResponse = {
        data: { user: null, session: null },
        error: { message: 'Email already registered' },
      }
      mockAuthClient.signUp.mockResolvedValue(mockResponse)

      const result = await signUp('existing@usmc.mil', 'password')

      expect(result.error.message).toBe('Email already registered')
    })

    it('should return error when password is too weak', async () => {
      const mockResponse = {
        data: { user: null, session: null },
        error: { message: 'Password should be at least 6 characters' },
      }
      mockAuthClient.signUp.mockResolvedValue(mockResponse)

      const result = await signUp('test@usmc.mil', '123')

      expect(result.error.message).toContain('Password')
    })
  })

  // ============================================================================
  // signInWithPassword
  // ============================================================================

  describe('signInWithPassword', () => {
    it('should call Supabase signInWithPassword with credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@usmc.mil',
        aud: 'authenticated',
        role: 'authenticated',
      }
      const mockResponse = {
        data: { user: mockUser, session: { access_token: 'token123' } },
        error: null,
      }
      mockAuthClient.signInWithPassword.mockResolvedValue(mockResponse)

      const result = await signInWithPassword('test@usmc.mil', 'password123')

      expect(mockAuthClient.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@usmc.mil',
        password: 'password123',
      })
      expect(result.data.user.email).toBe('test@usmc.mil')
      expect(result.data.session.access_token).toBe('token123')
    })

    it('should return error for invalid credentials', async () => {
      const mockResponse = {
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      }
      mockAuthClient.signInWithPassword.mockResolvedValue(mockResponse)

      const result = await signInWithPassword('wrong@usmc.mil', 'wrongpass')

      expect(result.error.message).toBe('Invalid login credentials')
    })

    it('should return error for unconfirmed email', async () => {
      const mockResponse = {
        data: { user: null, session: null },
        error: { message: 'Email not confirmed' },
      }
      mockAuthClient.signInWithPassword.mockResolvedValue(mockResponse)

      const result = await signInWithPassword('unconfirmed@usmc.mil', 'password')

      expect(result.error.message).toBe('Email not confirmed')
    })
  })

  // ============================================================================
  // signOut
  // ============================================================================

  describe('signOut', () => {
    it('should call Supabase signOut', async () => {
      mockAuthClient.signOut.mockResolvedValue({ error: null })

      const result = await signOut()

      expect(mockAuthClient.signOut).toHaveBeenCalled()
      expect(result.error).toBeNull()
    })

    it('should return error if signOut fails', async () => {
      mockAuthClient.signOut.mockResolvedValue({
        error: { message: 'Session expired' },
      })

      const result = await signOut()

      expect(result.error.message).toBe('Session expired')
    })
  })

  // ============================================================================
  // getCurrentAuthUser
  // ============================================================================

  describe('getCurrentAuthUser', () => {
    it('should return user when authenticated', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@usmc.mil',
        aud: 'authenticated',
      }
      mockAuthClient.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await getCurrentAuthUser()

      expect(result).not.toBeNull()
      expect(result?.id).toBe('user-1')
      expect(result?.email).toBe('test@usmc.mil')
    })

    it('should return null when not authenticated', async () => {
      mockAuthClient.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getCurrentAuthUser()

      expect(result).toBeNull()
    })

    it('should return null when getUser returns no data', async () => {
      mockAuthClient.getUser.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await getCurrentAuthUser()

      expect(result).toBeNull()
    })

    it('should return null when there is an error', async () => {
      mockAuthClient.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' },
      })

      const result = await getCurrentAuthUser()

      expect(result).toBeNull()
    })
  })

  // ============================================================================
  // Supabase Not Initialized
  // ============================================================================

  describe('when Supabase is not initialized', () => {
    beforeEach(() => {
      vi.resetModules()
    })

    it('signUp should return error when auth is null', async () => {
      vi.doMock('../lib/supabase', () => ({
        getSupabase: () => ({ auth: null }),
      }))

      const { signUp: signUpNull } = await import('../lib/auth')
      const result = await signUpNull('test@usmc.mil', 'password')

      expect(result.error.message).toBe('supabase_not_initialized')
    })

    it('signInWithPassword should return error when auth is null', async () => {
      vi.doMock('../lib/supabase', () => ({
        getSupabase: () => ({ auth: null }),
      }))

      const { signInWithPassword: signInNull } = await import('../lib/auth')
      const result = await signInNull('test@usmc.mil', 'password')

      expect(result.error.message).toBe('supabase_not_initialized')
    })

    it('signOut should return error when auth is null', async () => {
      vi.doMock('../lib/supabase', () => ({
        getSupabase: () => ({ auth: null }),
      }))

      const { signOut: signOutNull } = await import('../lib/auth')
      const result = await signOutNull()

      expect(result.error.message).toBe('supabase_not_initialized')
    })

    it('getCurrentAuthUser should return null when auth is null', async () => {
      vi.doMock('../lib/supabase', () => ({
        getSupabase: () => ({ auth: null }),
      }))

      const { getCurrentAuthUser: getAuthNull } = await import('../lib/auth')
      const result = await getAuthNull()

      expect(result).toBeNull()
    })

    it('should handle completely null Supabase client', async () => {
      vi.doMock('../lib/supabase', () => ({
        getSupabase: () => null,
      }))

      const { signUp: signUpNoClient } = await import('../lib/auth')
      const result = await signUpNoClient('test@usmc.mil', 'password')

      expect(result.error.message).toBe('supabase_not_initialized')
    })
  })
})

// ============================================================================
// Authentication Integration Scenarios
// ============================================================================

describe('Authentication Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Military Email Patterns', () => {
    it('should accept .mil email addresses', async () => {
      const mockResponse = {
        data: { user: { id: 'user-1', email: 'john.doe@usmc.mil' }, session: {} },
        error: null,
      }
      mockAuthClient.signUp.mockResolvedValue(mockResponse)

      const result = await signUp('john.doe@usmc.mil', 'SecurePass123!')

      expect(result.data.user.email).toBe('john.doe@usmc.mil')
    })

    it('should accept HQMC email addresses', async () => {
      const mockResponse = {
        data: { user: { id: 'user-1', email: 'admin@hqmc.usmc.mil' }, session: {} },
        error: null,
      }
      mockAuthClient.signUp.mockResolvedValue(mockResponse)

      const result = await signUp('admin@hqmc.usmc.mil', 'SecurePass123!')

      expect(result.data.user.email).toBe('admin@hqmc.usmc.mil')
    })
  })

  describe('Session Management', () => {
    it('should successfully sign in and get user in sequence', async () => {
      const mockUser = { id: 'user-1', email: 'test@usmc.mil' }

      // Sign in
      mockAuthClient.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null,
      })

      const signInResult = await signInWithPassword('test@usmc.mil', 'password')
      expect(signInResult.data.user.id).toBe('user-1')

      // Get current user
      mockAuthClient.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const currentUser = await getCurrentAuthUser()
      expect(currentUser?.id).toBe('user-1')
    })

    it('should return null user after sign out', async () => {
      // Sign out
      mockAuthClient.signOut.mockResolvedValue({ error: null })
      await signOut()

      // Get current user should return null
      mockAuthClient.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const currentUser = await getCurrentAuthUser()
      expect(currentUser).toBeNull()
    })
  })
})
