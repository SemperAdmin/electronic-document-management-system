import { getSupabase } from './supabase'
import { UserRecord, Installation } from '@/types';

// ============================================================================
// Database Row Types (matching Supabase schema)
// ============================================================================

/** Raw database row for edms_documents table */
interface DocumentRow {
  id: string
  name: string
  type: string
  size: number
  uploaded_at: string
  category: string
  tags: string[]
  unit_uic: string
  subject: string
  due_date: string | null
  notes: string | null
  uploaded_by_id: string | null
  current_stage: string | null
  request_id: string | null
  file_url: string | null
}

/** Raw database row for edms_requests table */
interface RequestRow {
  id: string
  subject: string
  due_date: string | null
  notes: string | null
  unit_uic: string
  uploaded_by_id: string
  submit_for_user_id: string | null
  document_ids: string[]
  created_at: string
  current_stage: string | null
  activity: Array<{ actor: string; actorRole?: string; timestamp: string; action: string; comment?: string }>
  route_section: string | null
  commander_approval_date: string | null
  external_pending_unit_name: string | null
  external_pending_unit_uic: string | null
  external_pending_stage: string | null
  installation_id: string | null
  final_status: string | null
}

/** Raw database row for edms_users table */
interface UserRow {
  id: string
  email: string | null
  rank: string | null
  first_name: string | null
  last_name: string | null
  mi: string | null
  service: string | null
  role: string | null
  unit_uic: string | null
  unit: string | null
  company: string | null
  user_company: string | null
  is_unit_admin: boolean | null
  is_hqmc_admin: boolean | null
  is_installation_admin: boolean | null
  is_command_staff: boolean | null
  is_app_admin: boolean | null
  edipi: string | null
  password_hash: string | null
  user_platoon: string | null
  role_company: string | null
  role_platoon: string | null
  installation_id: string | null
  hqmc_division: string | null
}

/** Raw database row for edms_installations table */
interface InstallationRow {
  id: string
  name: string
  unit_uics: string[]
  unit_uic?: string // Legacy field
  sections: string[]
  command_sections: string[]
  section_assignments: Record<string, string[]>
  command_section_assignments: Record<string, string[]>
  commander_user_id: string | null
}

/** Raw database row for hqmc_structure table */
interface HQMCStructureRow {
  division_name: string
  division_code: string | null
  branch: string
  description: string | null
}

/** Raw database row for hqmc_divisions table */
interface HQMCDivisionRow {
  id: string
  name: string
  code: string
  description: string | null
}

/** Raw database row for hqmc_section_assignments table */
interface HQMCSectionAssignmentRow {
  division_code: string
  branch: string
  reviewers: string[]
  approvers: string[]
}

// ============================================================================
// Result Types for Better Error Handling
// ============================================================================

/** Standard result type for database operations */
export interface DbResult<T> {
  data: T | null
  error: string | null
}

/** Standard result type for list operations */
export interface DbListResult<T> {
  data: T[]
  error: string | null
}

/** Standard result type for mutation operations */
export interface DbMutationResult {
  ok: boolean
  error: string | null
}

// ============================================================================
// Application Record Types
// ============================================================================

export type DocumentRecord = {
  id: string
  name: string
  type: string
  size: number
  uploadedAt: Date
  category: string
  tags: string[]
  unitUic: string
  subject: string
  dueDate?: string
  notes?: string
  uploadedById?: string
  currentStage?: string
  requestId?: string
  fileUrl?: string
}

export type RequestRecord = {
  id: string
  subject: string
  dueDate?: string
  notes?: string
  unitUic?: string
  uploadedById: string
  submitForUserId?: string
  documentIds: string[]
  createdAt: string
  currentStage?: string
  activity?: Array<{ actor: string; actorRole?: string; timestamp: string; action: string; comment?: string }>
  routeSection?: string
  commanderApprovalDate?: string
  externalPendingUnitName?: string
  externalPendingUnitUic?: string
  externalPendingStage?: string
  installationId?: string;
  finalStatus?: string;
}

export type HQMCStructureRecord = {
  division_name: string
  division_code?: string
  branch: string
  description?: string
}

