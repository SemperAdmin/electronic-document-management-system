import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { loadUnitStructureFromBundle } from '@/lib/unitStructure'
import { UNITS, Unit } from '../lib/units'
import { listRequestsLegacy, listDocumentsLegacy, listUsersLegacy, upsertRequest, upsertDocuments, listInstallationsLegacy, listHQMCDivisionsLegacy, listHQMCStructureLegacy } from '@/lib/db'
import RequestTable from '../components/RequestTable'
import { SearchableUnitSelector } from '../components/SearchableUnitSelector'
import { Request, Installation, UserRecord } from '../types'
import { normalizeString, hasReviewer } from '../lib/reviewers';
import { DocumentList } from '@/components/common';
import { formatActorName } from '@/lib/utils';
import { canArchiveAtLevel, isUnitApproved, isUnitEndorsed, canFileRequest, canReturnToLowerLevel, getReturnTargetStage, Stage } from '@/lib/stage';

const DEFAULT_EXTERNAL_STAGE = 'REVIEW';

interface RequestActivity {
  actor: string
  timestamp: string
  action: string
  comment?: string
}

interface DocumentItem {
  id: string
  name: string
  type: string
  size: number
  uploadedAt: string | Date
  subject: string
  requestId?: string
  fileUrl?: string
}

