import { getSupabase } from './supabase'

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
  unitUic: string
  uploadedById: string
  submitForUserId?: string
  documentIds: string[]
  createdAt: string
  currentStage?: string
  activity?: Array<{ actor: string; timestamp: string; action: string; comment?: string }>
}

export type UserRecord = {
  id: string
  email?: string
  rank?: string
  firstName?: string
  lastName?: string
  mi?: string
  service?: string
  role?: string
  unitUic?: string
  unit?: string
  company?: string
  isUnitAdmin?: boolean
  isCommandStaff?: boolean
  isAppAdmin?: boolean
  edipi?: string | number
  passwordHash?: string
  platoon?: string
  roleCompany?: string
  rolePlatoon?: string
}

function toDocRow(d: DocumentRecord) {
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

function fromDocRow(r: any): DocumentRecord {
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

function toReqRow(r: RequestRecord) {
  return {
    id: r.id,
    subject: r.subject,
    due_date: r.dueDate ?? null,
    notes: r.notes ?? null,
    unit_uic: r.unitUic,
    uploaded_by_id: r.uploadedById,
    submit_for_user_id: r.submitForUserId ?? null,
    document_ids: r.documentIds ?? [],
    created_at: r.createdAt ?? new Date().toISOString(),
    current_stage: r.currentStage ?? null,
    activity: r.activity ?? [],
  }
}

function fromReqRow(r: any): RequestRecord {
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
  }
}

function toUserRow(u: UserRecord) {
  return {
    id: u.id,
    email: u.email !== undefined ? u.email : undefined,
    rank: u.rank !== undefined ? u.rank : undefined,
    first_name: u.firstName !== undefined ? u.firstName : undefined,
    last_name: u.lastName !== undefined ? u.lastName : undefined,
    mi: u.mi !== undefined ? u.mi : undefined,
    service: u.service !== undefined ? u.service : undefined,
    role: u.role !== undefined ? u.role : undefined,
    unit_uic: u.unitUic !== undefined ? u.unitUic : undefined,
    unit: u.unit !== undefined ? u.unit : undefined,
    user_company: u.company !== undefined ? u.company : undefined,
    is_unit_admin: u.isUnitAdmin === undefined ? undefined : !!u.isUnitAdmin,
    is_command_staff: u.isCommandStaff === undefined ? undefined : !!u.isCommandStaff,
    is_app_admin: u.isAppAdmin === undefined ? undefined : !!u.isAppAdmin,
    edipi: u.edipi !== undefined && u.edipi != null ? String(u.edipi) : undefined,
    password_hash: u.passwordHash !== undefined ? u.passwordHash : undefined,
    user_platoon: u.platoon !== undefined ? u.platoon : undefined,
    role_company: u.roleCompany !== undefined ? u.roleCompany : undefined,
    role_platoon: u.rolePlatoon !== undefined ? u.rolePlatoon : undefined,
  }
}

function fromUserRow(r: any): UserRecord {
  return {
    id: String(r.id),
    email: r.email ? String(r.email) : undefined,
    rank: r.rank ? String(r.rank) : undefined,
    firstName: r.first_name ? String(r.first_name) : undefined,
    lastName: r.last_name ? String(r.last_name) : undefined,
    mi: r.mi ? String(r.mi) : undefined,
    service: r.service ? String(r.service) : undefined,
    role: r.role ? String(r.role) : undefined,
    unitUic: r.unit_uic ? String(r.unit_uic) : undefined,
    unit: r.unit ? String(r.unit) : undefined,
    company: (r.company ? String(r.company) : (r.user_company ? String(r.user_company) : undefined)),
    isUnitAdmin: !!r.is_unit_admin,
    isCommandStaff: !!r.is_command_staff,
    isAppAdmin: !!r.is_app_admin,
    edipi: r.edipi ? String(r.edipi) : undefined,
    passwordHash: r.password_hash ? String(r.password_hash) : undefined,
    platoon: r.user_platoon ? String(r.user_platoon) : undefined,
    roleCompany: r.role_company ? String(r.role_company) : undefined,
    rolePlatoon: r.role_platoon ? String(r.role_platoon) : undefined,
  }
}

export async function listDocuments(): Promise<DocumentRecord[]> {
  try {
    const sb = getSupabase()
    if (!sb?.from) return []
    const { data, error } = await sb.from('edms_documents').select('*').order('uploaded_at', { ascending: false })
    if (error) return []
    return (data ?? []).map(fromDocRow)
  } catch { return [] }
}

export async function upsertDocuments(docs: DocumentRecord[]): Promise<{ ok: boolean; error?: any }> {
  try {
    if (!docs.length) return { ok: true }
    const sb = getSupabase()
    if (!sb?.from) return { ok: false, error: 'supabase_not_initialized' }
    const { error } = await sb.from('edms_documents').upsert(docs.map(toDocRow))
    if (error) return { ok: false, error }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e }
  }
}