export type HQMCDivisionRecord = {
  id: string
  name: string
  code: string
  description?: string
}

export type HQMCSectionAssignmentRecord = {
  division_code: string
  branch: string
  reviewers: string[]
  approvers: string[]
}

// ============================================================================
// Row Conversion Functions
// ============================================================================

function toDocRow(d: DocumentRecord): Omit<DocumentRow, never> {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    size: d.size,
    uploaded_at: d.uploadedAt?.toISOString() ?? new Date().toISOString(),
    category: d.category,
    tags: d.tags ?? [],
    unit_uic: d.unitUic,
    subject: d.subject,
    due_date: d.dueDate ?? null,
    notes: d.notes ?? null,
    uploaded_by_id: d.uploadedById ?? null,
    current_stage: d.currentStage ?? null,
    request_id: d.requestId ?? null,
    file_url: d.fileUrl ?? null,
  }
}

function fromDocRow(r: DocumentRow): DocumentRecord {
  return {
    id: String(r.id),
    name: String(r.name || ''),
    type: String(r.type || ''),
    size: Number(r.size || 0),
    uploadedAt: new Date(String(r.uploaded_at || new Date().toISOString())),
    category: String(r.category || ''),
    tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
    unitUic: String(r.unit_uic || ''),
    subject: String(r.subject || ''),
    dueDate: r.due_date ? String(r.due_date) : undefined,
    notes: r.notes ? String(r.notes) : undefined,
    uploadedById: r.uploaded_by_id ? String(r.uploaded_by_id) : undefined,
    currentStage: r.current_stage ? String(r.current_stage) : undefined,
    requestId: r.request_id ? String(r.request_id) : undefined,
    fileUrl: r.file_url ? String(r.file_url) : undefined,
  }
}

function toReqRow(r: RequestRecord): Omit<RequestRow, never> {
  return {
    id: r.id,
    subject: r.subject,
    due_date: r.dueDate ?? null,
    notes: r.notes ?? null,
    unit_uic: r.unitUic ?? '',
    uploaded_by_id: r.uploadedById,
    submit_for_user_id: r.submitForUserId ?? null,
    document_ids: r.documentIds ?? [],
    created_at: r.createdAt ?? new Date().toISOString(),
    current_stage: r.currentStage ?? null,
    activity: r.activity ?? [],
    route_section: r.routeSection ?? null,
    commander_approval_date: r.commanderApprovalDate ?? null,
    external_pending_unit_name: r.externalPendingUnitName ?? null,
    external_pending_unit_uic: r.externalPendingUnitUic ?? null,
    external_pending_stage: r.externalPendingStage ?? null,
    installation_id: r.installationId ?? null,
    final_status: r.finalStatus ?? null,
  }
}

function fromReqRow(r: RequestRow): RequestRecord {
  return {
    id: String(r.id),
    subject: String(r.subject || ''),
    dueDate: r.due_date ? String(r.due_date) : undefined,
    notes: r.notes ? String(r.notes) : undefined,
    unitUic: String(r.unit_uic || ''),
    uploadedById: String(r.uploaded_by_id || ''),
    submitForUserId: r.submit_for_user_id ? String(r.submit_for_user_id) : undefined,
    documentIds: Array.isArray(r.document_ids) ? r.document_ids.map(String) : [],
    createdAt: String(r.created_at || new Date().toISOString()),
    currentStage: r.current_stage ? String(r.current_stage) : undefined,
    activity: Array.isArray(r.activity) ? r.activity : [],
    routeSection: r.route_section ? String(r.route_section) : undefined,
    commanderApprovalDate: r.commander_approval_date ? String(r.commander_approval_date) : undefined,
    externalPendingUnitName: r.external_pending_unit_name ? String(r.external_pending_unit_name) : undefined,
    externalPendingUnitUic: r.external_pending_unit_uic ? String(r.external_pending_unit_uic) : undefined,
    externalPendingStage: r.external_pending_stage ? String(r.external_pending_stage) : undefined,
    installationId: r.installation_id ? String(r.installation_id) : undefined,
    finalStatus: r.final_status ? String(r.final_status) : undefined,
  }
}

