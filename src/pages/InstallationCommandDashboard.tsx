import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { listInstallationsLegacy, listRequestsLegacy, listUsersLegacy, listDocumentsLegacy, upsertDocuments, upsertRequest } from '@/lib/db'
import type { DocumentRecord } from '@/lib/db'
import RequestTable from '@/components/RequestTable'
import { Request } from '@/types'
import { DocumentList, DocumentPreview, useToast } from '@/components/common'
import { formatActorName } from '@/lib/utils'

export default function InstallationCommandDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [expandedCard, setExpandedCard] = useState<Record<string, boolean>>({})
  const [install, setInstall] = useState<any | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'Pending' | 'Previously in Command Section' | 'Files'>('Pending')
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [filesSearchQuery, setFilesSearchQuery] = useState<string>('')
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({})
  const [expandedBuckets, setExpandedBuckets] = useState<Record<string, boolean>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [attach, setAttach] = useState<Record<string, File[]>>({})
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({})
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})
  const [openDocsId, setOpenDocsId] = useState<string | null>(null)
  const docsRef = React.useRef<HTMLDivElement>(null)
  const [selectedCmdCommander, setSelectedCmdCommander] = useState<Record<string, string>>({})
  const [nextInstSection, setNextInstSection] = useState<Record<string, string>>({})
  const [reassignCmdSection, setReassignCmdSection] = useState<Record<string, string>>({})
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null)
  const toast = useToast()

  useEffect(() => {
    try {
      const raw = localStorage.getItem('currentUser')
      if (raw) setCurrentUser(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    listRequestsLegacy().then((rs) => setRequests(rs as any)).catch(() => setRequests([]))
    listDocumentsLegacy().then((ds) => setDocuments(ds as any)).catch(() => setDocuments([]))
  }, [])

  useEffect(() => {
    if (!currentUser?.installationId) return
    listInstallationsLegacy().then((all) => {
      const target = (all as any[]).find(i => i.id === currentUser.installationId)
      setInstall(target || null)
    }).catch(() => setInstall(null))
    listUsersLegacy().then((u) => setUsers(u as any)).catch(() => setUsers([]))
  }, [currentUser])


  const usersById = useMemo(() => {
    const map: Record<string, any> = {}
    for (const u of users) map[u.id] = u
    return map
  }, [users])

  const docsFor = (requestId: string) => documents.filter(d => String(d.requestId || '') === String(requestId))

  const originatorFor = (r: Request) => usersById[r.uploadedById]
  const formatCsvCell = (v: any) => {
    const s = String(v ?? '')
    const escaped = s.replace(/"/g, '""')
    return `"${escaped}"`
  }
  const buildRows = (list: Request[]) => {
    const headers = ['Request ID','Subject','Stage','Route Section','Originator','Unit UIC','Created At','Documents']
    const rows = [headers]
    for (const r of list) {
      const o = originatorFor(r)
      const origin = o ? `${o.rank || ''} ${o.lastName || ''}, ${o.firstName || ''}${o.mi ? ` ${o.mi}` : ''}`.trim() : ''
      const docs = docsFor(r.id).map(d => d.name).join(' | ')
      rows.push([
        r.id,
        r.subject,
        r.currentStage || '',
        r.routeSection || '',
        origin,
        r.unitUic || '',
        new Date(r.createdAt).toLocaleString(),
        docs
      ])
    }
    return rows.map(row => row.map(formatCsvCell).join(',')).join('\r\n')
  }
  const downloadCsv = (filename: string, csv: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  const exportCommander = () => downloadCsv('installation_commander.csv', buildRows(inInstallationCommander))
  const exportSection = (name: string) => downloadCsv(`installation_${name}.csv`, buildRows(requestsBySection[name] || []))
  const exportAll = () => downloadCsv('installation_command_all.csv', buildRows([...inInstallationCommander, ...cmdSections.flatMap(n => requestsBySection[n] || [])]))

  const addFilesToRequest = async (r: Request) => {
    const files = attach[r.id] || []
    if (!files.length) return
    const uid = currentUser?.id || ''
    const uic = r.unitUic || ''
    const newDocs: DocumentRecord[] = files.map((f) => ({
      id: `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: f.name,
      type: f.type || 'application/octet-stream',
      size: f.size,
      uploadedAt: new Date(),
      category: 'ATTACHMENT',
      tags: [],
      unitUic: uic,
      subject: r.subject,
      notes: comments[r.id] || undefined,
      uploadedById: uid,
      currentStage: r.currentStage,
      requestId: r.id,
      fileUrl: undefined,
    }))
    const { ok } = await upsertDocuments(newDocs)
    if (ok) {
      setDocuments(prev => [...newDocs, ...prev])
      setAttach(prev => ({ ...prev, [r.id]: [] }))
    } else {
      toast.error('Failed to save files')
    }
  }

  const sendToInstallationCommander = async (r: Request) => {
    const actor = formatActorName(currentUser, 'Installation Command Section')
    const prevSec = r.routeSection || ''
    const entry = { actor, timestamp: new Date().toISOString(), action: 'Sent to Installation Commander', comment: (comments[r.id] || '').trim(), fromSection: prevSec || undefined, toSection: 'Commander' }
    const updated: Request = { ...r, routeSection: '', activity: [...(r.activity || []), entry] }
    try {
      await upsertRequest(updated)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
      setComments(prev => ({ ...prev, [r.id]: '' }))
    } catch (e) {
      console.error('Failed to send to installation commander:', e)
      toast.error('Failed to send to installation commander')
    }
  }

  const returnToInstallationSection = async (r: Request) => {
    const actor = formatActorName(currentUser, 'Installation Command Section')
    // Try to extract previous section from activity entry
    const lastRoute = (r.activity || []).slice().reverse().find(a => /Routed to installation command section/i.test(String(a.action || '')))
    let prevSec = ''
    if (lastRoute) {
      const m = String(lastRoute.action || '').match(/\(from\s+(.+?)\)/i)
      if (m) prevSec = m[1]
    }
    const entry = { actor, timestamp: new Date().toISOString(), action: `Returned to installation section${prevSec ? `: ${prevSec}` : ''}`, comment: (comments[r.id] || '').trim(), fromSection: r.routeSection || undefined, toSection: prevSec || undefined }
    const updated: Request = { ...r, routeSection: prevSec, activity: [...(r.activity || []), entry] }
    try {
      await upsertRequest(updated)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
      setComments(prev => ({ ...prev, [r.id]: '' }))
    } catch (e) {
      console.error('Failed to return to installation section:', e)
      toast.error('Failed to return to installation section')
    }
  }

  const routeToInstallationSection = async (r: Request) => {
    const sec = nextInstSection[r.id] || ''
    if (!sec.trim()) return
    const actor = formatActorName(currentUser, 'Installation Commander')
    const entry = { actor, timestamp: new Date().toISOString(), action: `Sent to installation section: ${sec}`, comment: (comments[r.id] || '').trim(), fromSection: 'Commander', toSection: sec }
    const updated: Request = { ...r, currentStage: 'INSTALLATION_REVIEW', routeSection: sec, activity: [...(r.activity || []), entry] }
    try {
      await upsertRequest(updated)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
      setComments(prev => ({ ...prev, [r.id]: '' }))
      setNextInstSection(prev => ({ ...prev, [r.id]: '' }))
    } catch (e) {
      console.error('Failed to route to installation section:', e)
      toast.error('Failed to route to installation section')
    }
  }

  const routeToInstallationCommandFromCommander = async (r: Request) => {
    const sec = selectedCmdCommander[r.id] || ''
    if (!sec.trim()) return
    const actor = formatActorName(currentUser, 'Installation Commander')
    const entry = { actor, timestamp: new Date().toISOString(), action: `Sent to installation command section: ${sec}`, comment: (comments[r.id] || '').trim(), fromSection: 'Commander', toSection: sec }
    const updated: Request = { ...r, routeSection: sec, activity: [...(r.activity || []), entry] }
    try {
      await upsertRequest(updated)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
      setComments(prev => ({ ...prev, [r.id]: '' }))
      setSelectedCmdCommander(prev => ({ ...prev, [r.id]: '' }))
    } catch (e) {
      console.error('Failed to route to installation command section:', e)
      toast.error('Failed to route to installation command section')
    }
  }

  const installationCommanderDecision = async (r: Request, type: 'Approved' | 'Endorsed' | 'Rejected') => {
    const actor = formatActorName(currentUser, 'Installation Commander')
    const actionText = type === 'Approved' ? 'Approved by Installation Commander'
      : type === 'Endorsed' ? 'Endorsed by Installation Commander'
      : 'Rejected by Installation Commander — requires action'

    // Find the installation section that originally routed this request
    const prevInstSec = getPreviousInstallationSection(r)

    let updated: Request = { ...r }
    const decisionEntry = { actor, actorRole: 'Installation Commander', timestamp: new Date().toISOString(), action: actionText, comment: (comments[r.id] || '').trim(), fromSection: 'Commander', toSection: prevInstSec || undefined }

    if (type === 'Rejected') {
      // Return to the installation section that originally handled it
      updated = {
        ...r,
        currentStage: 'INSTALLATION_REVIEW',
        finalStatus: undefined,
        routeSection: prevInstSec,
        activity: [...(r.activity || []), decisionEntry, { actor, actorRole: 'Installation Commander', timestamp: new Date().toISOString(), action: prevInstSec ? `Returned to installation section: ${prevInstSec}` : 'Returned for review', fromSection: 'Commander', toSection: prevInstSec || undefined }]
      }
    } else if (type === 'Approved') {
      // Approved - route to the installation section for further action
      const sec = prevInstSec
      updated = {
        ...r,
        currentStage: 'INSTALLATION_REVIEW',
        routeSection: sec,
        activity: [...(r.activity || []), decisionEntry, { actor, actorRole: 'Installation Commander', timestamp: new Date().toISOString(), action: sec ? `Sent to installation section: ${sec}` : 'Sent for further routing', fromSection: 'Commander', toSection: sec || undefined }]
      }
    } else {
      // Endorsed - return to the installation section for further routing
      updated = {
        ...r,
        currentStage: 'INSTALLATION_REVIEW',
        routeSection: prevInstSec,
        activity: [...(r.activity || []), decisionEntry, { actor, actorRole: 'Installation Commander', timestamp: new Date().toISOString(), action: prevInstSec ? `Sent to installation section: ${prevInstSec}` : 'Sent for further routing', fromSection: 'Commander', toSection: prevInstSec || undefined }]
      }
    }

    try {
      await upsertRequest(updated)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
      setComments(prev => ({ ...prev, [r.id]: '' }))
      setSelectedCmdCommander(prev => ({ ...prev, [r.id]: '' }))
    } catch (e) {
      console.error('Failed to record installation commander decision:', e)
      toast.error('Failed to record decision')
    }
  }

  const reassignToCmdSection = async (r: Request) => {
    const sec = reassignCmdSection[r.id] || ''
    if (!sec.trim()) return
    const actor = formatActorName(currentUser, 'Installation Command Section')
    const prevSec = r.routeSection || ''
    const entry = { actor, actorRole: 'Installation Command Section', timestamp: new Date().toISOString(), action: `Reassigned to command section: ${sec}${prevSec ? ` (from ${prevSec})` : ''}`, comment: (comments[r.id] || '').trim(), fromSection: prevSec || undefined, toSection: sec }
    const updated: Request = { ...r, routeSection: sec, activity: [...(r.activity || []), entry] }
    try {
      await upsertRequest(updated)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
      setComments(prev => ({ ...prev, [r.id]: '' }))
      setReassignCmdSection(prev => ({ ...prev, [r.id]: '' }))
    } catch (e) {
      console.error('Failed to reassign to command section:', e)
      toast.error('Failed to reassign to command section')
    }
  }

  const cmdSections: string[] = useMemo(() => {
    return Array.isArray(install?.commandSections) ? install.commandSections : []
  }, [install])

  const iid = currentUser?.installationId || ''
  const requestsBySection = useMemo(() => {
    const map: Record<string, any[]> = {}
    const list = requests.filter(r => (r.currentStage === 'INSTALLATION_REVIEW') && r.installationId === iid)
    for (const s of cmdSections) map[s] = []
    for (const r of list) {
      const sec = String(r.routeSection || '')
      if (sec && map.hasOwnProperty(sec)) map[sec].push(r)
    }
    return map
  }, [requests, cmdSections, iid])

  const inInstallationCommander = useMemo(() => {
    return requests.filter(r => (r.currentStage === 'INSTALLATION_REVIEW') && r.installationId === iid && (!r.routeSection || r.routeSection === ''))
  }, [requests, iid])

  const previouslyInCmdSection = useMemo(() => {
    return requests.filter(r => r.installationId === iid && r.currentStage !== 'INSTALLATION_REVIEW')
  }, [requests, iid])

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

  // Filed records grouped by disposal year then bucket
  type GroupedRecords = Record<string, Record<string, Request[]>>;

  const groupedFiledRecords = useMemo<GroupedRecords>(() => {
    let records = requests.filter(r => {
      if (!r.filedAt) return false
      if (iid && r.installationId !== iid) return false
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
  }, [requests, iid, filesSearchQuery, getDisposalYear])

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
  }, [groupedFiledRecords])

  const getPreviousInstallSection = (r: Request) => {
    const acts = (r.activity || []).slice().reverse()
    for (const a of acts) {
      const s = String(a.action || '')
      const m = s.match(/Sent to installation section:\s*(.+)/i) || s.match(/Restored to installation section:\s*(.+)/i) || s.match(/Returned to installation section:\s*(.+)/i)
      if (m) return m[1].trim()
    }
    return ''
  }

  // Find the installation section that originally routed the request (before it went to command section)
  const getPreviousInstallationSection = (r: Request) => {
    const acts = (r.activity || []).slice().reverse()
    for (const a of acts) {
      const s = String(a.action || '')
      // Look for "Approved and routed to Installation Command: S-1 (from SSEC)" - extract SSEC
      const m1 = s.match(/Approved and routed to Installation Command:[^(]+\(from\s+([^)]+)\)/i)
      if (m1) return m1[1].trim()
      // Or "Reassigned to installation section: SSEC"
      const m2 = s.match(/Reassigned to installation section:\s*([^\(]+)/i)
      if (m2) return m2[1].trim()
      // Or "Sent to command section: S-1 (from SSEC)"
      const m3 = s.match(/Sent to command section:[^(]+\(from\s+([^)]+)\)/i)
      if (m3) return m3[1].trim()
    }
    // Fallback: look for any installation section routing pattern
    for (const a of acts) {
      const s = String(a.action || '')
      // "Routed to installation section: SSEC"
      const m1 = s.match(/Routed to installation section:\s*(.+)/i)
      if (m1) return m1[1].trim()
      // "Sent to installation section: SSEC"
      const m2 = s.match(/Sent to installation section:\s*(.+)/i)
      if (m2) return m2[1].trim()
      // "Restored to installation section: SSEC"
      const m3 = s.match(/Restored to installation section:\s*(.+)/i)
      if (m3) return m3[1].trim()
    }
    return ''
  }

  const restoreToInstallationSection = async (r: Request, sec?: string) => {
    const actor = formatActorName(currentUser, 'Installation Commander')
    const targetSec = (sec || '').trim() || getPreviousInstallSection(r)
    const entry = { actor, timestamp: new Date().toISOString(), action: `Restored to installation section${targetSec ? `: ${targetSec}` : ''}` }
    const updated: Request = {
      ...r,
      currentStage: 'INSTALLATION_REVIEW',
      finalStatus: undefined,
      routeSection: targetSec,
      activity: [...(r.activity || []), entry]
    }
    try {
      await upsertRequest(updated)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
    } catch (e) {
      console.error('Failed to restore to installation section:', e)
      toast.error('Failed to restore to installation section')
    }
  }


  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-[var(--surface)] rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--text)]">Installation Command Dashboard</h2>
          <div className="text-sm text-[var(--muted)]">{(install?.name || '')}</div>
        </div>
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('Pending')}
              className={`${activeTab === 'Pending' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >Pending</button>
            <button
              onClick={() => setActiveTab('Previously in Command Section')}
              className={`${activeTab === 'Previously in Command Section' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >Previously in Command Section</button>
            <button
              onClick={() => setActiveTab('Files')}
              className={`${activeTab === 'Files' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >Files ({filedRecordCount})</button>
          </nav>
        </div>
        {activeTab === 'Pending' && (
          <div className="space-y-8">
            <div>
              <RequestTable
                title="Pending in Commander"
                titleActions={(
                  <>
                    <button className="px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2 hidden md:block" onClick={exportCommander}>Export Commander</button>
                  </>
                )}
                requests={inInstallationCommander}
                users={usersById}
                variant="installation"
                onRowClick={(r) => setExpandedCard(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                expandedRows={expandedCard}
              >
                {(r: Request) => (
                  <div className="p-4 bg-gray-50 space-y-3">
                    <div className="mt-2">
                      <button
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
                        aria-expanded={!!expandedDocs[r.id]}
                        aria-controls={`docs-instcmd-comm-${r.id}`}
                        onClick={() => { setExpandedDocs(prev => ({ ...prev, [r.id]: !prev[r.id] })); setOpenDocsId(prev => (!expandedDocs[r.id] ? r.id : null)) }}
                      >
                        <span>Show Documents</span>
                      </button>
                    </div>
                    <div
                      id={`docs-instcmd-comm-${r.id}`}
                      ref={expandedDocs[r.id] ? docsRef : undefined}
                      className={`${expandedDocs[r.id] ? 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-[50vh] opacity-100' : 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-0 opacity-0'}`}
                    >
                      <DocumentList
                        documents={docsFor(r.id)}
                        showIcons
                        onPreview={(doc) => setPreviewDoc(docsFor(r.id).find(d => d.id === doc.id) || null)}
                      />
                    </div>
                    <div className="mt-2">
                      <button
                        className="px-3 py-1 text-xs rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                        onClick={() => setExpandedLogs(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                        aria-expanded={!!expandedLogs[r.id]}
                        aria-controls={`logs-instcmd-comm-${r.id}`}
                      >
                        {expandedLogs[r.id] ? 'Hide' : 'Show'} Activity Log
                      </button>
                      <div id={`logs-instcmd-comm-${r.id}`} className={expandedLogs[r.id] ? 'mt-2 space-y-2' : 'hidden'}>
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
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-[var(--text)] mb-1">Reviewer Comment</label>
                      <textarea
                        rows={2}
                        value={comments[r.id] || ''}
                        onChange={(e) => setComments(prev => ({ ...prev, [r.id]: e.target.value }))}
                        className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
                        placeholder="Optional notes"
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <label className="bg-brand-navy text-brand-cream px-3 py-1 rounded hover:bg-brand-red-2 cursor-pointer inline-block">
                        <input
                          type="file"
                          multiple
                          onChange={(e) => setAttach(prev => ({ ...prev, [r.id]: e.target.files ? Array.from(e.target.files) : [] }))}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                        />
                        Add Files
                      </label>
                      <span className="text-xs text-[var(--muted)]">{(attach[r.id] || []).length ? `${(attach[r.id] || []).length} file(s) selected` : 'No files selected'}</span>
                      <button
                        className="px-3 py-1 text-xs bg-brand-gold text-brand-charcoal rounded hover:bg-brand-gold-2"
                        onClick={() => addFilesToRequest(r)}
                        disabled={!attach[r.id] || !(attach[r.id] || []).length}
                      >
                        Save Files
                      </button>
                    </div>
                    <div className="mt-3">
                      
                    </div>
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-[var(--text)] mb-2">Final Decision</label>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="px-3 py-2 rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
                          onClick={() => installationCommanderDecision(r, 'Approved')}
                        >
                          Approved
                        </button>
                        <button
                          className="px-3 py-2 rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
                          onClick={() => installationCommanderDecision(r, 'Endorsed')}
                        >
                          Endorsed
                        </button>
                        <button
                          className="px-3 py-2 rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2"
                          onClick={() => installationCommanderDecision(r, 'Rejected')}
                        >
                          Rejected
                        </button>
                      </div>
                    </div>
                    
                  </div>
                )}
              </RequestTable>
            </div>
            {cmdSections.map((sec) => (
              <div key={sec}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-[var(--text)] flex items-center justify-between w-full">
                  {sec}
                  <span className="inline-flex items-center gap-2 align-middle">
                    <button className="px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2 hidden md:block" onClick={() => exportSection(sec)}>Export {sec}</button>
                  </span>
                </h3>
              </div>
                <RequestTable
                  title={`Pending in ${sec}`}
                  requests={requestsBySection[sec] || []}
                  users={usersById}
                  variant="installation"
                  onRowClick={(r) => setExpandedCard(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                  expandedRows={expandedCard}
                >
                  {(r: Request) => (
                    <div className="p-4 bg-gray-50 space-y-3">
                      <div className="mt-2">
                        <button
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
                          aria-expanded={!!expandedDocs[r.id]}
                          aria-controls={`docs-instcmd-${r.id}`}
                          onClick={() => { setExpandedDocs(prev => ({ ...prev, [r.id]: !prev[r.id] })); setOpenDocsId(prev => (!expandedDocs[r.id] ? r.id : null)) }}
                        >
                          <span>Show Documents</span>
                        </button>
                      </div>
                      <div
                        id={`docs-instcmd-${r.id}`}
                        ref={expandedDocs[r.id] ? docsRef : undefined}
                        className={`${expandedDocs[r.id] ? 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-[50vh] opacity-100' : 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-0 opacity-0'}`}
                      >
                        {docsFor(r.id).map(d => (
                          <div key={d.id} className="flex items-center justify-between p-3 border border-brand-navy/20 rounded-lg bg-[var(--surface)]">
                            <div className="text-sm text-[var(--muted)]">
                              <div className="font-medium text-[var(--text)]">{d.name}</div>
                              <div>{new Date(d.uploadedAt as any).toLocaleDateString()}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {d.fileUrl ? (
                                <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-xs bg-brand-cream text-brand-navy rounded hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold">Open</a>
                              ) : (
                                <span className="px-3 py-1 text-xs bg-brand-cream text-brand-navy rounded opacity-60" aria-disabled="true">Open</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {docsFor(r.id).length === 0 && (
                          <div className="text-sm text-[var(--muted)]">No documents</div>
                        )}
                      </div>
                      <div className="mt-2">
                        <button
                          className="px-3 py-1 text-xs rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                          onClick={() => setExpandedLogs(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                          aria-expanded={!!expandedLogs[r.id]}
                          aria-controls={`logs-instcmd-${r.id}`}
                        >
                          {expandedLogs[r.id] ? 'Hide' : 'Show'} Activity Log
                        </button>
                        <div id={`logs-instcmd-${r.id}`} className={expandedLogs[r.id] ? 'mt-2 space-y-2' : 'hidden'}>
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
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-[var(--text)] mb-1">Reviewer Comment</label>
                        <textarea
                          rows={2}
                          value={comments[r.id] || ''}
                          onChange={(e) => setComments(prev => ({ ...prev, [r.id]: e.target.value }))}
                          className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
                          placeholder="Optional notes"
                        />
                      </div>
                      {/* Reassign to another command section */}
                      {cmdSections.filter(s => s !== sec).length > 0 && (
                        <div className="mt-3 p-3 border border-brand-navy/20 rounded-lg bg-brand-cream/30">
                          <label className="block text-sm font-medium text-[var(--text)] mb-2">Reassign to Another Command Section</label>
                          <div className="flex items-center gap-2">
                            <select
                              className="px-3 py-2 border border-brand-navy/30 rounded-lg flex-1"
                              value={reassignCmdSection[r.id] || ''}
                              onChange={(e) => setReassignCmdSection(prev => ({ ...prev, [r.id]: e.target.value }))}
                            >
                              <option value="">Select command section</option>
                              {cmdSections.filter(s => s !== sec).map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                            <button
                              className="px-3 py-2 rounded bg-brand-gold text-brand-charcoal hover:bg-brand-gold-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => reassignToCmdSection(r)}
                              disabled={!(reassignCmdSection[r.id] || '').trim()}
                            >
                              Reassign
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <label className="bg-brand-navy text-brand-cream px-3 py-1 rounded hover:bg-brand-red-2 cursor-pointer inline-block">
                          <input
                            type="file"
                            multiple
                            onChange={(e) => setAttach(prev => ({ ...prev, [r.id]: e.target.files ? Array.from(e.target.files) : [] }))}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                          />
                          Add Files
                        </label>
                        <span className="text-xs text-[var(--muted)]">{(attach[r.id] || []).length ? `${(attach[r.id] || []).length} file(s) selected` : 'No files selected'}</span>
                        <button
                          className="px-3 py-1 text-xs bg-brand-gold text-brand-charcoal rounded hover:bg-brand-gold-2"
                          onClick={() => addFilesToRequest(r)}
                          disabled={!attach[r.id] || !(attach[r.id] || []).length}
                        >
                          Save Files
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                          className="px-3 py-2 rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
                          onClick={() => sendToInstallationCommander(r)}
                        >
                          Send to Commander
                        </button>
                        <button
                          className="px-3 py-2 rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2"
                          onClick={() => returnToInstallationSection(r)}
                        >
                          Return to Section
                        </button>
                      </div>
                    </div>
                  )}
                </RequestTable>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'Previously in Command Section' && (
        <RequestTable
          title="Previously in Command Section"
          requests={previouslyInCmdSection}
          users={usersById}
          variant="installation"
          onRowClick={(r) => setExpandedCard(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
          expandedRows={expandedCard}
        >
          {(r: Request) => (
            <div className="p-4 bg-gray-50 space-y-3">
              <div className="text-xs text-gray-600">Last Status: {new Date((r.activity && r.activity.length ? r.activity[r.activity.length - 1].timestamp : r.createdAt)).toLocaleString()}</div>
              <div className="mt-2 flex items-center gap-2">
                <select className="px-3 py-2 border border-brand-navy/30 rounded-lg" value={nextInstSection[r.id] || ''} onChange={(e) => setNextInstSection(prev => ({ ...prev, [r.id]: e.target.value }))}>
                  <option value="">Select installation section</option>
                  {(install?.sections || []).map((s: string) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button className="px-3 py-2 rounded bg-brand-gold text-brand-charcoal hover:bg-brand-gold-2" onClick={() => restoreToInstallationSection(r, nextInstSection[r.id])}>Restore to Section</button>
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

      {/* Document Preview Modal */}
      {previewDoc && (
        <DocumentPreview
          fileName={previewDoc.name}
          url={previewDoc.fileUrl || ''}
          mimeType={previewDoc.type || ''}
          fileSize={previewDoc.size || 0}
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  )
}