export async function listRequests(): Promise<RequestRecord[]> {
  try {
    const sb = getSupabase()
    if (!sb?.from) return []
    const { data, error } = await sb.from('edms_requests').select('*').order('created_at', { ascending: false })
    if (error) return []
    return (data ?? []).map(fromReqRow)
  } catch { return [] }
}

export async function upsertRequest(r: RequestRecord): Promise<void> {
  try {
    const sb = getSupabase()
    if (!sb?.from) return
    await sb.from('edms_requests').upsert(toReqRow(r))
  } catch {}
}

export async function listUsers(): Promise<UserRecord[]> {
  try {
    const sb = getSupabase()
    if (!sb?.from) return []
    const { data, error } = await sb.from('edms_users').select('*')
    if (error) return []
    return (data ?? []).map(fromUserRow)
  } catch { return [] }
}

export async function upsertUser(u: UserRecord): Promise<{ ok: boolean; error?: any }> {
  try {
    const sb = getSupabase()
    if (!sb?.from) return { ok: false, error: 'supabase_not_initialized' }
    const { error } = await sb.from('edms_users').upsert(toUserRow(u))
    if (error) return { ok: false, error }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e }
  }
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  try {
    const sb = getSupabase()
    if (!sb?.from) return null
    const { data, error } = await sb.from('edms_users').select('*').eq('id', id).limit(1)
    if (error) return null
    const row = (data ?? [])[0]
    return row ? fromUserRow(row) : null
  } catch {
    return null
  }
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  try {
    const sb = getSupabase()
    if (!sb?.from) {
      console.error('[DB] getUserByEmail failed: Supabase client not initialized', { email })
      return null
    }
    const { data, error } = await sb.from('edms_users').select('*').eq('email', email).limit(1)
    if (error) {
      console.error('[DB] getUserByEmail query failed:', { email, error: error.message })
      return null
    }
    const row = (data ?? [])[0]
    return row ? fromUserRow(row) : null
  } catch (e) {
    console.error('[DB] getUserByEmail exception:', { email, error: e })
    return null
  }
}

export async function getUserByEdipi(edipi: string): Promise<UserRecord | null> {
  try {
    const sb = getSupabase()
    if (!sb?.from) {
      console.error('[DB] getUserByEdipi failed: Supabase client not initialized', { edipi })
      return null
    }
    const { data, error } = await sb.from('edms_users').select('*').eq('edipi', edipi).limit(1)
    if (error) {
      console.error('[DB] getUserByEdipi query failed:', { edipi, error: error.message })
      return null
    }
    const row = (data ?? [])[0]
    return row ? fromUserRow(row) : null
  } catch (e) {
    console.error('[DB] getUserByEdipi exception:', { edipi, error: e })
    return null
  }
}

export async function listCompaniesForUnit(unitUic: string): Promise<string[]> {
  try {
    const uic = String(unitUic || '')
    if (!uic) return []
    const sb = getSupabase()
    if (!sb?.from) return []
    const { data, error } = await sb
      .from('edms_users')
      .select('company, user_company, unit_uic')
      .eq('unit_uic', uic)
      .or('company.neq.N/A,user_company.neq.N/A')
    if (error) return []
    const rows: any[] = Array.isArray(data) ? (data as any[]) : []
    const vals: string[] = rows
      .map((r: any) => String((r.company || r.user_company || '')).trim())
      .filter((v: string) => !!v)
    const uniq: string[] = Array.from(new Set<string>(vals))
    return uniq.sort((a: string, b: string) => a.localeCompare(b))
  } catch {
    return []
  }
}

export async function listPlatoonsForCompany(unitUic: string, company: string): Promise<string[]> {
  try {
    const uic = String(unitUic || '')
    const comp = String(company || '')
    if (!uic || !comp) return []
    const sb = getSupabase()
    if (!sb?.from) return []
    const { data, error } = await sb
      .from('edms_users')
      .select('user_platoon, unit_uic, company, user_company')
      .eq('unit_uic', uic)
      .or(`company.eq.${comp},user_company.eq.${comp}`)
      .neq('user_platoon', 'N/A')
    if (error) return []
    const rows: any[] = Array.isArray(data) ? (data as any[]) : []
    const vals: string[] = rows
      .map((r: any) => String(r.user_platoon || '').trim())
      .filter((v: string) => !!v)
    const uniq: string[] = Array.from(new Set<string>(vals))
    return uniq.sort((a: string, b: string) => a.localeCompare(b))
  } catch {
    return []
  }
}