function toUserRow(u: UserRecord): Partial<UserRow> {
  return {
    id: u.id,
    email: u.email ?? null,
    rank: u.rank ?? null,
    first_name: u.firstName ?? null,
    last_name: u.lastName ?? null,
    mi: u.mi ?? null,
    service: u.service ?? null,
    role: u.role ?? null,
    unit_uic: u.unitUic ?? null,
    unit: u.unit ?? null,
    user_company: u.company ?? null,
    is_unit_admin: u.isUnitAdmin ?? null,
    is_hqmc_admin: u.isHqmcAdmin ?? null,
    is_installation_admin: u.isInstallationAdmin ?? null,
    is_command_staff: u.isCommandStaff ?? null,
    is_app_admin: u.isAppAdmin ?? null,
    edipi: u.edipi ?? null,
    password_hash: u.passwordHash ?? null,
    user_platoon: u.platoon ?? null,
    role_company: u.roleCompany ?? null,
    role_platoon: u.rolePlatoon ?? null,
    installation_id: u.installationId ?? null,
    hqmc_division: u.hqmcDivision ?? null,
  }
}

function fromUserRow(r: UserRow): UserRecord {
  const dbRole = r.role ? String(r.role) : 'MEMBER';
  let displayRole = dbRole;

  const roleCompany = r.role_company ? String(r.role_company) : undefined;
  const rolePlatoon = r.role_platoon ? String(r.role_platoon) : undefined;

  // Determine the display role based on review scope.
  if (rolePlatoon && rolePlatoon !== 'N/A') {
    displayRole = 'PLATOON_REVIEWER';
  } else if (roleCompany && roleCompany !== 'N/A') {
    displayRole = 'COMPANY_REVIEWER';
  }

  // A user with a DB role of COMMANDER should always have command staff access,
  // even if their display role is overridden to a reviewer role.
  const hasCommandAccess = dbRole === 'COMMANDER' || !!r.is_command_staff;

  // Debug: log role transformation for first few users
  if (r.email) {
    console.log('[DB] fromUserRow:', {
      email: r.email,
      dbRole,
      displayRole,
      roleCompany,
      rolePlatoon,
      is_unit_admin: r.is_unit_admin,
      is_command_staff: r.is_command_staff,
      hasCommandAccess,
    });
  }

  return {
    id: String(r.id),
    email: r.email ? String(r.email) : undefined,
    rank: r.rank ? String(r.rank) : undefined,
    firstName: r.first_name ? String(r.first_name) : undefined,
    lastName: r.last_name ? String(r.last_name) : undefined,
    mi: r.mi ? String(r.mi) : undefined,
    service: r.service ? String(r.service) : undefined,
    role: displayRole,
    unitUic: r.unit_uic ? String(r.unit_uic) : undefined,
    unit: r.unit ? String(r.unit) : undefined,
    company: (r.company ? String(r.company) : (r.user_company ? String(r.user_company) : undefined)),
    isUnitAdmin: !!r.is_unit_admin,
    isHqmcAdmin: !!r.is_hqmc_admin,
    isInstallationAdmin: !!r.is_installation_admin,
    isCommandStaff: hasCommandAccess,
    isAppAdmin: !!r.is_app_admin,
    edipi: r.edipi ? String(r.edipi) : undefined,
    passwordHash: r.password_hash ? String(r.password_hash) : undefined,
    platoon: r.user_platoon ? String(r.user_platoon) : undefined,
    roleCompany: roleCompany,
    rolePlatoon: rolePlatoon,
    installationId: r.installation_id ? String(r.installation_id) : undefined,
    hqmcDivision: r.hqmc_division ? String(r.hqmc_division) : undefined,
  }
}

