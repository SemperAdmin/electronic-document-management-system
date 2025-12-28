import React, { useEffect, useMemo, useRef, useState } from 'react'
import { listRequestsLegacy, listDocumentsLegacy, listUsersLegacy, upsertRequest, listHQMCSectionAssignmentsLegacy } from '@/lib/db'
import { UserRecord } from '@/types'
import RequestTable from '../components/RequestTable'
import { Request } from '../types'
import { DocumentList } from '@/components/common'

interface DocumentItem {
  id: string
  name: string
  type: string
  size: number
  uploadedAt: string | Date
  subject: string
  requestId?: string
}

export default function HQMCApproverDashboard() {
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(() => {
    try { const raw = localStorage.getItem('currentUser'); return raw ? JSON.parse(raw) : null } catch { return null }
  })
  const [requests, setRequests] = useState<Request[]>([])
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [comments, setComments] = useState<Record<string, string>>({})
  const [users, setUsers] = useState<Record<string, any>>({})
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({})
  const [openDocsId, setOpenDocsId] = useState<string | null>(null)
  const docsRef = useRef<HTMLDivElement | null>(null)
  const [assignments, setAssignments] = useState<Array<{ division_code: string; branch: string; reviewers: string[]; approvers: string[] }>>([])
  const [activeTab, setActiveTab] = useState<'Pending' | 'Approved'>('Pending')

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (openDocsId && docsRef.current && !docsRef.current.contains(e.target as Node)) {
        setExpandedDocs(prev => ({ ...prev, [openDocsId]: false }))
        setOpenDocsId(null)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openDocsId) {
        setExpandedDocs(prev => ({ ...prev, [openDocsId]: false }))
        setOpenDocsId(null)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [openDocsId])

  useEffect(() => { listRequestsLegacy().then((remote) => setRequests(remote as any)).catch(() => setRequests([])) }, [])
  useEffect(() => { listDocumentsLegacy().then((remote) => setDocuments(remote as any)).catch(() => setDocuments([])) }, [])
  useEffect(() => {
    listUsersLegacy().then((remote) => {
      const map: Record<string, any> = {}
      for (const u of (remote as any)) if (u?.id) map[u.id] = u
      setUsers(map)
    }).catch(() => setUsers({}))
  }, [])
  useEffect(() => { listHQMCSectionAssignmentsLegacy().then(setAssignments).catch(() => setAssignments([])) }, [])

  const myId = currentUser?.id || ''
  const myDivision = String(currentUser?.hqmcDivision || '')
  const approverBranches = useMemo(() => {
    return assignments.filter(a => a.division_code === myDivision && (a.approvers || []).includes(myId)).map(a => a.branch)
  }, [assignments, myDivision, myId])

  const originatorFor = (r: Request) => users[r.uploadedById] || null

  const isInMyScope = (r: Request) => {
    if (!myDivision || !myId) return false
    const branch = String(r.routeSection || '')
    return approverBranches.includes(branch)
  }

  const inScope = useMemo(() => (Array.isArray(requests) ? requests : []).filter(isInMyScope), [requests, approverBranches])
  const pending = useMemo(() => inScope.filter(r => (r.currentStage || 'PLATOON_REVIEW') !== 'ARCHIVED'), [inScope])
  const approved = useMemo(() => inScope.filter(r => (r.currentStage || 'PLATOON_REVIEW') === 'ARCHIVED'), [inScope])

  const docsFor = (reqId: string) => documents.filter(d => d.requestId === reqId)

  const formatCsvCell = (v: any) => { const s = String(v ?? ''); const escaped = s.replace(/"/g, '""'); return `"${escaped}"` }
  const buildRows = (list: Request[]) => {
    const headers = ['Request ID','Subject','Stage','HQMC Section','Originator','Unit UIC','Created At','Documents']
    const rows = [headers]
    for (const r of list) {
      const o = originatorFor(r)
      const origin = o ? `${o.rank} ${o.lastName}, ${o.firstName}${o.mi ? ` ${o.mi}` : ''}` : ''
      const docs = docsFor(r.id).map(d => d.name).join(' | ')
      rows.push([r.id, r.subject, r.currentStage || '', r.routeSection || '', origin, r.unitUic || '', new Date(r.createdAt).toLocaleString(), docs])
    }
    return rows.map(row => row.map(formatCsvCell).join(',')).join('\r\n')
  }
  const downloadCsv = (filename: string, csv: string) => { const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url) }
  const exportPending = () => downloadCsv('hqmc_approver_pending.csv', buildRows(pending))
  const exportApproved = () => downloadCsv('hqmc_approver_approved.csv', buildRows(approved))
  const exportAll = () => downloadCsv('hqmc_approver_all.csv', buildRows([...pending, ...approved]))

  const approveRequest = async (r: Request) => {
    const actor = currentUser ? `${currentUser.rank || ''} ${currentUser.lastName || ''}, ${currentUser.firstName || ''}`.trim() : 'HQMC Approver'
    const entry = { actor, timestamp: new Date().toISOString(), action: 'HQMC Approver Approved', comment: (comments[r.id] || '').trim() }
    const updated: Request = { ...r, currentStage: 'ARCHIVED', activity: Array.isArray(r.activity) ? [...r.activity, entry] : [entry] }
    try { await upsertRequest(updated as any) } catch {}
    setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
    setComments(prev => ({ ...prev, [r.id]: '' }))
  }
  const returnRequest = async (r: Request) => {
    const actor = currentUser ? `${currentUser.rank || ''} ${currentUser.lastName || ''}, ${currentUser.firstName || ''}`.trim() : 'HQMC Approver'
    const entry = { actor, timestamp: new Date().toISOString(), action: 'Returned by HQMC Approver to Installation', comment: (comments[r.id] || '').trim() }
    // Return to Installation level (where HQMC requests originate from)
    const updated: Request = { ...r, currentStage: 'INSTALLATION_REVIEW', activity: Array.isArray(r.activity) ? [...r.activity, entry] : [entry] }
    try { await upsertRequest(updated as any) } catch {}
    setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
    setComments(prev => ({ ...prev, [r.id]: '' }))
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-[var(--surface)] rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text)]">HQMC Approver Dashboard</h2>
            <div className="mt-2 flex items-center gap-2">
              <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">{String(currentUser?.hqmcDivision || '') || 'N/A'}</span>
              <button className="px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2 hidden md:block" onClick={exportAll}>Export All</button>
            </div>
          </div>
        </div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button onClick={() => setActiveTab('Pending')} className={`${activeTab === 'Pending' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Pending</button>
            <button onClick={() => setActiveTab('Approved')} className={`${activeTab === 'Approved' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Approved</button>
          </nav>
        </div>
        <div className="mt-4">
          {activeTab === 'Pending' && (
            <RequestTable
              title="Pending"
              titleActions={(<button className="px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2 hidden md:block" onClick={exportPending}>Export Pending</button>)}
              requests={pending}
              users={users}
              onRowClick={(r) => setExpandedLogs(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
              expandedRows={expandedLogs}
            >
              {(r: Request) => (
                <div id={`details-hqa-${r.id}`}>
                  <div className="mt-3">
                    <button className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2" aria-expanded={!!expandedDocs[r.id]} aria-controls={`docs-hqa-${r.id}`} onClick={() => { setExpandedDocs(prev => ({ ...prev, [r.id]: !prev[r.id] })); setOpenDocsId(prev => (!expandedDocs[r.id] ? r.id : null)) }}>
                      <span>Show Documents</span>
                      <svg width="10" height="10" viewBox="0 0 20 20" className={`transition-transform ${expandedDocs[r.id] ? 'rotate-180' : 'rotate-0'}`} aria-hidden="true"><path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
                    </button>
                  </div>
                  <div id={`docs-hqa-${r.id}`} ref={expandedDocs[r.id] ? docsRef : undefined} className={`${expandedDocs[r.id] ? 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-[50vh] opacity-100' : 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-0 opacity-0'}`}>
                    <DocumentList documents={docsFor(r.id).map(d => ({ ...d, fileUrl: (d as any).fileUrl }))} />
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-[var(--text)] mb-1">HQMC Comment</label>
                    <textarea rows={2} value={comments[r.id] || ''} onChange={(e) => setComments(prev => ({ ...prev, [r.id]: e.target.value }))} className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg" placeholder="Optional notes" />
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button className="px-3 py-2 rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2" onClick={() => approveRequest(r)}>Approve</button>
                    <button className="px-3 py-2 rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2" onClick={() => returnRequest(r)}>Return</button>
                  </div>
                </div>
              )}
            </RequestTable>
          )}
          {activeTab === 'Approved' && (
            <RequestTable
              title="Approved"
              titleActions={(<button className="px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2 hidden md:block" onClick={exportApproved}>Export Approved</button>)}
              requests={approved}
              users={users}
              onRowClick={(r) => setExpandedLogs(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
              expandedRows={expandedLogs}
            >
              {(r: Request) => (
                <div id={`details-hqa-${r.id}`}>
                  <div className="mt-3">
                    <button className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2" aria-expanded={!!expandedDocs[r.id]} aria-controls={`docs-hqa-${r.id}`} onClick={() => { setExpandedDocs(prev => ({ ...prev, [r.id]: !prev[r.id] })); setOpenDocsId(prev => (!expandedDocs[r.id] ? r.id : null)) }}>
                      <span>Show Documents</span>
                      <svg width="10" height="10" viewBox="0 0 20 20" className={`transition-transform ${expandedDocs[r.id] ? 'rotate-180' : 'rotate-0'}`} aria-hidden="true"><path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
                    </button>
                  </div>
                  <div id={`docs-hqa-${r.id}`} ref={expandedDocs[r.id] ? docsRef : undefined} className={`${expandedDocs[r.id] ? 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-[50vh] opacity-100' : 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-0 opacity-0'}`}>
                    <DocumentList documents={docsFor(r.id).map(d => ({ ...d, fileUrl: (d as any).fileUrl }))} />
                  </div>
                </div>
              )}
            </RequestTable>
          )}
        </div>
      </div>
    </div>
  )
}

