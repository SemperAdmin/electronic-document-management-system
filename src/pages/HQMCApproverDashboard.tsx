import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
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
  const [expandedActivityLogs, setExpandedActivityLogs] = useState<Record<string, boolean>>({})
  const [openDocsId, setOpenDocsId] = useState<string | null>(null)
  const docsRef = useRef<HTMLDivElement | null>(null)
  const [assignments, setAssignments] = useState<Array<{ division_code: string; branch: string; reviewers: string[]; approvers: string[] }>>([])
  const [activeTab, setActiveTab] = useState<'Pending' | 'Approved' | 'Files'>('Pending')
  const [filesSearchQuery, setFilesSearchQuery] = useState<string>('')
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({})
  const [expandedBuckets, setExpandedBuckets] = useState<Record<string, boolean>>({})

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

  // Check if request was approved by HQMC Approver
  const isApproverApproved = (r: Request) => {
    return (r.activity || []).some(a => /HQMC Approver Approved/i.test(String(a.action || '')))
  }

  const inScope = useMemo(() => (Array.isArray(requests) ? requests : []).filter(isInMyScope), [requests, approverBranches])
  // Pending: at HQMC_REVIEW and NOT yet approved by HQMC Approver
  const pending = useMemo(() => inScope.filter(r => (r.currentStage || 'PLATOON_REVIEW') === 'HQMC_REVIEW' && !isApproverApproved(r)), [inScope])
  // Approved: has been approved by HQMC Approver (history view - includes those still at HQMC_REVIEW awaiting section action, and archived)
  const approved = useMemo(() => inScope.filter(r => isApproverApproved(r)), [inScope])

  // Get disposal year from request
  const getDisposalYear = useCallback((request: Request): string => {
    if (request.isPermanent) return 'Permanent';
    if (!request.retentionValue || !request.cutoffTrigger || !request.filedAt) return 'Unknown';

    const finalizedDate = new Date(request.filedAt);
    let cutoffDate: Date;

    switch (request.cutoffTrigger) {
      case 'CALENDAR_YEAR':
        cutoffDate = new Date(finalizedDate.getFullYear(), 11, 31);
        break;
      case 'FISCAL_YEAR':
        cutoffDate = finalizedDate.getMonth() >= 9
          ? new Date(finalizedDate.getFullYear() + 1, 8, 30)
          : new Date(finalizedDate.getFullYear(), 8, 30);
        break;
      default:
        cutoffDate = finalizedDate;
    }

    const disposalDate = new Date(cutoffDate);
    const unit = (request.retentionUnit || '').toLowerCase();
    if (unit === 'years') disposalDate.setFullYear(disposalDate.getFullYear() + request.retentionValue);
    else if (unit === 'months') disposalDate.setMonth(disposalDate.getMonth() + request.retentionValue);
    else if (unit === 'days') disposalDate.setDate(disposalDate.getDate() + request.retentionValue);

    return disposalDate.getFullYear().toString();
  }, []);

  // Calculate disposal date for display
  const calculateDisposalDate = useCallback((request: Request): string => {
    if (!request.retentionValue || !request.cutoffTrigger || !request.filedAt) return 'N/A';
    if (request.isPermanent) return 'Permanent';

    const finalizedDate = new Date(request.filedAt);
    let cutoffDate: Date;

    switch (request.cutoffTrigger) {
      case 'CALENDAR_YEAR':
        cutoffDate = new Date(finalizedDate.getFullYear(), 11, 31);
        break;
      case 'FISCAL_YEAR':
        cutoffDate = finalizedDate.getMonth() >= 9
          ? new Date(finalizedDate.getFullYear() + 1, 8, 30)
          : new Date(finalizedDate.getFullYear(), 8, 30);
        break;
      default:
        cutoffDate = finalizedDate;
    }

    const disposalDate = new Date(cutoffDate);
    const unit = (request.retentionUnit || '').toLowerCase();
    if (unit === 'years') disposalDate.setFullYear(disposalDate.getFullYear() + request.retentionValue);
    else if (unit === 'months') disposalDate.setMonth(disposalDate.getMonth() + request.retentionValue);
    else if (unit === 'days') disposalDate.setDate(disposalDate.getDate() + request.retentionValue);

    return disposalDate.toLocaleDateString();
  }, []);

  // Filed records grouped by disposal year then bucket (filter by HQMC division)
  type GroupedRecords = Record<string, Record<string, Request[]>>;

  const groupedFiledRecords = useMemo<GroupedRecords>(() => {
    let records = requests.filter(r => {
      if (!r.filedAt) return false
      // Filter by HQMC sections the user is an approver for
      if (approverBranches.length > 0) {
        const inMyBranches = approverBranches.some(branch =>
          String(r.routeSection || '').toUpperCase() === branch.toUpperCase()
        )
        if (!inMyBranches) return false
      }
      return true
    })

    if (filesSearchQuery.trim()) {
      const query = filesSearchQuery.toLowerCase().trim()
      records = records.filter(r =>
        r.subject?.toLowerCase().includes(query) ||
        r.ssic?.toLowerCase().includes(query) ||
        r.ssicNomenclature?.toLowerCase().includes(query) ||
        r.ssicBucketTitle?.toLowerCase().includes(query)
      )
    }

    const grouped: GroupedRecords = {};
    for (const record of records) {
      const year = getDisposalYear(record);
      const bucket = record.ssicBucketTitle || record.ssicBucket || 'Uncategorized';
      if (!grouped[year]) grouped[year] = {};
      if (!grouped[year][bucket]) grouped[year][bucket] = [];
      grouped[year][bucket].push(record);
    }

    for (const year of Object.keys(grouped)) {
      for (const bucket of Object.keys(grouped[year])) {
        grouped[year][bucket].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    }

    return grouped;
  }, [requests, approverBranches, filesSearchQuery, getDisposalYear])

  const sortedYearKeys = useMemo(() => {
    return Object.keys(groupedFiledRecords).sort((a, b) => {
      if (a === 'Permanent') return 1;
      if (b === 'Permanent') return -1;
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return parseInt(a) - parseInt(b);
    });
  }, [groupedFiledRecords]);

  const filedRecordCount = useMemo(() => {
    return Object.values(groupedFiledRecords).reduce((total, buckets) =>
      total + Object.values(buckets).reduce((sum, arr) => sum + arr.length, 0), 0
    );
  }, [groupedFiledRecords]);

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
    const entry = { actor, timestamp: new Date().toISOString(), action: 'HQMC Approver Approved - Pending HQMC Section Action', comment: (comments[r.id] || '').trim() }
    // Stay at HQMC_REVIEW so HQMC Section can take further action (return or reassign)
    const updated: Request = { ...r, currentStage: 'HQMC_REVIEW', activity: Array.isArray(r.activity) ? [...r.activity, entry] : [entry] }
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
            <button onClick={() => setActiveTab('Files')} className={`${activeTab === 'Files' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Files ({filedRecordCount})</button>
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
                    <button
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
                      aria-expanded={!!expandedActivityLogs[r.id]}
                      aria-controls={`logs-hqa-${r.id}`}
                      onClick={() => setExpandedActivityLogs(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                    >
                      {expandedActivityLogs[r.id] ? 'Hide' : 'Show'} Activity Log
                    </button>
                    <div id={`logs-hqa-${r.id}`} className={expandedActivityLogs[r.id] ? 'mt-2 space-y-2' : 'hidden'}>
                      {r.activity && r.activity.length ? (
                        r.activity.map((a, idx) => (
                          <div key={idx} className="text-xs text-gray-700">
                            <div className="font-medium">{a.actor} • {new Date(a.timestamp).toLocaleString()} • {a.action}</div>
                            {a.comment && <div className="text-gray-600">{a.comment}</div>}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-gray-500">No activity</div>
                      )}
                    </div>
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
                  <div className="mt-3">
                    <button
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
                      aria-expanded={!!expandedActivityLogs[r.id]}
                      aria-controls={`logs-hqaa-${r.id}`}
                      onClick={() => setExpandedActivityLogs(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                    >
                      {expandedActivityLogs[r.id] ? 'Hide' : 'Show'} Activity Log
                    </button>
                    <div id={`logs-hqaa-${r.id}`} className={expandedActivityLogs[r.id] ? 'mt-2 space-y-2' : 'hidden'}>
                      {r.activity && r.activity.length ? (
                        r.activity.map((a, idx) => (
                          <div key={idx} className="text-xs text-gray-700">
                            <div className="font-medium">{a.actor} • {new Date(a.timestamp).toLocaleString()} • {a.action}</div>
                            {a.comment && <div className="text-gray-600">{a.comment}</div>}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-gray-500">No activity</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </RequestTable>
          )}
          {activeTab === 'Files' && (
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search files by subject, SSIC, category..."
                  value={filesSearchQuery}
                  onChange={(e) => setFilesSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {filesSearchQuery && (
                  <button onClick={() => setFilesSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {sortedYearKeys.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {filesSearchQuery ? 'No records match your search.' : 'No filed records.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedYearKeys.map((year) => {
                    const buckets = groupedFiledRecords[year];
                    const sortedBuckets = Object.keys(buckets).sort();
                    const isPermanentYear = year === 'Permanent';
                    const recordCount = Object.values(buckets).reduce((sum, arr) => sum + arr.length, 0);
                    const isYearExpanded = expandedYears[year] || false;

                    return (
                      <div key={year} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }))}
                          className={`w-full ${isPermanentYear ? 'bg-blue-800 hover:bg-blue-700' : 'bg-brand-navy hover:bg-brand-navy/90'} text-brand-cream px-4 py-3 font-medium flex items-center justify-between transition-colors`}
                        >
                          <div className="flex items-center gap-2">
                            <svg className={`w-4 h-4 transition-transform flex-shrink-0 ${isYearExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="truncate">{isPermanentYear ? 'Permanent Records' : `Disposal Year: ${year}`}</span>
                          </div>
                          <span className="text-xs bg-white/20 px-2 py-0.5 rounded flex-shrink-0 ml-2">
                            {recordCount} record{recordCount !== 1 ? 's' : ''}
                          </span>
                        </button>

                        {isYearExpanded && (
                          <div className="bg-gray-50 p-2 space-y-2">
                            {sortedBuckets.map((bucket) => {
                              const records = buckets[bucket];
                              const bucketKey = `${year}-${bucket}`;
                              const isBucketExpanded = expandedBuckets[bucketKey] || false;

                              return (
                                <div key={bucketKey} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                                  <button
                                    onClick={() => setExpandedBuckets(prev => ({ ...prev, [bucketKey]: !prev[bucketKey] }))}
                                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 font-medium text-sm flex items-center justify-between transition-colors"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <svg className={`w-3 h-3 transition-transform flex-shrink-0 ${isBucketExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                      <span className="truncate">{bucket}</span>
                                    </div>
                                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{records.length} item{records.length !== 1 ? 's' : ''}</span>
                                  </button>

                                  {isBucketExpanded && (
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-50">
                                          <tr>
                                            <th className="px-2 sm:px-3 py-2 text-left font-medium text-gray-500 text-xs sm:text-sm">Name</th>
                                            <th className="px-2 sm:px-3 py-2 text-left font-medium text-gray-500 text-xs sm:text-sm">SSIC</th>
                                            <th className="px-2 sm:px-3 py-2 text-left font-medium text-gray-500 text-xs sm:text-sm">Retention</th>
                                            <th className="px-2 sm:px-3 py-2 text-left font-medium text-gray-500 text-xs sm:text-sm hidden sm:table-cell">Disposal Date</th>
                                          </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                          {records.map((r) => (
                                            <tr key={r.id} className="hover:bg-gray-50">
                                              <td className="px-2 sm:px-3 py-2 font-medium text-brand-navy text-xs sm:text-sm max-w-[120px] sm:max-w-none truncate">{r.subject}</td>
                                              <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm">{r.ssic}</td>
                                              <td className="px-2 sm:px-3 py-2">
                                                {r.isPermanent ? (
                                                  <span className="inline-flex px-1.5 sm:px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded whitespace-nowrap">Perm</span>
                                                ) : (
                                                  <span className="inline-flex px-1.5 sm:px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded whitespace-nowrap">
                                                    {r.retentionValue} {(r.retentionUnit || '').replace('S', '')}
                                                  </span>
                                                )}
                                              </td>
                                              <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm hidden sm:table-cell">{calculateDisposalDate(r)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