function fromInstallationRow(r: InstallationRow): Installation {
  return {
    id: String(r.id),
    name: String(r.name || ''),
    unitUics: Array.isArray(r.unit_uics)
      ? r.unit_uics.map((x) => String(x))
      : (r.unit_uic ? [String(r.unit_uic)] : []),
    sections: Array.isArray(r.sections) ? r.sections.map((x) => String(x)) : [],
    commandSections: Array.isArray(r.command_sections) ? r.command_sections.map((x) => String(x)) : [],
    sectionAssignments: (r.section_assignments && typeof r.section_assignments === 'object') ? r.section_assignments : {},
    commandSectionAssignments: (r.command_section_assignments && typeof r.command_section_assignments === 'object') ? r.command_section_assignments : {},
    commanderUserId: r.commander_user_id ? String(r.commander_user_id) : undefined,
  }
}

function toInstallationRow(installation: Installation): Omit<InstallationRow, 'unit_uic'> {
  return {
    id: String(installation.id),
    name: String(installation.name || ''),
    unit_uics: Array.isArray(installation.unitUics) ? installation.unitUics.map(String) : [],
    sections: Array.isArray(installation.sections) ? installation.sections.map(String) : [],
    command_sections: Array.isArray(installation.commandSections) ? installation.commandSections.map(String) : [],
    section_assignments: installation.sectionAssignments || {},
    command_section_assignments: installation.commandSectionAssignments || {},
    commander_user_id: installation.commanderUserId || null,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

// ============================================================================
// Document Operations
// ============================================================================

export async function listDocuments(): Promise<DbListResult<DocumentRecord>> {
  try {
    const sb = getSupabase()
    if (!sb?.from) {
      return { data: [], error: 'Supabase client not initialized' }
    }
    const { data, error } = await sb.from('edms_documents').select('*').order('uploaded_at', { ascending: false })
    if (error) {
      console.error('[DB] listDocuments failed:', error.message)
      return { data: [], error: error.message }
    }
    return { data: ((data ?? []) as DocumentRow[]).map(fromDocRow), error: null }
  } catch (e) {
    const msg = getErrorMessage(e)
    console.error('[DB] listDocuments exception:', msg)
    return { data: [], error: msg }
  }
}

export async function upsertDocuments(docs: DocumentRecord[]): Promise<DbMutationResult> {
  try {
    if (!docs.length) return { ok: true, error: null }
    const sb = getSupabase()
    if (!sb?.from) return { ok: false, error: 'Supabase client not initialized' }
    const { error } = await sb.from('edms_documents').upsert(docs.map(toDocRow))
    if (error) {
      console.error('[DB] upsertDocuments failed:', error.message)
      return { ok: false, error: error.message }
    }
    return { ok: true, error: null }
  } catch (e) {
    const msg = getErrorMessage(e)
    console.error('[DB] upsertDocuments exception:', msg)
    return { ok: false, error: msg }
  }
}

export async function deleteDocumentById(id: string): Promise<DbMutationResult> {
  try {
    const sb = getSupabase()
    if (!sb?.from) return { ok: false, error: 'Supabase client not initialized' }
    const { error } = await sb.from('edms_documents').delete().eq('id', id)
    if (error) {
      console.error('[DB] deleteDocumentById failed:', error.message)
      return { ok: false, error: error.message }
    }
    return { ok: true, error: null }
  } catch (e) {
    const msg = getErrorMessage(e)
    console.error('[DB] deleteDocumentById exception:', msg)
    return { ok: false, error: msg }
  }
}

export async function deleteDocumentsByRequestId(requestId: string): Promise<DbMutationResult> {
  try {
    const sb = getSupabase()
    if (!sb?.from) return { ok: false, error: 'Supabase client not initialized' }
    const { error } = await sb.from('edms_documents').delete().eq('request_id', requestId)
    if (error) {
      console.error('[DB] deleteDocumentsByRequestId failed:', error.message)
      return { ok: false, error: error.message }
    }
    return { ok: true, error: null }
  } catch (e) {
    const msg = getErrorMessage(e)
    console.error('[DB] deleteDocumentsByRequestId exception:', msg)
    return { ok: false, error: msg }
  }
}

// ============================================================================
// Request Operations
// ============================================================================

export async function listRequests(): Promise<DbListResult<RequestRecord>> {
  try {
    const sb = getSupabase()
    if (!sb?.from) {
      return { data: [], error: 'Supabase client not initialized' }
    }
    const { data, error } = await sb.from('edms_requests').select('*').order('created_at', { ascending: false })
    if (error) {
      console.error('[DB] listRequests failed:', error.message)
      return { data: [], error: error.message }
    }
    return { data: ((data ?? []) as RequestRow[]).map(fromReqRow), error: null }
  } catch (e) {
    const msg = getErrorMessage(e)
    console.error('[DB] listRequests exception:', msg)
    return { data: [], error: msg }
  }
}

export async function upsertRequest(r: RequestRecord): Promise<DbMutationResult> {
  try {
    const sb = getSupabase()
    if (!sb?.from) return { ok: false, error: 'Supabase client not initialized' }
    const { error } = await sb.from('edms_requests').upsert(toReqRow(r))
    if (error) {
      console.error('[DB] upsertRequest failed:', error.message)
      return { ok: false, error: error.message }
    }
    return { ok: true, error: null }
  } catch (e) {
    const msg = getErrorMessage(e)
    console.error('[DB] upsertRequest exception:', msg)
    return { ok: false, error: msg }
  }
}

export async function deleteRequestById(id: string): Promise<DbMutationResult> {
  try {
    const sb = getSupabase()
    if (!sb?.from) return { ok: false, error: 'Supabase client not initialized' }
    const { error } = await sb.from('edms_requests').delete().eq('id', id)
    if (error) {
      console.error('[DB] deleteRequestById failed:', error.message)
      return { ok: false, error: error.message }
    }
    return { ok: true, error: null }
  } catch (e) {
    const msg = getErrorMessage(e)
    console.error('[DB] deleteRequestById exception:', msg)
    return { ok: false, error: msg }
  }
}

// ============================================================================
// User Operations
// ============================================================================

export async function listUsers(): Promise<DbListResult<UserRecord>> {
  try {
    const sb = getSupabase()
    if (!sb?.from) {
      return { data: [], error: 'Supabase client not initialized' }
    }
    const { data, error } = await sb.from('edms_users').select('*')
    if (error) {
      console.error('[DB] listUsers failed:', error.message)
      return { data: [], error: error.message }
    }
    // Debug: log raw data from Supabase for permission fields
    if (data && data.length > 0) {
      console.log('[DB] listUsers raw data sample:', data.slice(0, 2).map((u: any) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        is_unit_admin: u.is_unit_admin,
        is_command_staff: u.is_command_staff,
        role_company: u.role_company,
        role_platoon: u.role_platoon,
      })))
    }
    return { data: ((data ?? []) as UserRow[]).map(fromUserRow), error: null }
  } catch (e) {
    const msg = getErrorMessage(e)
    console.error('[DB] listUsers exception:', msg)
    return { data: [], error: msg }
  }
}

