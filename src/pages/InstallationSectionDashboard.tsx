import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { listInstallationsLegacy, listRequestsLegacy, listUsersLegacy, listDocumentsLegacy, upsertDocuments, upsertRequest, listHQMCDivisionsLegacy, listHQMCStructureLegacy } from '@/lib/db'
import { SearchableUnitSelector } from '@/components/SearchableUnitSelector'
import type { DocumentRecord, RequestRecord } from '@/lib/db'
import RequestTable from '@/components/RequestTable'
import { Request } from '@/types'
import InstallationPermissionManager from '@/components/InstallationPermissionManager'
import { DocumentList, DocumentPreview, useToast } from '@/components/common'
import { formatActorName } from '@/lib/utils'
import { canArchiveAtLevel, isInstallationApproved, isInstallationEndorsed, isUnitApproved, isUnitEndorsed } from '@/lib/stage'

export default function InstallationSectionDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [expandedCard, setExpandedCard] = useState<Record<string, boolean>>({})
  const [install, setInstall] = useState<any | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [selectedCmd, setSelectedCmd] = useState<Record<string, string>>({})
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [comments, setComments] = useState<Record<string, string>>({})
  const [attach, setAttach] = useState<Record<string, File[]>>({})
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({})
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})
  const [openDocsId, setOpenDocsId] = useState<string | null>(null)
  const docsRef = React.useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'Pending' | 'Previously in Section' | 'Files'>('Pending')
  const [filesSearchQuery, setFilesSearchQuery] = useState<string>('')
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({})
  const [expandedBuckets, setExpandedBuckets] = useState<Record<string, boolean>>({})
  const [nextInstSection, setNextInstSection] = useState<Record<string, string>>({})
  const [sendToExternalInst, setSendToExternalInst] = useState<Record<string, boolean>>({})
  const [submitToHQMCInst, setSubmitToHQMCInst] = useState<Record<string, boolean>>({})
  const [externalUnitUic, setExternalUnitUic] = useState<Record<string, string>>({})
  const [externalUnit, setExternalUnit] = useState<Record<string, string>>({})
  const [externalUnitSections, setExternalUnitSections] = useState<Record<string, string[]>>({})
  const [externalSection, setExternalSection] = useState<Record<string, string>>({})
  const [hqmcDivisions, setHqmcDivisions] = useState<Array<{ id: string; name: string; code: string }>>([])
  const [hqmcStructure, setHqmcStructure] = useState<Array<{ division_name: string; division_code?: string; branch: string; description?: string }>>([])
  const [hqmcDivisionSel, setHqmcDivisionSel] = useState<Record<string, string>>({})
  const [hqmcBranchSel, setHqmcBranchSel] = useState<Record<string, string>>({})
  const [permOpen, setPermOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null)
  const [reassignSection, setReassignSection] = useState<Record<string, string>>({})
  // File dialog state
  const [showFileDialog, setShowFileDialog] = useState(false)
  const [fileDialogRequest, setFileDialogRequest] = useState<Request | null>(null)
  const [fileFinalizedDate, setFileFinalizedDate] = useState('')
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

  useEffect(() => {
    listHQMCDivisionsLegacy().then(setHqmcDivisions).catch(() => setHqmcDivisions([]))
    listHQMCStructureLegacy().then(setHqmcStructure).catch(() => setHqmcStructure([]))
  }, [])

  const usersById = useMemo(() => {
    const map: Record<string, any> = {}
    for (const u of users) map[u.id] = u
    return map
  }, [users])

  const docsFor = (requestId: string) => documents.filter(d => String(d.requestId || '') === String(requestId))

  const originatorFor = (r: Request) => usersById[r.uploadedById]
  const originatorName = (r: Request) => {
    const u = originatorFor(r)
    if (!u) return ''
    return `${u.rank || ''} ${u.lastName || ''}, ${u.firstName || ''}${u.mi ? ` ${u.mi}` : ''}`.trim()
  }
  const formatCsvCell = (v: any) => {
    const s = String(v ?? '')
    const escaped = s.replace(/"/g, '""')
    return `"${escaped}"`
  }
  const buildRows = (list: Request[]) => {
    const headers = ['Request ID','Subject','Stage','Installation Section','Route Section','Originator','Unit UIC','Created At','Documents']
    const rows = [headers]
    for (const r of list) {
      const docs = docsFor(r.id).map(d => d.name).join(' | ')
      rows.push([
        r.id,
        r.subject,
        r.currentStage || '',
        r.routeSection || '',
        r.routeSection || '',
        originatorName(r),
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
  const exportPending = () => downloadCsv('installation_section_pending.csv', buildRows(inMySections))
  const exportPrevious = () => downloadCsv('installation_section_previous.csv', buildRows(previouslyInSection))
  const exportFiles = () => downloadCsv('installation_section_files.csv', buildRows(filedInInstallation))
  const exportAll = () => downloadCsv('installation_section_all.csv', buildRows([...inMySections, ...previouslyInSection, ...filedInInstallation]))

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

  const mySections: string[] = useMemo(() => {
    if (!install || !currentUser?.id) return []
    const assignments = install.sectionAssignments || {}
    const entries = Object.entries(assignments).filter(([, ids]: any) => Array.isArray(ids) && ids.includes(currentUser.id))
    return entries.map(([name]) => String(name))
  }, [install, currentUser])

  const canManageAnySection = useMemo(() => {
    if (!install || !currentUser?.id) return false
    if (currentUser.isInstallationAdmin) return true
    const assignments = install.sectionAssignments || {}
    return Object.values(assignments).some((ids: any) => Array.isArray(ids) && ids.includes(currentUser.id))
  }, [install, currentUser])

  const inMySections = useMemo(() => {
    const iid = currentUser?.installationId || ''
    const allowed = new Set(mySections.map(s => s.toUpperCase()))
    return requests.filter(r => (r.currentStage === 'INSTALLATION_REVIEW') && r.installationId === iid && r.routeSection && allowed.has(String(r.routeSection || '').toUpperCase()))
  }, [requests, currentUser, mySections])

  const previouslyInSection = useMemo(() => {
    const iid = currentUser?.installationId || ''
    const allowed = new Set(mySections.map(s => s.toUpperCase()))
    return requests.filter(r => {
      // Skip filed records - they go to Files tab
      if (r.filedAt) return false

      return r.installationId === iid && (
        (r.currentStage !== 'INSTALLATION_REVIEW') ||
        !(r.routeSection && allowed.has(String(r.routeSection || '').toUpperCase()))
      )
    })
  }, [requests, currentUser, mySections])

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
    if (unit === 'years') {
      disposalDate.setFullYear(disposalDate.getFullYear() + request.retentionValue);
    } else if (unit === 'months') {
      disposalDate.setMonth(disposalDate.getMonth() + request.retentionValue);
    } else if (unit === 'days') {
      disposalDate.setDate(disposalDate.getDate() + request.retentionValue);
    }

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
    if (unit === 'years') {
      disposalDate.setFullYear(disposalDate.getFullYear() + request.retentionValue);
    } else if (unit === 'months') {
      disposalDate.setMonth(disposalDate.getMonth() + request.retentionValue);
    } else if (unit === 'days') {
      disposalDate.setDate(disposalDate.getDate() + request.retentionValue);
    }

    return disposalDate.toLocaleDateString();
  }, []);

  // Filed records grouped by disposal year then bucket
  type GroupedRecords = Record<string, Record<string, Request[]>>;

  const groupedFiledRecords = useMemo<GroupedRecords>(() => {
    const iid = currentUser?.installationId || ''

    let records = requests.filter(r => {
      if (!r.filedAt) return false
      if (r.installationId !== iid) return false
      const hasActivity = r.activity?.some(a => {
        const action = String(a.action || '')
        return mySections.some(sec => action.includes(sec) || action.includes(sec.toUpperCase()))
      })
      return hasActivity
    })

    // Apply search filter
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

    // Sort records within each bucket
    for (const year of Object.keys(grouped)) {
      for (const bucket of Object.keys(grouped[year])) {
        grouped[year][bucket].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    }

    return grouped;
  }, [requests, currentUser, mySections, filesSearchQuery, getDisposalYear])

  // Get sorted year keys
  const sortedYearKeys = useMemo(() => {
    const years = Object.keys(groupedFiledRecords);
    return years.sort((a, b) => {
      if (a === 'Permanent') return -1;
      if (b === 'Permanent') return 1;
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return parseInt(a) - parseInt(b);
    });
  }, [groupedFiledRecords])

  // Count total filed records
  const filedRecordCount = useMemo(() => {
    return Object.values(groupedFiledRecords).reduce((sum, buckets) =>
      sum + Object.values(buckets).reduce((s, arr) => s + arr.length, 0), 0);
  }, [groupedFiledRecords])

  const restoreToSection = async (r: Request, sec?: string) => {
    const actor = formatActorName(currentUser, 'Installation Section')
    const targetSec = (sec || '').trim() || (r.routeSection || '')
    const entry = { actor, timestamp: new Date().toISOString(), action: `Restored to installation section${targetSec ? `: ${targetSec}` : ''}` }
    const updated: any = { ...r, currentStage: 'INSTALLATION_REVIEW', finalStatus: undefined, routeSection: targetSec, activity: [...(r.activity || []), entry] }
    try {
      await upsertRequest(updated)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
    } catch (e) {
      console.error('InstallationSectionDashboard - Failed to restore:', e)
      toast.error('Failed to restore to section')
    }
  }

  const sendToInstallationCommand = async (r: Request) => {
    const sec = selectedCmd[r.id] || ''
    if (!sec.trim()) return
    const actor = formatActorName(currentUser, 'Installation Section')
    const prevSec = r.routeSection || ''
    const entry = { actor, actorRole: 'Installation Section', timestamp: new Date().toISOString(), action: `Approved and routed to Installation Command: ${sec}${prevSec ? ` (from ${prevSec})` : ''}`, comment: (comments[r.id] || '').trim(), fromSection: prevSec || undefined, toSection: sec }
    const updated: any = { ...r, routeSection: sec, activity: [...(r.activity || []), entry] }
    try {
      await upsertRequest(updated)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
      setComments(prev => ({ ...prev, [r.id]: '' }))
      setSelectedCmd(prev => ({ ...prev, [r.id]: '' }))
    } catch (e) {
      console.error('Failed to route to installation command section:', e)
      toast.error('Failed to route to installation command section')
    }
  }

  const reassignToSection = async (r: Request) => {
    const sec = reassignSection[r.id] || ''
    if (!sec.trim()) return
    const actor = formatActorName(currentUser, 'Installation Section')
    const prevSec = r.routeSection || ''
    const entry = { actor, actorRole: 'Installation Section', timestamp: new Date().toISOString(), action: `Reassigned to installation section: ${sec}${prevSec ? ` (from ${prevSec})` : ''}`, comment: (comments[r.id] || '').trim(), fromSection: prevSec || undefined, toSection: sec }
    const updated: any = { ...r, routeSection: sec, activity: [...(r.activity || []), entry] }
    try {
      await upsertRequest(updated)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
      setComments(prev => ({ ...prev, [r.id]: '' }))
      setReassignSection(prev => ({ ...prev, [r.id]: '' }))
    } catch (e) {
      console.error('Failed to reassign to installation section:', e)
      toast.error('Failed to reassign to installation section')
    }
  }

  const returnToUnit = async (r: Request) => {
    const actor = formatActorName(currentUser, 'Installation Section')
    const prevSec = r.routeSection || ''
    const entry = { actor, actorRole: 'Installation Section', timestamp: new Date().toISOString(), action: 'Returned to originating unit (Battalion)', comment: (comments[r.id] || '').trim(), fromSection: prevSec || undefined, toSection: 'BATTALION_REVIEW' }
    const updated: any = {
      ...r,
      currentStage: 'BATTALION_REVIEW',
      installationId: null,
      routeSection: '',
      activity: [...(r.activity || []), entry]
    }
    try {
      await upsertRequest(updated)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
      setComments(prev => ({ ...prev, [r.id]: '' }))
    } catch (e) {
      console.error('Failed to return to unit:', e)
      toast.error('Failed to return to unit')
    }
  }

  const handleExternalUnitChange = (requestId: string, selectedUnit: any | undefined) => {
    if (!selectedUnit) {
      setExternalUnitUic(prev => ({ ...prev, [requestId]: '' }))
      setExternalUnit(prev => ({ ...prev, [requestId]: '' }))
      setExternalUnitSections(prev => ({ ...prev, [requestId]: [] }))
      setExternalSection(prev => ({ ...prev, [requestId]: '' }))
      return
    }

    const selectedUic = selectedUnit.uic
    setExternalUnitUic(prev => ({ ...prev, [requestId]: selectedUic }))
    setExternalUnit(prev => ({ ...prev, [requestId]: selectedUnit.unitName }))

    let sections: string[] = []
    try {
      const rawUs = localStorage.getItem('unit_structure')
      if (rawUs) {
        const parsed = JSON.parse(rawUs)
        const unitData = parsed[selectedUic]
        const unitSections = (unitData?._sections && Array.isArray(unitData._sections)) ? unitData._sections : []
        const commandSections = (unitData?._commandSections && Array.isArray(unitData._commandSections)) ? unitData._commandSections : []
        sections = [...unitSections, ...commandSections]
      }
    } catch (error) {
      console.error('InstallationSectionDashboard - Failed to load unit sections:', error)
    }
    setExternalUnitSections(prev => ({ ...prev, [requestId]: sections }))
    setExternalSection(prev => ({ ...prev, [requestId]: '' }))
  }

  const sendToExternalFromInstSection = async (r: Request) => {
    const actor = formatActorName(currentUser, 'Installation Section')
    const extUic = externalUnitUic[r.id] || ''
    const extUnitName = externalUnit[r.id] || ''
    const extSec = externalSection[r.id] || ''
    if (!extUic.trim()) { toast.warning('Please select an external unit'); return }
    const prevSec = r.routeSection || ''
    const entry = { actor, actorRole: 'Installation Section', timestamp: new Date().toISOString(), action: extSec ? `Sent to external unit: ${extUnitName} - ${extSec}` : `Sent to external unit: ${extUnitName}`, comment: (comments[r.id] || '').trim(), fromSection: prevSec || undefined, toSection: extSec || extUnitName }
    const updated: Request = {
      ...r,
      currentStage: 'EXTERNAL_REVIEW',
      externalPendingUnitName: extUnitName,
      externalPendingUnitUic: extUic,
      externalPendingStage: extSec || undefined,
      routeSection: extSec || '',
      activity: [...(r.activity || []), entry]
    }
    try {
      await upsertRequest(updated as RequestRecord)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
      setComments(prev => ({ ...prev, [r.id]: '' }))
      setSendToExternalInst(prev => ({ ...prev, [r.id]: false }))
      setExternalUnitUic(prev => ({ ...prev, [r.id]: '' }))
      setExternalUnit(prev => ({ ...prev, [r.id]: '' }))
      setExternalSection(prev => ({ ...prev, [r.id]: '' }))
    } catch (e) {
      console.error('Failed to send to external unit:', e)
      toast.error('Failed to send to external unit')
    }
  }

  const submitToHQMCFromInstSection = async (r: Request) => {
    const actor = formatActorName(currentUser, 'Installation Section')
    const div = hqmcDivisionSel[r.id] || ''
    const branch = hqmcBranchSel[r.id] || ''
    if (!div) { toast.warning('Select HQMC division'); return }
    // Check if this division has any sections defined
    const divisionHasSections = hqmcStructure.some(s => String(s.division_code || '') === div)
    // If division has sections but none selected, require selection
    if (divisionHasSections && !branch) { toast.warning('Select HQMC section'); return }
    const prevSec = r.routeSection || ''
    const targetSection = branch || div // Use division code as section if no branch
    const actionText = branch ? `Submitted to HQMC: ${div} - ${branch}` : `Submitted to HQMC: ${div}`
    const entry = { actor, actorRole: 'Installation Section', timestamp: new Date().toISOString(), action: actionText, comment: (comments[r.id] || '').trim(), fromSection: prevSec || undefined, toSection: targetSection }
    const updated: Request = { ...r, currentStage: 'HQMC_REVIEW', routeSection: targetSection, activity: [...(r.activity || []), entry] }
    try {
      await upsertRequest(updated as RequestRecord)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
      setComments(prev => ({ ...prev, [r.id]: '' }))
      setHqmcDivisionSel(prev => ({ ...prev, [r.id]: '' }))
      setHqmcBranchSel(prev => ({ ...prev, [r.id]: '' }))
    } catch (e) {
      console.error('Failed to submit to HQMC:', e)
      toast.error('Failed to submit to HQMC')
    }
  }

  const openFileDialog = (r: Request) => {
    setFileDialogRequest(r)
    setFileFinalizedDate(new Date().toISOString().slice(0, 10))
    setShowFileDialog(true)
  }

  const confirmFileRequest = async () => {
    if (!fileDialogRequest || !fileFinalizedDate) return
    const r = fileDialogRequest
    const actor = formatActorName(currentUser, 'Installation Section')
    const entry = { actor, actorRole: 'Installation Section', timestamp: new Date().toISOString(), action: `Filed by Installation Section (Date Finalized: ${fileFinalizedDate})`, comment: (comments[r.id] || '').trim() }
    const updated: Request = {
      ...r,
      filedAt: new Date(fileFinalizedDate).toISOString(),
      activity: [...(r.activity || []), entry]
    }
    try {
      await upsertRequest(updated as RequestRecord)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
      setComments(prev => ({ ...prev, [r.id]: '' }))
      setShowFileDialog(false)
      setFileDialogRequest(null)
      setFileFinalizedDate('')
      toast.success('Request filed successfully')
    } catch (e) {
      console.error('Failed to file request:', e)
      toast.error('Failed to file request')
    }
  }


  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-[var(--surface)] rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--text)]">Installation Section Dashboard</h2>
          <div className="flex items-center gap-3">
            <div className="text-sm text-[var(--muted)]">{(install?.name || '')}</div>
            {canManageAnySection && (
              <button className="px-3 py-1 text-xs rounded bg-brand-red text-brand-cream border-2 border-brand-red-2 shadow hover:bg-brand-red-2" onClick={() => setPermOpen(true)}>Manage Section Access</button>
            )}
          </div>
        </div>
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('Pending')}
              className={`${activeTab === 'Pending' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >Pending</button>
            <button
              onClick={() => setActiveTab('Previously in Section')}
              className={`${activeTab === 'Previously in Section' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >Previously in Section</button>
            <button
              onClick={() => setActiveTab('Files')}
              className={`${activeTab === 'Files' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >Files ({filedRecordCount})</button>
          </nav>
        </div>
        {activeTab === 'Pending' && (
        <RequestTable
          title="Assigned to My Sections"
          titleActions={(
            <>
              <button className="px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2 hidden md:block" onClick={exportPending}>Export Pending</button>
            </>
          )}
          requests={inMySections}
          users={usersById}
          variant="installation"
          onRowClick={(r) => setExpandedCard(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
          expandedRows={expandedCard}
        >
          {(r: Request) => (
            <div className="p-4 bg-gray-50 space-y-3">
              <div className="mt-3">
                <button
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
                  aria-expanded={!!expandedDocs[r.id]}
                  aria-controls={`docs-inst-${r.id}`}
                  onClick={() => { setExpandedDocs(prev => ({ ...prev, [r.id]: !prev[r.id] })); setOpenDocsId(prev => (!expandedDocs[r.id] ? r.id : null)) }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedDocs(prev => ({ ...prev, [r.id]: !prev[r.id] })); setOpenDocsId(prev => (!expandedDocs[r.id] ? r.id : null)) } }}
                >
                  <span>Show Documents</span>
                  <svg width="10" height="10" viewBox="0 0 20 20" className={`transition-transform ${expandedDocs[r.id] ? 'rotate-180' : 'rotate-0'}`} aria-hidden="true"><path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
                </button>
              </div>
              <div
                id={`docs-inst-${r.id}`}
                ref={expandedDocs[r.id] ? docsRef : undefined}
                className={`${expandedDocs[r.id] ? 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-[50vh] opacity-100' : 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-0 opacity-0'}`}
              >
                <DocumentList
                  documents={docsFor(r.id)}
                  showIcons
                  onPreview={(doc) => setPreviewDoc(docsFor(r.id).find(d => d.id === doc.id) || null)}
                />
              </div>
              <div className="mt-3">
                <button
                  className="px-3 py-1 text-xs rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                  onClick={() => setExpandedLogs(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                  aria-expanded={!!expandedLogs[r.id]}
                  aria-controls={`logs-inst-${r.id}`}
                >
                  {expandedLogs[r.id] ? 'Hide' : 'Show'} Activity Log
                </button>
                <div id={`logs-inst-${r.id}`} className={expandedLogs[r.id] ? 'mt-2 space-y-2' : 'hidden'}>
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
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Reviewer Comment</label>
                <textarea
                  rows={2}
                  value={comments[r.id] || ''}
                  onChange={(e) => setComments(prev => ({ ...prev, [r.id]: e.target.value }))}
                  className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  placeholder="Optional notes"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="bg-brand-navy text-brand-cream px-3 py-1 text-sm rounded hover:bg-brand-red-2 cursor-pointer inline-block">
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
                {(attach[r.id] || []).length > 0 && (
                  <button
                    className="px-3 py-1 text-xs bg-brand-gold text-brand-charcoal rounded hover:bg-brand-gold-2"
                    onClick={() => addFilesToRequest(r)}
                  >
                    Save Files
                  </button>
                )}
              </div>

              {/* Routing Options */}
              <div className="mt-4 p-3 border border-brand-navy/20 rounded-lg bg-brand-cream/30">
                <label className="block text-sm font-medium text-[var(--text)] mb-3">Routing Options</label>

                {/* Option 1: Approve to Installation Command Section */}
                <div className="mb-3 pb-3 border-b border-brand-navy/10">
                  <label className="block text-xs font-medium text-[var(--muted)] mb-2">Approve to Installation Command Section</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="flex-1 min-w-[200px] px-3 py-2 border border-brand-navy/30 rounded-lg text-sm"
                      value={selectedCmd[r.id] || ''}
                      onChange={(e) => setSelectedCmd(prev => ({ ...prev, [r.id]: e.target.value }))}
                    >
                      <option value="">Select command section...</option>
                      {(install?.commandSections || []).map((s: string) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      className="px-4 py-2 rounded bg-brand-gold text-brand-charcoal font-medium hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => sendToInstallationCommand(r)}
                      disabled={!selectedCmd[r.id]}
                    >
                      Approve to Command
                    </button>
                  </div>
                </div>

                {/* Option 2: Reassign to Another Installation Section */}
                <div className="mb-3 pb-3 border-b border-brand-navy/10">
                  <label className="block text-xs font-medium text-[var(--muted)] mb-2">Reassign to Another Installation Section</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="flex-1 min-w-[200px] px-3 py-2 border border-brand-navy/30 rounded-lg text-sm"
                      value={reassignSection[r.id] || ''}
                      onChange={(e) => setReassignSection(prev => ({ ...prev, [r.id]: e.target.value }))}
                    >
                      <option value="">Select installation section...</option>
                      {(install?.sections || []).filter((s: string) => s.toUpperCase() !== (r.routeSection || '').toUpperCase()).map((s: string) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      className="px-4 py-2 rounded bg-brand-cream text-brand-navy border border-brand-navy/30 font-medium hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => reassignToSection(r)}
                      disabled={!reassignSection[r.id]}
                    >
                      Reassign
                    </button>
                  </div>
                </div>

                {/* Option 3: Return to Originating Unit */}
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-2">Return to Originating Unit</label>
                  <button
                    className="px-4 py-2 rounded bg-brand-navy text-brand-cream font-medium hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                    onClick={() => returnToUnit(r)}
                  >
                    Return to Battalion
                  </button>
                  <p className="text-xs text-[var(--muted)] mt-1">Request will be returned to the originating unit's Unit Section Dashboard</p>
                </div>
              </div>

              {/* Additional Send Options - Only after Installation Commander endorsement */}
              {(r.activity || []).some(a => /Endorsed by Installation Commander/i.test(String(a.action || ''))) && (
                <div className="mt-3 p-3 border border-brand-navy/20 rounded-lg bg-brand-cream/30">
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Send Options (Post-Endorsement)</label>
                  <div className="flex flex-col gap-3">
                    {/* Send to External Unit Option */}
                    <div className="pb-3 border-b border-brand-navy/10">
                      <label className="inline-flex items-center gap-2 cursor-pointer mb-2">
                        <input type="checkbox" id={`send-ext-inst-${r.id}`} checked={sendToExternalInst[r.id] || false} onChange={() => {
                          const next = !(sendToExternalInst[r.id] || false)
                          setSendToExternalInst(prev => ({ ...prev, [r.id]: next }))
                        }} className="rounded border-brand-navy/30" />
                        <span className="text-sm font-medium">Send to External Unit</span>
                      </label>
                      {sendToExternalInst[r.id] && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <SearchableUnitSelector onUnitSelect={(u) => handleExternalUnitChange(r.id, u)} selectedUnit={{ uic: externalUnitUic[r.id] || '', unitName: externalUnit[r.id] || '' } as any} placeholder="Search by UIC, RUC, MCC, or Unit Name" />
                          <select className="px-3 py-2 border border-brand-navy/30 rounded-lg text-sm" value={externalSection[r.id] || ''} onChange={(e) => setExternalSection(prev => ({ ...prev, [r.id]: e.target.value }))} disabled={!(externalUnitSections[r.id] || []).length}>
                            <option value="">Select Section/Office (optional)</option>
                            {(externalUnitSections[r.id] || []).map(section => (
                              <option key={section} value={section}>{section}</option>
                            ))}
                          </select>
                          <button
                            className="px-4 py-2 rounded bg-brand-gold text-brand-charcoal font-medium hover:bg-brand-gold-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => sendToExternalFromInstSection(r)}
                            disabled={!(externalUnitUic[r.id])}
                          >
                            Submit to External Unit
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Submit to HQMC Option */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--muted)] mb-2">Submit to HQMC</label>
                      {(() => {
                        const selectedDiv = hqmcDivisionSel[r.id] || ''
                        const divisionSections = hqmcStructure.filter(s => String(s.division_code || '') === selectedDiv)
                        const hasSections = divisionSections.length > 0
                        const canSubmit = selectedDiv && (hasSections ? !!hqmcBranchSel[r.id] : true)
                        return (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <select className="px-3 py-2 border border-brand-navy/30 rounded-lg text-sm" value={selectedDiv} onChange={(e) => { setHqmcDivisionSel(prev => ({ ...prev, [r.id]: e.target.value })); setHqmcBranchSel(prev => ({ ...prev, [r.id]: '' })) }}>
                                <option value="">Select HQMC Division</option>
                                {hqmcDivisions.map(d => (<option key={d.code} value={d.code}>{d.code} — {d.name}</option>))}
                              </select>
                              {hasSections ? (
                                <select className="px-3 py-2 border border-brand-navy/30 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed" value={hqmcBranchSel[r.id] || ''} onChange={(e) => setHqmcBranchSel(prev => ({ ...prev, [r.id]: e.target.value }))} disabled={!selectedDiv}>
                                  <option value="">Select HQMC Section</option>
                                  {divisionSections.map(s => (
                                    <option key={s.branch} value={s.branch}>{s.branch}</option>
                                  ))}
                                </select>
                              ) : selectedDiv ? (
                                <div className="px-3 py-2 border border-brand-navy/30 rounded-lg text-sm bg-gray-100 text-gray-600 flex items-center">
                                  No sections defined — submit to division
                                </div>
                              ) : (
                                <select className="px-3 py-2 border border-brand-navy/30 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                                  <option value="">Select HQMC Section</option>
                                </select>
                              )}
                            </div>
                            <div className="mt-2">
                              <button
                                className="px-4 py-2 rounded bg-brand-gold text-brand-charcoal font-medium hover:bg-brand-gold-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                                onClick={() => submitToHQMCFromInstSection(r)}
                                disabled={!canSubmit}
                              >
                                Submit to HQMC
                              </button>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )}
              {/* File button - only after installation commander approval and has SSIC */}
              {canArchiveAtLevel(r, { userLevel: 'installation', userInstallationId: currentUser?.installationId }) && r.ssic && !r.filedAt && (
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    className="px-3 py-2 rounded bg-brand-gold text-brand-charcoal hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                    onClick={() => openFileDialog(r)}
                  >
                    File
                  </button>
                </div>
              )}
            </div>
          )}
        </RequestTable>
        )}
        {activeTab === 'Previously in Section' && (
        <RequestTable
          title="Previously in Section"
          titleActions={(
            <>
              <button className="px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2 hidden md:block" onClick={exportPrevious}>Export Previous</button>
            </>
          )}
          requests={previouslyInSection}
          users={usersById}
          variant="installation"
          onRowClick={(r) => setExpandedCard(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
          expandedRows={expandedCard}
        >
          {(r: Request) => (
            <div className="p-4 bg-gray-50 space-y-3">
              <div className="text-xs text-gray-600">Last Status: {new Date((r.activity && r.activity.length ? r.activity[r.activity.length - 1].timestamp : r.createdAt)).toLocaleString()}</div>
              <div className="mt-2">
                <button
                  className="px-3 py-1 text-xs rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                  onClick={() => setExpandedLogs(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                  aria-expanded={!!expandedLogs[r.id]}
                  aria-controls={`logs-prev-inst-${r.id}`}
                >
                  {expandedLogs[r.id] ? 'Hide' : 'Show'} Activity Log
                </button>
                <div id={`logs-prev-inst-${r.id}`} className={expandedLogs[r.id] ? 'mt-2 space-y-2' : 'hidden'}>
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
              <div className="mt-2 flex items-center gap-2">
                <select className="px-3 py-2 border border-brand-navy/30 rounded-lg" value={nextInstSection[r.id] || ''} onChange={(e) => setNextInstSection(prev => ({ ...prev, [r.id]: e.target.value }))}>
                  <option value="">Select installation section</option>
                  {(install?.sections || []).map((s: string) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button className="px-3 py-2 rounded bg-brand-gold text-brand-charcoal hover:bg-brand-gold-2" onClick={() => restoreToSection(r, nextInstSection[r.id])}>Restore to Section</button>
              </div>
            </div>
          )}
        </RequestTable>
        )}
        {activeTab === 'Files' && (
          <div className="space-y-4">
            {/* Search Bar */}
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
                {filesSearchQuery ? 'No records match your search.' : 'No filed records in this installation section.'}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Records grouped by disposal year, then by bucket - Accordion Style */}
                {sortedYearKeys.map((year) => {
                  const buckets = groupedFiledRecords[year];
                  const sortedBuckets = Object.keys(buckets).sort();
                  const isPermanentYear = year === 'Permanent';
                  const recordCount = Object.values(buckets).reduce((sum, arr) => sum + arr.length, 0);
                  const isYearExpanded = expandedYears[year] || false;

                  return (
                    <div key={year} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Year Header - Clickable Accordion */}
                      <button
                        onClick={() => setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }))}
                        className={`w-full ${isPermanentYear ? 'bg-blue-800 hover:bg-blue-700' : 'bg-brand-navy hover:bg-brand-navy/90'} text-brand-cream px-4 py-3 font-medium flex items-center justify-between transition-colors`}
                      >
                        <div className="flex items-center gap-2">
                          <svg
                            className={`w-4 h-4 transition-transform flex-shrink-0 ${isYearExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="truncate">{isPermanentYear ? 'Permanent Records' : `Disposal Year: ${year}`}</span>
                        </div>
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded flex-shrink-0 ml-2">
                          {recordCount} record{recordCount !== 1 ? 's' : ''}
                        </span>
                      </button>

                      {/* Year Content - Buckets */}
                      {isYearExpanded && (
                        <div className="bg-gray-50 p-2 space-y-2">
                          {sortedBuckets.map((bucket) => {
                            const records = buckets[bucket];
                            const bucketKey = `${year}-${bucket}`;
                            const isBucketExpanded = expandedBuckets[bucketKey] || false;

                            return (
                              <div key={bucketKey} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                                {/* Bucket Header */}
                                <button
                                  onClick={() => setExpandedBuckets(prev => ({ ...prev, [bucketKey]: !prev[bucketKey] }))}
                                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 font-medium text-sm flex items-center justify-between transition-colors"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <svg
                                      className={`w-3 h-3 transition-transform flex-shrink-0 ${isBucketExpanded ? 'rotate-90' : ''}`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    <span className="truncate">{bucket}</span>
                                  </div>
                                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{records.length} item{records.length !== 1 ? 's' : ''}</span>
                                </button>

                                {/* Bucket Content - Records Table */}
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
                                                <span className="inline-flex px-1.5 sm:px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded whitespace-nowrap">
                                                  Perm
                                                </span>
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
      {permOpen && currentUser && (
        <InstallationPermissionManager currentUser={currentUser} onClose={() => setPermOpen(false)} />
      )}

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

      {/* File Dialog Modal */}
      {showFileDialog && fileDialogRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">File Record</h3>
            <p className="text-sm text-gray-600 mb-4">
              Filing: <strong>{fileDialogRequest.subject}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Finalized</label>
              <input
                type="date"
                value={fileFinalizedDate}
                onChange={(e) => setFileFinalizedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
              />
              <p className="text-xs text-gray-500 mt-1">This date will be used to calculate the disposal date based on the retention schedule.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
                onClick={() => { setShowFileDialog(false); setFileDialogRequest(null); setFileFinalizedDate('') }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-brand-gold text-brand-charcoal hover:bg-brand-gold-2"
                onClick={confirmFileRequest}
                disabled={!fileFinalizedDate}
              >
                Confirm File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