export default function SectionDashboard() {
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [usersById, setUsersById] = useState<Record<string, UserRecord>>({})
  const [platoonSectionMap, setPlatoonSectionMap] = useState<Record<string, Record<string, Record<string, string>>>>({})
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})
  const [unitSections, setUnitSections] = useState<Record<string, string[]>>({})
  const [selectedBattalionSection, setSelectedBattalionSection] = useState<string>('')
  const [comments, setComments] = useState<Record<string, string>>({})
  const [attach, setAttach] = useState<Record<string, File[]>>({})
  const [commandSections, setCommandSections] = useState<Record<string, string[]>>({})
  const [selectedCmdSection, setSelectedCmdSection] = useState<Record<string, string>>({})
  const [expandedCard, setExpandedCard] = useState<Record<string, boolean>>({})
  const [approvalDateEdit, setApprovalDateEdit] = useState<Record<string, string>>({})
  const [endorseUnitSel, setEndorseUnitSel] = useState<Record<string, string>>({})
  const [externalAssignSel, setExternalAssignSel] = useState<Record<string, string>>({})
  const [externalUnit, setExternalUnit] = useState<Record<string, string>>({})
  const [externalUnitUic, setExternalUnitUic] = useState<Record<string, string>>({})
  const [externalSection, setExternalSection] = useState<Record<string, string>>({})
  const [externalUnitSections, setExternalUnitSections] = useState<Record<string, string[]>>({})
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({})
  const [openDocsId, setOpenDocsId] = useState<string | null>(null)
  const docsRef = useRef<HTMLDivElement | null>(null)
  const [activeTab, setActiveTab] = useState<'Pending' | 'Previously in Section' | 'Files'>('Pending');
  const [filesSearchQuery, setFilesSearchQuery] = useState<string>('');
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
  const [expandedBuckets, setExpandedBuckets] = useState<Record<string, boolean>>({});
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [submitToInstallation, setSubmitToInstallation] = useState<Record<string, boolean>>({});
  const [instSection, setInstSection] = useState<Record<string, string>>({});
  const [sendToExternal, setSendToExternal] = useState<Record<string, boolean>>({});
  const [submitToHQMC, setSubmitToHQMC] = useState<Record<string, boolean>>({});
  const [hqmcDivisions, setHqmcDivisions] = useState<Array<{ id: string; name: string; code: string }>>([])
  const [hqmcStructure, setHqmcStructure] = useState<Array<{ division_name: string; division_code?: string; branch: string; description?: string }>>([])
  const [hqmcDivisionSel, setHqmcDivisionSel] = useState<Record<string, string>>({})
  const [hqmcBranchSel, setHqmcBranchSel] = useState<Record<string, string>>({})
  const [showFileDialog, setShowFileDialog] = useState<boolean>(false)
  const [fileDialogRequest, setFileDialogRequest] = useState<Request | null>(null)
  const [fileFinalizedDate, setFileFinalizedDate] = useState<string>('')

  useEffect(() => {
    listInstallationsLegacy().then(data => setInstallations(data as Installation[]));
    listHQMCDivisionsLegacy().then(setHqmcDivisions).catch(() => setHqmcDivisions([]))
    listHQMCStructureLegacy().then(setHqmcStructure).catch(() => setHqmcStructure([]))
  }, []);

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem('currentUser')
      if (raw) setCurrentUser(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const uic = currentUser?.unitUic || ''
      const c = (currentUser?.company && currentUser.company !== 'N/A') ? currentUser.company : ''
      const p = (currentUser?.platoon && currentUser.platoon !== 'N/A') ? currentUser.platoon : ''
      const linked = platoonSectionMap[uic]?.[c]?.[p] || ''
      setSelectedBattalionSection(linked)
    } catch {}
  }, [currentUser, platoonSectionMap])

  useEffect(() => {
    listRequestsLegacy().then((remote) => {
      setRequests(remote as any)
    }).catch(() => setRequests([]))
  }, [])

  useEffect(() => {
    listDocumentsLegacy().then((remote) => {
      setDocuments(remote as any)
    }).catch(() => setDocuments([]))
  }, [])

  useEffect(() => {
    listUsersLegacy().then((remote) => {
      const byId: Record<string, UserRecord> = {}
      for (const u of (remote as any)) byId[u.id] = u
      setUsersById(byId)
    }).catch(() => setUsersById({}))
  }, [])

  useEffect(() => {
    try {
      const rawUs = localStorage.getItem('unit_structure')
      const pMap: Record<string, Record<string, Record<string, string>>> = {}
      const secMap: Record<string, string[]> = {}
      const cmdMap: Record<string, string[]> = {}
      if (rawUs) {
        const parsed = JSON.parse(rawUs)
        for (const uic of Object.keys(parsed || {})) {
          const v = parsed[uic]
          if (v && v._platoonSectionMap && typeof v._platoonSectionMap === 'object') pMap[uic] = v._platoonSectionMap
          if (v && Array.isArray(v._sections)) secMap[uic] = v._sections
          if (v && Array.isArray(v._commandSections)) cmdMap[uic] = v._commandSections
        }
      } else {
        ;(async () => {
          try {
            const merged = await loadUnitStructureFromBundle()
            for (const uic of Object.keys(merged || {})) {
              const v = (merged as any)[uic]
              if (v && v._platoonSectionMap && typeof v._platoonSectionMap === 'object') pMap[uic] = v._platoonSectionMap
              if (v && Array.isArray(v._sections)) secMap[uic] = v._sections
              if (v && Array.isArray(v._commandSections)) cmdMap[uic] = v._commandSections
            }
          } catch {}
        })()
      }
      setPlatoonSectionMap(pMap)
      setUnitSections(secMap)
      setCommandSections(cmdMap)
    } catch {}
  }, [])

  const sectionRouted = useMemo(() => {
    const cuic = currentUser?.unitUic || ''
    return requests.filter(r => {
      const stage = r.currentStage || ''
      const effectiveUic = stage === 'EXTERNAL_REVIEW' ? (r.externalPendingUnitUic || r.unitUic || '') : (r.unitUic || '')
      const section = battalionSectionFor(r)
      return (!!section) && (cuic ? effectiveUic === cuic : true)
    })
  }, [requests, currentUser, battalionSectionFor])

  const visibleRequests = useMemo(() => {
    const norm = (n: string) => String(n || '').trim().replace(/^S(\d)\b/, 'S-$1')
    return sectionRouted.filter(r => {
      const sec = norm(battalionSectionFor(r))
      const sel = norm(selectedBattalionSection)
      return selectedBattalionSection ? sec === sel : true
    })
  }, [sectionRouted, selectedBattalionSection, battalionSectionFor])

  const pendingInSection = useMemo(() => {
    return visibleRequests.filter(r => (r.currentStage || '') === 'BATTALION_REVIEW')
  }, [visibleRequests])

  const previousInSection = useMemo(() => {
    const norm = (n: string) => String(n || '').trim().replace(/^S(\d)\b/, 'S-$1')
    const sel = norm(selectedBattalionSection)
    if (!sel) return []

    return requests.filter(r => {
      // Skip filed records - they go to Files tab
      if (r.filedAt) return false

      const stage = r.currentStage || ''
      const cuic = currentUser?.unitUic || ''
      const effectiveUic = stage === 'EXTERNAL_REVIEW' ? (r.externalPendingUnitUic || r.unitUic || '') : (r.unitUic || '')

      // Filter by unit
      if (cuic && effectiveUic !== cuic) return false

      // Skip if currently in battalion review with this section (those go to pending)
      if (stage === 'BATTALION_REVIEW' && norm(battalionSectionFor(r)) === sel) return false

      // Check if this section was involved based on activity log
      const hasActivity = r.activity?.some(a => {
        const action = String(a.action || '')
        // Look for actions that mention routing to this section or approval by this section
        return action.includes(sel) || action.includes(selectedBattalionSection)
      })

      // Also check if request has this section in routeSection history
      // (for cases where it was routed through this section before)
      const wasRoutedHere = r.activity?.some(a => {
        const action = String(a.action || '')
        return action.includes(`routed to ${sel}`) || action.includes(`routed to ${selectedBattalionSection}`)
      })

      return hasActivity || wasRoutedHere
    })
  }, [requests, currentUser, selectedBattalionSection])

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
    const norm = (n: string) => String(n || '').trim().replace(/^S(\d)\b/, 'S-$1')
    const sel = norm(selectedBattalionSection)
    if (!sel) return {}

    let records = requests.filter(r => {
      if (!r.filedAt) return false
      const cuic = currentUser?.unitUic || ''
      if (cuic && r.unitUic !== cuic) return false
      const hasActivity = r.activity?.some(a => {
        const action = String(a.action || '')
        return action.includes(sel) || action.includes(selectedBattalionSection)
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
  }, [requests, currentUser, selectedBattalionSection, filesSearchQuery, getDisposalYear])

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

  function battalionSectionFor(r: Request) {
    const norm = (n: string) => String(n || '').trim().replace(/^S(\d)\b/, 'S-$1')
    if (r.routeSection) return norm(r.routeSection)
    const ouic = r.unitUic || ''
    const originator = usersById[r.uploadedById]
    const oc = (originator?.company && originator.company !== 'N/A') ? originator.company : ''
    const ou = (originator?.platoon && originator.platoon !== 'N/A') ? originator.platoon : ''
    const mapped = platoonSectionMap[ouic]?.[oc]?.[ou] || ''
    return norm(mapped)
  }

  const formatStage = (r: Request) => {
    const stage = r.currentStage || 'PLATOON_REVIEW'
    if (stage === 'PLATOON_REVIEW') return 'Platoon'
    if (stage === 'COMPANY_REVIEW') return 'Company'
    if (stage === 'BATTALION_REVIEW') return r.routeSection || 'Battalion'
    if (stage === 'COMMANDER_REVIEW') return r.routeSection || 'Commander'
    if (stage === 'EXTERNAL_REVIEW') return (r as any).externalPendingUnitName || 'External'
    if (stage === 'ARCHIVED') return 'Archived'
    return stage
  }

  const originatorName = (r: Request) => {
    const u = usersById[r.uploadedById]
    if (!u) return '—'
    const parts = [u.rank, u.lastName + ',', u.firstName, u.mi ? u.mi : ''].filter(Boolean)
    return parts.join(' ').trim()
  }

  const originatorAffiliation = (r: Request) => {
    const u = usersById[r.uploadedById]
    if (!u) return ''
    const vals = [
      (u.unit && u.unit !== 'N/A') ? u.unit : null,
      (u.company && u.company !== 'N/A') ? u.company : null,
      (u.platoon && u.platoon !== 'N/A') ? u.platoon : null,
    ].filter(Boolean) as string[]
    return vals.join(' • ')
  }

  const approvalInfo = (r: Request) => {
    const acts = Array.isArray(r.activity) ? r.activity : []
    const lastApproved = [...acts].reverse().find(a => a.action === 'Approved')
    return lastApproved ? new Date(lastApproved.timestamp).toLocaleString() : ''
  }

  const commanderStatus = (r: Request) => {
    const acts = Array.isArray(r.activity) ? r.activity : []
    const last = [...acts].reverse().find(a => /Commander/i.test(String(a.action || '')))
    if (!last) return ''
    if (/Rejected/i.test(last.action)) return 'Rejected'
    if (/Endorsed/i.test(last.action)) return 'Endorsed'
    if (/Approved/i.test(last.action)) return 'Approved'
    return ''
  }

  const docsFor = (reqId: string) => documents.filter(d => d.requestId === reqId)

  const formatCsvCell = (v: any) => {
    const s = String(v ?? '')
    const escaped = s.replace(/"/g, '""')
    return `"${escaped}"`
  }
  const buildRows = (list: Request[]) => {
    const headers = ['Request ID','Subject','Stage','Battalion Section','Route Section','Originator','Unit UIC','Created At','Documents']
    const rows = [headers]
    for (const r of list) {
      const docs = docsFor(r.id).map(d => d.name).join(' | ')
      rows.push([
        r.id,
        r.subject,
        r.currentStage || '',
        battalionSectionFor(r) || '',
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
  const exportPending = () => downloadCsv('battalion_pending.csv', buildRows(pendingInSection))
  const exportPrevious = () => downloadCsv('battalion_previous.csv', buildRows(previousInSection))
  const exportAll = () => downloadCsv('battalion_all.csv', buildRows([...pendingInSection, ...previousInSection]))

  const addFilesToRequest = async (r: Request) => {
    const files = attach[r.id] || []
    if (!files.length || !currentUser?.id) return
    const now = Date.now()
    const newDocs: DocumentItem[] = files.map((file, idx) => ({
      id: `${now}-${idx}`,
      name: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      subject: r.subject,
      requestId: r.id,
    })) as any
    const actor = formatActorName(currentUser, 'Reviewer')
    const actorRole = getActorRole()
    const entry = { actor, actorRole, timestamp: new Date().toISOString(), action: `Reviewer added ${newDocs.length} document(s)`, comment: (comments[r.id] || '').trim() }
    const updated: Request = {
      ...r,
      documentIds: [...(r.documentIds || []), ...newDocs.map(d => d.id)],
      activity: Array.isArray(r.activity) ? [...r.activity, entry] : [entry]
    }
    try {
      await upsertDocuments(newDocs as any)
      await upsertRequest(updated as any)
      setDocuments(prev => [...prev, ...newDocs])
      setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
    } catch (error) {
      console.error('Failed to add files to request:', error)
    }
    setAttach(prev => ({ ...prev, [r.id]: [] }))
    setComments(prev => ({ ...prev, [r.id]: '' }))
  }

  const getActorRole = (): string => {
    const section = selectedBattalionSection || ''
    return section ? `Battalion (${section})` : 'Battalion'
  }

  const isUnitInAnyInstallation = (uic?: string) => {
    const target = uic?.trim();
    if (!target) return false;
    return installations.some(inst => {
      const list = (inst as any).unit_uics || (inst as any).unitUics || [];
      return Array.isArray(list) && list.includes(target);
    });
  }

  // Check if request has been approved or endorsed by commander
  const hasCommanderApproval = (r: Request): boolean => {
    const lastCommanderAction = (r.activity || []).slice().reverse().find(a => /Commander/i.test(String(a.action || '')))
    return !!lastCommanderAction && /(Approved|Endorsed)/i.test(String(lastCommanderAction.action || ''))
  }

  const approveRequest = async (r: Request) => {
    const dest = selectedCmdSection[r.id] || 'COMMANDER'
    const actor = formatActorName(currentUser, 'Battalion')
    const actorRole = getActorRole()
    const fromSection = battalionSectionFor(r) || selectedBattalionSection || ''
    const actionText = dest === 'COMMANDER' ? 'Approved to COMMANDER' : `Approved and routed to ${dest}`
    const entry = { actor, actorRole, timestamp: new Date().toISOString(), action: actionText, comment: (comments[r.id] || '').trim(), fromSection: fromSection || undefined, toSection: dest }
    const updated: Request = {
      ...r,
      currentStage: 'COMMANDER_REVIEW',
      routeSection: dest === 'COMMANDER' ? '' : dest,
      activity: Array.isArray(r.activity) ? [...r.activity, entry] : [entry]
    }
    try {
      await upsertRequest({ ...updated, unitUic: r.unitUic || '' } as any);
      setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)));
      setComments(prev => ({ ...prev, [r.id]: '' }));
      setSelectedCmdSection(prev => ({ ...prev, [r.id]: '' }));
    } catch (error) {
      console.error('Failed to approve request:', error);
    }
  }

  const rejectRequest = async (r: Request) => {
    const actor = formatActorName(currentUser, 'Battalion')
    const actorRole = getActorRole()
    const entry = { actor, actorRole, timestamp: new Date().toISOString(), action: 'Returned to previous stage', comment: (comments[r.id] || '').trim() }
    const updated: Request = {
      ...r,
      currentStage: 'COMPANY_REVIEW',
      activity: Array.isArray(r.activity) ? [...r.activity, entry] : [entry]
    }
    try {
      await upsertRequest(updated as any);
      setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)));
      setComments(prev => ({ ...prev, [r.id]: '' }));
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  }

  const endorseRequest = async (r: Request) => {
    const uic = endorseUnitSel[r.id]
    if (!uic) return
    const unit = UNITS.find(u => u.uic === uic)
    const actor = formatActorName(currentUser, 'Battalion')
    const actorRole = getActorRole()
    const entry = { actor, actorRole, timestamp: new Date().toISOString(), action: `Endorsed to ${unit?.unitName || uic}`, comment: (comments[r.id] || '').trim() }
    const updated: Request = {
      ...r,
      currentStage: 'EXTERNAL_REVIEW',
      externalPendingUnitUic: uic,
      externalPendingUnitName: unit?.unitName || uic,
      activity: Array.isArray(r.activity) ? [...r.activity, entry] : [entry]
    }
    try {
      await upsertRequest(updated as any)
      setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)));
    } catch (error) {
      console.error('Failed to endorse request:', error);
    }
  }

  // Open file dialog to select finalized date
  const openFileDialog = (r: Request) => {
    if (!r.ssic) {
      alert('Request must have SSIC/retention classification before filing.');
      return;
    }
    setFileDialogRequest(r);
    setFileFinalizedDate(new Date().toISOString().split('T')[0]);
    setShowFileDialog(true);
  };

  // File a request for records management
  const confirmFileRequest = async () => {
    if (!fileDialogRequest || !currentUser) return;
    if (!fileFinalizedDate) {
      alert('Please select a finalized date.');
      return;
    }

    const filedAt = new Date(fileFinalizedDate + 'T23:59:59').toISOString();
    const actor = formatActorName(currentUser, 'Battalion');
    const actorRole = getActorRole();
    const entry = {
      actor,
      actorRole,
      timestamp: new Date().toISOString(),
      action: 'Filed for Records Management',
      comment: `Date Finalized: ${new Date(fileFinalizedDate).toLocaleDateString()}${comments[fileDialogRequest.id]?.trim() ? ` - ${comments[fileDialogRequest.id].trim()}` : ''}`
    };
    const updated: Request = {
      ...fileDialogRequest,
      currentStage: 'ARCHIVED',
      finalStatus: 'Filed',
      filedAt,
      activity: Array.isArray(fileDialogRequest.activity) ? [...fileDialogRequest.activity, entry] : [entry]
    };
    try {
      await upsertRequest(updated as any);
      setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)));
      setComments(prev => ({ ...prev, [fileDialogRequest.id]: '' }));
      setShowFileDialog(false);
      setFileDialogRequest(null);
      setFileFinalizedDate('');
    } catch (error) {
      console.error('Failed to file request:', error);
    }
  };

  // Return request to lower level in the chain
  const returnToLowerLevel = async (r: Request) => {
    const targetStage = getReturnTargetStage(r.currentStage || '');
    if (!targetStage) {
      alert('Cannot return from this stage.');
      return;
    }

    const actor = formatActorName(currentUser, 'Battalion');
    const actorRole = getActorRole();
    const stageName = targetStage === Stage.ORIGINATOR_REVIEW ? 'Originator' :
                      targetStage === Stage.PLATOON_REVIEW ? 'Platoon' :
                      targetStage === Stage.COMPANY_REVIEW ? 'Company' : 'Lower Level';

    const entry = {
      actor,
      actorRole,
      timestamp: new Date().toISOString(),
      action: `Returned to ${stageName} for filing`,
      comment: (comments[r.id] || '').trim()
    };
    const updated: Request = {
      ...r,
      currentStage: targetStage,
      activity: Array.isArray(r.activity) ? [...r.activity, entry] : [entry]
    };
    try {
      await upsertRequest(updated as any);
      setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)));
      setComments(prev => ({ ...prev, [r.id]: '' }));
    } catch (error) {
      console.error('Failed to return request:', error);
    }
  };

  const handleExternalUnitChange = (requestId: string, selectedUnit: Unit | undefined) => {
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
      console.error('Failed to load or parse unit sections from localStorage:', error)
    }

    setExternalUnitSections(prev => ({ ...prev, [requestId]: sections }))
    setExternalSection(prev => ({ ...prev, [requestId]: '' }))
  }

  const sendOut = async (r: Request) => {
    const extUnitUic = externalUnitUic[r.id] || ''
    const extUnit = externalUnit[r.id] || ''
    const extSec = externalSection[r.id] || ''

    // external unit validation happens only when not submitting to installation (see else branch)
    const actor = formatActorName(currentUser, 'Battalion')

    let updated: Request;

    if (submitToInstallation[r.id]) {
      const installation = installations.find(inst => {
        const list = (inst as any).unit_uics || (inst as any).unitUics || [];
        return Array.isArray(list) && list.includes(r.unitUic || '');
      });
      if (!installation) {
        alert('The selected unit is not part of any installation.');
        return;
      }
      const actionText = `Sent to installation: ${installation.name}`;
      const newActivity = { actor, timestamp: new Date().toISOString(), action: actionText, comment: (comments[r.id] || '').trim() };
      updated = {
        ...r,
        currentStage: 'INSTALLATION_REVIEW',
        installationId: installation.id,
        externalPendingUnitName: undefined,
        externalPendingUnitUic: undefined,
        externalPendingStage: undefined,
        routeSection: instSection[r.id] || '',
        activity: [...(r.activity || []), newActivity]
      };
    } else if (submitToHQMC[r.id]) {
      const div = hqmcDivisionSel[r.id] || ''
      const branch = hqmcBranchSel[r.id] || ''
      if (!div || !branch) { alert('Select HQMC division and section'); return }
      const actionText = `Sent to HQMC: ${div} - ${branch}`
      const newActivity = { actor, timestamp: new Date().toISOString(), action: actionText, comment: (comments[r.id] || '').trim() }
      updated = {
        ...r,
        routeSection: branch,
        externalPendingUnitName: undefined,
        externalPendingUnitUic: undefined,
        externalPendingStage: undefined,
        activity: [...(r.activity || []), newActivity]
      }
    } else {
      if (!extUnitUic.trim()) {
        alert('Please select an external unit')
        return
      }
      const actionText = extSec ? `Sent to external unit: ${extUnit} - ${extSec}` : `Sent to external unit: ${extUnit}`
      const newActivity = { actor, timestamp: new Date().toISOString(), action: actionText, comment: (comments[r.id] || '').trim() }
      updated = {
        ...r,
        currentStage: 'EXTERNAL_REVIEW',
        externalPendingUnitName: extUnit,
        externalPendingUnitUic: extUnitUic,
        externalPendingStage: extSec || DEFAULT_EXTERNAL_STAGE,
        routeSection: extSec || '',
        activity: [...(r.activity || []), newActivity]
      };
    }

    try {
      await upsertRequest(updated as any)
      setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
      setComments(prev => ({ ...prev, [r.id]: '' }))
      setExternalUnit(prev => ({ ...prev, [r.id]: '' }))
      setExternalUnitUic(prev => ({ ...prev, [r.id]: '' }))
      setExternalSection(prev => ({ ...prev, [r.id]: '' }))
      setSubmitToInstallation(prev => ({ ...prev, [r.id]: false }))
      setSubmitToHQMC(prev => ({ ...prev, [r.id]: false }))
      setSendToExternal(prev => ({ ...prev, [r.id]: false }))
    } catch (error) {
      console.error('Failed to send request to external unit:', error)
      alert('Failed to send request to external unit. Please try again.')
    }
  }

  const externalPending = useMemo(() => {
    const uic = currentUser?.unitUic || ''
    return requests.filter(r => {
      const stage = r.currentStage || ''
      if (stage !== 'EXTERNAL_REVIEW') return false
      const recipientUic = (r.externalPendingUnitUic || r.unitUic || '')
      return (uic ? recipientUic === uic : true)
    })
  }, [requests, currentUser])

  const assignExternalToSection = async (r: Request) => {
    const dest = externalAssignSel[r.id]
    if (!dest) return
    const actor = formatActorName(currentUser, 'Battalion')
    const updated: Request = {
      ...r,
      currentStage: 'BATTALION_REVIEW',
      unitUic: currentUser?.unitUic || r.externalPendingUnitUic || r.unitUic,
      routeSection: dest,
      externalPendingUnitUic: undefined,
      externalPendingUnitName: undefined,
      externalPendingStage: undefined,
      activity: Array.isArray(r.activity) ? [...r.activity, { actor, timestamp: new Date().toISOString(), action: `Battalion assigned external request to section ${dest}` }] : [{ actor, timestamp: new Date().toISOString(), action: `Battalion assigned external request to section ${dest}` }]
    }
    try {
      await upsertRequest(updated as any);
      setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)));
    } catch (error) {
      console.error('Failed to assign external request to section:', error);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-[var(--surface)] rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--text)]">Unit Section Dashboard</h2>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">{selectedBattalionSection || '—'}</span>
            <button className="px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2" onClick={exportAll}>Export All</button>
          </div>
        </div>

        <div className="space-y-8">
          {externalPending.length > 0 && (
            <div className="p-4 border border-brand-gold rounded-lg bg-brand-cream">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-[var(--text)]">Pending Assignment (External Requests)</h3>
                <span className="text-xs px-2 py-1 bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">{externalPending.length} item(s)</span>
              </div>
              <div className="flex flex-col gap-4">
                {externalPending.map(r => (
                  <div key={r.id} className="p-4 border border-brand-navy/20 rounded-lg bg-[var(--surface)] transition-all duration-300">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                      <div>
                        <div className="font-medium text-[var(--text)]">{r.subject}</div>
                        <div className="text-sm text-[var(--muted)]">Submitted {new Date(r.createdAt).toLocaleString()}</div>
                        <div className="text-xs text-[var(--muted)] mt-1">From {r.externalPendingUnitName || 'External Unit'}</div>
                      </div>
                      <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">EXTERNAL_REVIEW</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <label className="text-sm text-[var(--text)]">Assign to Section</label>
                      <select
                        value={externalAssignSel[r.id] || ''}
                        onChange={(e) => setExternalAssignSel(prev => ({ ...prev, [r.id]: e.target.value }))}
                        className="px-3 py-2 border border-brand-navy/30 rounded-lg"
                      >
                        <option value="">Select section</option>
                        {(unitSections[currentUser?.unitUic || ''] || []).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <button
                        className="px-3 py-1 text-xs bg-brand-gold text-brand-charcoal rounded hover:bg-brand-gold-2"
                        disabled={!externalAssignSel[r.id]}
                        onClick={() => assignExternalToSection(r)}
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('Pending')}
                className={`${activeTab === 'Pending' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Pending
              </button>
              <button
                onClick={() => setActiveTab('Previously in Section')}
                className={`${activeTab === 'Previously in Section' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Previously in Section
              </button>
              <button
                onClick={() => setActiveTab('Files')}
                className={`${activeTab === 'Files' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Files ({filedRecordCount})
              </button>
            </nav>
          </div>
          <div className="mt-4">
            {activeTab === 'Pending' && (
              <RequestTable
                title="Pending"
                requests={pendingInSection}
                users={usersById}
                onRowClick={(r) => setExpandedCard(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                expandedRows={expandedCard}
                platoonSectionMap={platoonSectionMap}
              >
                {(r: Request) => (
                  <div id={`details-sec-${r.id}`} className="p-4 bg-gray-50">
                    <div className="mt-3">
                      <button
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
                        aria-expanded={!!expandedDocs[r.id]}
                        aria-controls={`docs-sec-${r.id}`}
                        onClick={() => { setExpandedDocs(prev => ({ ...prev, [r.id]: !prev[r.id] })); setOpenDocsId(prev => (!expandedDocs[r.id] ? r.id : null)) }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedDocs(prev => ({ ...prev, [r.id]: !prev[r.id] })); setOpenDocsId(prev => (!expandedDocs[r.id] ? r.id : null)) } }}
                      >
                        <span>Show Documents</span>
                        <svg width="10" height="10" viewBox="0 0 20 20" className={`transition-transform ${expandedDocs[r.id] ? 'rotate-180' : 'rotate-0'}`} aria-hidden="true"><path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
                      </button>
                    </div>
                    <div
                      id={`docs-sec-${r.id}`}
                      ref={expandedDocs[r.id] ? docsRef : undefined}
                      className={`${expandedDocs[r.id] ? 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-[50vh] opacity-100' : 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-0 opacity-0'}`}
                    >
                      <DocumentList
                        documents={docsFor(r.id).map(d => ({ ...d, fileUrl: (d as any).fileUrl }))}
                      />
                    </div>
                    <div className="mt-3">
                      <button
                        className="px-3 py-1 text-xs rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                        onClick={() => setExpandedLogs(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                        aria-expanded={!!expandedLogs[r.id]}
                        aria-controls={`logs-sec-${r.id}`}
                      >
                        {expandedLogs[r.id] ? 'Hide' : 'Show'} Activity Log
                      </button>
                      <div id={`logs-sec-${r.id}`} className={expandedLogs[r.id] ? 'mt-2 space-y-2' : 'hidden'}>
                        {r.activity && r.activity.length ? (
                          r.activity.map((a, idx) => (
                            <div key={idx} className="text-xs text-gray-700">
                              <div className="font-medium">{a.actor}{a.actorRole ? ` • ${a.actorRole}` : ''} • {new Date(a.timestamp).toLocaleString()} • {a.action}</div>
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
                    <div className="mt-3 flex items-center gap-2">
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

                    {r.currentStage === 'BATTALION_REVIEW' && !hasCommanderApproval(r) && (
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <select
                          value={selectedCmdSection[r.id] || 'COMMANDER'}
                          onChange={e => setSelectedCmdSection(prev => ({...prev, [r.id]: e.target.value}))}
                          className="px-3 py-2 border border-brand-navy/30 rounded-lg"
                        >
                          <option value="COMMANDER">Commander</option>
                          {(commandSections[currentUser?.unitUic || ''] || []).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button
                          className="px-3 py-2 rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                          onClick={() => approveRequest(r)}
                        >
                          Approve
                        </button>
                        <button
                          className="px-3 py-2 rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                          onClick={() => rejectRequest(r)}
                        >
                          Return
                        </button>
                      </div>
                    )}
                    {/* File/Return options after commander approval */}
                    {(isUnitApproved(r) || isUnitEndorsed(r)) && !r.filedAt && (
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                          className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                          onClick={() => openFileDialog(r)}
                        >
                          File
                        </button>
                        {canReturnToLowerLevel(r) && (
                          <button
                            className="px-3 py-2 rounded bg-amber-500 text-white hover:bg-amber-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
                            onClick={() => returnToLowerLevel(r)}
                          >
                            Return
                          </button>
                        )}
                      </div>
                    )}
                    {r.activity?.some(a => /(endorsed by commander|commander.*endorsed)/i.test(String(a.action || ''))) && (
                    <div className="mt-3 p-3 border border-brand-navy/20 rounded-lg bg-brand-cream/30">
                      <label className="block text-sm font-medium text-[var(--text)] mb-2">Send Options</label>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`send-to-external-${r.id}`}
                            checked={sendToExternal[r.id] || false}
                            onChange={() => {
                              const next = !(sendToExternal[r.id] || false)
                              setSendToExternal(prev => ({ ...prev, [r.id]: next }))
                              if (next) { setSubmitToInstallation(prev => ({ ...prev, [r.id]: false })); setSubmitToHQMC(prev => ({ ...prev, [r.id]: false })) }
                            }}
                          />
                          <label htmlFor={`send-to-external-${r.id}`}>Send to External Unit</label>
                          <input
                            type="checkbox"
                            id={`submit-to-installation-${r.id}`}
                            checked={submitToInstallation[r.id] || false}
                            onChange={() => {
                              const next = !(submitToInstallation[r.id] || false)
                              setSubmitToInstallation(prev => ({ ...prev, [r.id]: next }))
                              if (next) { setSendToExternal(prev => ({ ...prev, [r.id]: false })); setSubmitToHQMC(prev => ({ ...prev, [r.id]: false })) }
                            }}
                            disabled={!isUnitInAnyInstallation(r.unitUic)}
                          />
                          <label htmlFor={`submit-to-installation-${r.id}`}>Submit to Installation</label>
                          <input
                            type="checkbox"
                            id={`submit-to-hqmc-${r.id}`}
                            checked={submitToHQMC[r.id] || false}
                            onChange={() => {
                              const next = !(submitToHQMC[r.id] || false)
                              setSubmitToHQMC(prev => ({ ...prev, [r.id]: next }))
                              if (next) { setSendToExternal(prev => ({ ...prev, [r.id]: false })); setSubmitToInstallation(prev => ({ ...prev, [r.id]: false })) }
                            }}
                          />
                          <label htmlFor={`submit-to-hqmc-${r.id}`}>Submit to HQMC</label>
                        </div>

                        {sendToExternal[r.id] && (
                          <>
                            <SearchableUnitSelector
                              onUnitSelect={(unit) => handleExternalUnitChange(r.id, unit)}
                              selectedUnit={UNITS.find(u => u.uic === externalUnitUic[r.id])}
                              placeholder="Search by UIC, RUC, MCC, or Unit Name"
                            />
                            <select
                              value={externalSection[r.id] || ''}
                              onChange={(e) => setExternalSection(prev => ({ ...prev, [r.id]: e.target.value }))}
                              disabled={!externalUnitUic[r.id] || !(externalUnitSections[r.id] || []).length}
                              className="px-3 py-2 border border-brand-navy/30 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="">Select Section/Office (optional)</option>
                              {(externalUnitSections[r.id] || []).map(section => (
                                <option key={section} value={section}>{section}</option>
                              ))}
                            </select>
                          </>
                        )}
                        <div className="flex items-center gap-2">
                          {!isUnitInAnyInstallation(r.unitUic) && (
                            <p className="text-xs text-gray-500">Not assigned to installation.</p>
                          )}
                        </div>
                        {submitToInstallation[r.id] && isUnitInAnyInstallation(r.unitUic) && (
                          <select
                            value={instSection[r.id] || ''}
                            onChange={(e) => setInstSection(prev => ({ ...prev, [r.id]: e.target.value }))}
                            className="px-3 py-2 border border-brand-navy/30 rounded-lg text-sm"
                          >
                            <option value="">Select Installation Section/Office (optional)</option>
                            {(() => {
                              const inst = installations.find(inst => {
                                const list = (inst as any).unit_uics || (inst as any).unitUics || [];
                                return Array.isArray(list) && list.includes(r.unitUic || '')
                              })
                              const secs: string[] = inst?.sections || []
                              return secs.map(section => (
                                <option key={section} value={section}>{section}</option>
                              ))
                            })()}
                          </select>
                        )}
                        {submitToHQMC[r.id] && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <select
                              value={hqmcDivisionSel[r.id] || ''}
                              onChange={(e) => { setHqmcDivisionSel(prev => ({ ...prev, [r.id]: e.target.value })); setHqmcBranchSel(prev => ({ ...prev, [r.id]: '' })) }}
                              className="px-3 py-2 border border-brand-navy/30 rounded-lg text-sm"
                            >
                              <option value="">Select HQMC Division</option>
                              {hqmcDivisions.map(d => (<option key={d.code} value={d.code}>{d.code} — {d.name}</option>))}
                            </select>
                            <select
                              value={hqmcBranchSel[r.id] || ''}
                              onChange={(e) => setHqmcBranchSel(prev => ({ ...prev, [r.id]: e.target.value }))}
                              disabled={!hqmcDivisionSel[r.id]}
                              className="px-3 py-2 border border-brand-navy/30 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="">Select HQMC Section</option>
                              {hqmcStructure.filter(s => String(s.division_code || '') === String(hqmcDivisionSel[r.id] || '')).map(s => (
                                <option key={s.branch} value={s.branch}>{s.branch}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="mt-2">
                          <button
                            className="px-3 py-2 rounded bg-brand-gold text-brand-charcoal hover:bg-brand-gold-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => sendOut(r)}
                            disabled={
                              submitToInstallation[r.id]
                                ? !isUnitInAnyInstallation(r.unitUic)
                                : submitToHQMC[r.id]
                                  ? !(hqmcDivisionSel[r.id] && hqmcBranchSel[r.id])
                                  : !externalUnitUic[r.id]
                            }
                          >
                            {submitToInstallation[r.id] ? 'Submit to Installation' : submitToHQMC[r.id] ? 'Submit to HQMC' : 'Submit to External'}
                          </button>
                        </div>
                      </div>
                    </div>
                    )}
                  </div>
                )}
              </RequestTable>
            )}
            {activeTab === 'Previously in Section' && (
              <RequestTable
                title="Previously in Section"
                requests={previousInSection}
                users={usersById}
                onRowClick={(r) => setExpandedCard(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                expandedRows={expandedCard}
                platoonSectionMap={platoonSectionMap}
              >
                {(r: Request) => (
                  <div id={`details-sec-${r.id}`} className="p-4 bg-gray-50">
                    <div className="mt-3">
                      <button
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
                        aria-expanded={!!expandedDocs[r.id]}
                        aria-controls={`docs-sec-${r.id}`}
                        onClick={() => { setExpandedDocs(prev => ({ ...prev, [r.id]: !prev[r.id] })); setOpenDocsId(prev => (!expandedDocs[r.id] ? r.id : null)) }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedDocs(prev => ({ ...prev, [r.id]: !prev[r.id] })); setOpenDocsId(prev => (!expandedDocs[r.id] ? r.id : null)) } }}
                      >
                        <span>Show Documents</span>
                        <svg width="10" height="10" viewBox="0 0 20 20" className={`transition-transform ${expandedDocs[r.id] ? 'rotate-180' : 'rotate-0'}`} aria-hidden="true"><path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
                      </button>
                    </div>
                    <div
                      id={`docs-sec-${r.id}`}
                      ref={expandedDocs[r.id] ? docsRef : undefined}
                      className={`${expandedDocs[r.id] ? 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-[50vh] opacity-100' : 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-0 opacity-0'}`}
                    >
                      <DocumentList
                        documents={docsFor(r.id).map(d => ({ ...d, fileUrl: (d as any).fileUrl }))}
                      />
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
                    {filesSearchQuery ? 'No records match your search.' : 'No filed records in this section.'}
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
        </div>
      </div>

      {/* File Dialog - Date Picker for Finalized Date */}
      {showFileDialog && fileDialogRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" onClick={() => setShowFileDialog(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">File for Records Management</h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowFileDialog(false)}>✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Finalized</label>
                <input
                  type="date"
                  value={fileFinalizedDate}
                  onChange={(e) => setFileFinalizedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This date will be used to calculate the disposal date based on the retention schedule.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="font-medium text-gray-700 mb-1">Retention Info</div>
                <div className="text-gray-600">
                  <div>SSIC: {fileDialogRequest.ssic} - {fileDialogRequest.ssicNomenclature}</div>
                  <div>Retention: {fileDialogRequest.isPermanent ? 'Permanent' : `${fileDialogRequest.retentionValue} ${fileDialogRequest.retentionUnit}`}</div>
                  <div>Cutoff: {fileDialogRequest.cutoffDescription || fileDialogRequest.cutoffTrigger}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFileDialog(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmFileRequest}
                disabled={!fileFinalizedDate}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                File Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