export async function upsertUser(u: UserRecord): Promise<DbMutationResult> {
  try {
    const sb = getSupabase()
    if (!sb?.from) return { ok: false, error: 'Supabase client not initialized' }
    const { error } = await sb.from('edms_users').upsert(toUserRow(u))
    if (error) {
      console.error('[DB] upsertUser failed:', error.message)
      return { ok: false, error: error.message }
    }
    return { ok: true, error: null }
  } catch (e) {
    const msg = getErrorMessage(e)
    console.error('[DB] upsertUser exception:', msg)
    return { ok: false, error: msg }
  }
}

export async function getUserById(id: string): Promise<DbResult<UserRecord>> {
  try {
    const sb = getSupabase()
    if (!sb?.from) {
      return { data: null, error: 'Supabase client not initialized' }
    }
    const { data, error } = await sb.from('edms_users').select('*').eq('id', id).limit(1)
    if (error) {
      console.error('[DB] getUserById failed:', error.message)
      return { data: null, error: error.message }
    }
    const row = ((data ?? []) as UserRow[])[0]
    return { data: row ? fromUserRow(row) : null, error: null }
  } catch (e) {
    const msg = getErrorMessage(e)
    console.error('[DB] getUserById exception:', msg)
    return { data: null, error: msg }
  }
}

export async function getUserByEmail(email: string): Promise<{ user: UserRecord | null; error: string | null }> {
  try {
    const sb = getSupabase()
    if (!sb?.from) {
      const error = 'Supabase client not initialized';
      console.error('[DB] getUserByEmail failed:', { email, error });
      return { user: null, error };
    }
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await sb.from('edms_users').select('*').eq('email', normalizedEmail).limit(1);
    if (error) {
      console.error('[DB] getUserByEmail query failed:', { email, error: error.message });
      return { user: null, error: error.message };
    }
    const row = ((data ?? []) as UserRow[])[0];
    return { user: row ? fromUserRow(row) : null, error: null };
  } catch (e) {
    const msg = getErrorMessage(e)
    console.error('[DB] getUserByEmail exception:', { email, error: msg });
    return { user: null, error: msg };
  }
}

export async function getUserByEdipi(edipi: string): Promise<{ user: UserRecord | null; error: string | null }> {
  try {
    const sb = getSupabase()
    if (!sb?.from) {
      const error = 'Supabase client not initialized';
      console.error('[DB] getUserByEdipi failed:', { edipi, error });
      return { user: null, error };
    }
    const { data, error } = await sb.from('edms_users').select('*').eq('edipi', edipi).limit(1);
    if (error) {
      console.error('[DB] getUserByEdipi query failed:', { edipi, error: error.message });
      return { user: null, error: error.message };
    }
    const row = ((data ?? []) as UserRow[])[0];
    return { user: row ? fromUserRow(row) : null, error: null };
  } catch (e) {
    const msg = getErrorMessage(e)
    console.error('[DB] getUserByEdipi exception:', { edipi, error: msg });
    return { user: null, error: msg };
  }
}

// ============================================================================
// Company/Platoon Lookup Operations
// ============================================================================

interface CompanyRow {
  company: string | null
  user_company: string | null
  unit_uic: string | null
}

export async function listCompaniesForUnit(unitUic: string): Promise<DbListResult<string>> {
  try {
    const uic = String(unitUic || '')
    if (!uic) return { data: [], error: null }
    const sb = getSupabase()
    if (!sb?.from) return { data: [], error: 'Supabase client not initialized' }
    const { data, error } = await sb
      .from('edms_users')
      .select('company, user_company, unit_uic')
      .eq('unit_uic', uic)
      .or('company.neq.N/A,user_company.neq.N/A')
    if (error) {
      console.error('[DB] listCompaniesForUnit failed:', error.message)
      return { data: [], error: error.message }
    }
    const rows = (data ?? []) as CompanyRow[]
    const vals: string[] = rows
      .map((r) => String((r.company || r.user_company || '')).trim())
      .filter((v): v is string => !!v)
    const uniq: string[] = Array.from(new Set<string>(vals))
    return { data: uniq.sort((a, b) => a.localeCompare(b)), error: null }
  } catch (e) {
    const msg = getErrorMessage(e)
    console.error('[DB] listCompaniesForUnit exception:', msg)
    return { data: [], error: msg }
  }
}

interface PlatoonRow {
  user_platoon: string | null
  role_platoon: string | null
  unit_uic: string | null
  company: string | null
  user_company: string | null
  role_company: string | null
}

export async function listPlatoonsForCompany(unitUic: string, company: string): Promise<DbListResult<string>> {
  try {
    const uic = String(unitUic || '')
    const comp = String(company || '')
    if (!uic || !comp) return { data: [], error: null }
    const sb = getSupabase()
    if (!sb?.from) return { data: [], error: 'Supabase client not initialized' }
    const { data, error } = await sb
      .from('edms_users')
      .select('user_platoon, role_platoon, unit_uic, company, user_company, role_company')
      .eq('unit_uic', uic)
      .or(`company.eq.${comp},user_company.eq.${comp},role_company.eq.${comp}`)
    if (error) {
      console.error('[DB] listPlatoonsForCompany failed:', error.message)
      return { data: [], error: error.message }
    }
    const rows = (data ?? []) as PlatoonRow[]
    const vals: string[] = []
    // Collect both user_platoon and role_platoon values
    rows.forEach((r) => {
      const userPlatoon = String(r.user_platoon || '').trim()
      const rolePlatoon = String(r.role_platoon || '').trim()
      if (userPlatoon && userPlatoon !== 'N/A') vals.push(userPlatoon)
      if (rolePlatoon && rolePlatoon !== 'N/A') vals.push(rolePlatoon)
    })
    const uniq: string[] = Array.from(new Set<string>(vals.filter(v => !!v)))
    return { data: uniq.sort((a, b) => a.localeCompare(b)), error: null }
  } catch (e) {
    const msg = getErrorMessage(e)
    console.error('[DB] listPlatoonsForCompany exception:', msg)
    return { data: [], error: msg }
  }
}

// ============================================================================
// Installation Operations
// ============================================================================

export async function listInstallations(): Promise<DbListResult<Installation>> {
  try {
    const sb = getSupabase()
    if (!sb?.from) {
      return { data: [], error: 'Supabase client not initialized' }
    }
    const { data, error } = await sb.from('edms_installations').select('*')
    if (error) {
      console.error('[DB] listInstallations failed:', error.message)
      return { data: [], error: error.message }
    }
    return { data: ((data ?? []) as InstallationRow[]).map(fromInstallationRow), error: null }
  } catch (e) {
    const msg = getErrorMessage(e)
    console.error('[DB] listInstallations exception:', msg)
    return { data: [], error: msg }
  }
}

export async function upsertInstallation(installation: Installation): Promise<DbMutationResult> {
  try {
    const sb = getSupabase()
    if (!sb?.from) return { ok: false, error: 'Supabase client not initialized' }
    const { error } = await sb.from('edms_installations').upsert(toInstallationRow(installation))
    if (error) {
      console.error('[DB] upsertInstallation failed:', error.message)
      return { ok: false, error: error.message }
    }
    return { ok: true, error: null }
  } catch (e) {
    const msg = getErrorMessage(e)
    console.error('[DB] upsertInstallation exception:', msg)
    return { ok: false, error: msg }
  }
}

// ============================================================================
// HQMC Structure Operations
// ============================================================================

export async function listHQMCStructure(): Promise<DbListResult<HQMCStructureRecord>> {
  try {
    const sb = getSupabase()
    if (!sb?.from) {
      return { data: [], error: 'Supabase client not initialized' }
    }
    const { data, error } = await sb.from('hqmc_structure').select('*').order('division_code').order('branch')
    if (error) {
      console.error('[DB] listHQMCStructure failed:', error.message)
      return { data: [], error: error.message }
    }
    const rows = (data ?? []) as HQMCStructureRow[]
    return {
      data: rows.map((r) => ({
        division_name: String(r.division_name || ''),
        division_code: r.division_code ? String(r.division_code) : undefined,
        branch: String(r.branch || ''),
        description: r.description ? String(r.description) : undefined,
      })),
      error: null
    }
  } catch (e) {
    const msg = getErrorMessage(e)
    console.error('[DB] listHQMCStructure exception:', msg)
    return { data: [], error: msg }
  }
}

export async function listHQMCDivisions(): Promise<DbListResult<HQMCDivisionRecord>> {
  try {
    const sb = getSupabase()
    if (!sb?.from) {
      return { data: [], error: 'Supabase client not initialized' }
    }
    const { data, error } = await sb.from('hqmc_divisions').select('*').order('code')
    if (error) {
      console.error('[DB] listHQMCDivisions failed:', error.message)
      return { data: [], error: error.message }
    }
    const rows = (data ?? []) as HQMCDivisionRow[]
    return {
      data: rows.map((r) => ({
        id: String(r.id),
        name: String(r.name || ''),
        code: String(r.code || ''),
        description: r.description ? String(r.description) : undefined,
      })),
      error: null
    }
  } catch (e) {
    const msg = getErrorMessage(e)
    console.error('[DB] listHQMCDivisions exception:', msg)
    return { data: [], error: msg }
  }
}

export async function listHQMCSectionAssignments(): Promise<DbListResult<HQMCSectionAssignmentRecord>> {
  try {
    const sb = getSupabase()
    if (!sb?.from) {
      return { data: [], error: 'Supabase client not initialized' }
    }
    const { data, error } = await sb.from('hqmc_section_assignments').select('*')
    if (error) {
      console.error('[DB] listHQMCSectionAssignments failed:', error.message)
      return { data: [], error: error.message }
    }
    const rows = (data ?? []) as HQMCSectionAssignmentRow[]
    return {
      data: rows.map((r) => ({
        division_code: String(r.division_code || ''),
        branch: String(r.branch || ''),
        reviewers: Array.isArray(r.reviewers) ? r.reviewers.map(String) : [],
        approvers: Array.isArray(r.approvers) ? r.approvers.map(String) : [],
      })),
      error: null
    }
  } catch (e) {
    const msg = getErrorMessage(e)
    console.error('[DB] listHQMCSectionAssignments exception:', msg)
    return { data: [], error: msg }
  }
}

export async function upsertHQMCSectionAssignment(payload: { division_code: string; branch: string; reviewers?: string[]; approvers?: string[] }): Promise<DbMutationResult> {
  try {
    const sb = getSupabase()
    if (!sb?.from) return { ok: false, error: 'Supabase client not initialized' }
    const { division_code, branch, reviewers = [], approvers = [] } = payload
    const { error } = await sb.from('hqmc_section_assignments').upsert({ division_code, branch, reviewers, approvers }, { onConflict: 'division_code,branch' })
    if (error) {
      console.error('[DB] upsertHQMCSectionAssignment failed:', error.message)
      return { ok: false, error: error.message }
    }
    return { ok: true, error: null }
  } catch (e) {
    const msg = getErrorMessage(e)
    console.error('[DB] upsertHQMCSectionAssignment exception:', msg)
    return { ok: false, error: msg }
  }
}

// ============================================================================
// Legacy Compatibility Helpers
// These functions maintain backward compatibility with existing call sites
// while logging errors. Use the typed versions above for new code.
// ============================================================================

/** @deprecated Use listDocuments() and handle .data/.error */
export async function listDocumentsLegacy(): Promise<DocumentRecord[]> {
  const result = await listDocuments()
  return result.data
}

/** @deprecated Use listRequests() and handle .data/.error */
export async function listRequestsLegacy(): Promise<RequestRecord[]> {
  const result = await listRequests()
  return result.data
}

/** @deprecated Use listUsers() and handle .data/.error */
export async function listUsersLegacy(): Promise<UserRecord[]> {
  const result = await listUsers()
  return result.data
}

/** @deprecated Use getUserById() and handle .data/.error */
export async function getUserByIdLegacy(id: string): Promise<UserRecord | null> {
  const result = await getUserById(id)
  return result.data
}

/** @deprecated Use listInstallations() and handle .data/.error */
export async function listInstallationsLegacy(): Promise<Installation[]> {
  const result = await listInstallations()
  return result.data
}

/** @deprecated Use listCompaniesForUnit() and handle .data/.error */
export async function listCompaniesForUnitLegacy(unitUic: string): Promise<string[]> {
  const result = await listCompaniesForUnit(unitUic)
  return result.data
}

/** @deprecated Use listPlatoonsForCompany() and handle .data/.error */
export async function listPlatoonsForCompanyLegacy(unitUic: string, company: string): Promise<string[]> {
  const result = await listPlatoonsForCompany(unitUic, company)
  return result.data
}

/** @deprecated Use listHQMCStructure() and handle .data/.error */
export async function listHQMCStructureLegacy(): Promise<HQMCStructureRecord[]> {
  const result = await listHQMCStructure()
  return result.data
}

/** @deprecated Use listHQMCDivisions() and handle .data/.error */
export async function listHQMCDivisionsLegacy(): Promise<HQMCDivisionRecord[]> {
  const result = await listHQMCDivisions()
  return result.data
}

/** @deprecated Use listHQMCSectionAssignments() and handle .data/.error */
export async function listHQMCSectionAssignmentsLegacy(): Promise<HQMCSectionAssignmentRecord[]> {
  const result = await listHQMCSectionAssignments()
  return result.data
}
