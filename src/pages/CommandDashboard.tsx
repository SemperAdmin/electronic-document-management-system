import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { loadUnitStructureFromBundle } from '@/lib/unitStructure'
import { listRequestsLegacy, listDocumentsLegacy, listUsersLegacy, upsertRequest, upsertDocuments, listInstallationsLegacy } from '@/lib/db'
import RequestTable from '../components/RequestTable'
import { Request, DocumentItem } from '../types'
import { UNITS } from '../lib/units'
import CommanderRequestDetails from '../components/CommanderRequestDetails'
import CommandSectionRequestDetails from '../components/CommandSectionRequestDetails'
import { DocumentList, useToast } from '@/components/common'

export default function CommandDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [users, setUsers] = useState<Record<string, any>>({})
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})
  const [commandSections, setCommandSections] = useState<string[]>([])
  const [comments, setComments] = useState<Record<string, string>>({})
  const [attach, setAttach] = useState<Record<string, File[]>>({})
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({})
  const [expandedUserDetails, setExpandedUserDetails] = useState<Record<string, boolean>>({})
  const [openDocsId, setOpenDocsId] = useState<string | null>(null)
  const docsRef = useRef<HTMLDivElement | null>(null)
  const [platoonSectionMap, setPlatoonSectionMap] = useState<Record<string, Record<string, Record<string, string>>>>({})
  const [selectedCommandSection, setSelectedCommandSection] = useState<Record<string, string>>({})
  const [installation, setInstallation] = useState<any | null>(null)
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'Pending' | 'Files'>('Pending')
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
  const [expandedCard, setExpandedCard] = useState<Record<string, boolean>>({})

  const ORIGINATOR_STAGE = 'ORIGINATOR_REVIEW'
  const STAGES = ['PLATOON_REVIEW', 'COMPANY_REVIEW', 'BATTALION_REVIEW', 'COMMANDER_REVIEW', 'ARCHIVED']
  const nextStage = (stage?: string) => {
    const i = STAGES.indexOf(stage || STAGES[0])
    return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : STAGES[i] || STAGES[0]
  }
  const prevStage = (stage?: string) => {
    const i = STAGES.indexOf(stage || STAGES[0])
    return i > 0 ? STAGES[i - 1] : STAGES[0]
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem('currentUser')
      if (raw) {
        const parsed = JSON.parse(raw)
        setCurrentUser(parsed)
      }
    } catch {
      // Failed to load currentUser from localStorage
    }
  }, [])

  useEffect(() => {
    if (!currentUser?.installationId) return
    listInstallationsLegacy().then((all) => {
      const target = (all as any[]).find(i => i.id === currentUser.installationId)
      setInstallation(target || null)
    }).catch(() => setInstallation(null))
  }, [currentUser])

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
      const map: Record<string, any> = {}
      for (const u of (remote as any)) if (u?.id) map[u.id] = u
      setUsers(map)
    }).catch(() => setUsers({}))
  }, [])

  // Get current user's UIC with fallback
  const getCurrentUserUic = (): string => {
    if (currentUser?.unitUic) return currentUser.unitUic
    if (currentUser?.unit) {
      const foundUnit = UNITS.find(u => u.unitName === currentUser.unit)
      if (foundUnit) return foundUnit.uic
    }
    return ''
  }

  useEffect(() => {
    try {
      const rawUs = localStorage.getItem('unit_structure')
      const cuic = getCurrentUserUic()

      if (!cuic) return

      const allSections: string[] = []
      const pMap: Record<string, Record<string, Record<string, string>>> = {}

      if (rawUs) {
        const parsed = JSON.parse(rawUs)

        // Load command sections only for current user's unit
        const v = parsed?.[cuic]
        if (v && Array.isArray(v._commandSections)) {
          allSections.push(...v._commandSections)
        }

        // Load platoon section maps for all units
        for (const key of Object.keys(parsed || {})) {
          const node = parsed[key]
          if (node && node._platoonSectionMap && typeof node._platoonSectionMap === 'object') {
            pMap[key] = node._platoonSectionMap
          }
        }

        setCommandSections(allSections)
        setPlatoonSectionMap(pMap)
      } else {
        ;(async () => {
          try {
            const merged = await loadUnitStructureFromBundle()
            const bundleSec: string[] = []
            const bundlePMap: Record<string, Record<string, Record<string, string>>> = {}

            // Load command sections only for current user's unit
            const v = (merged as any)?.[cuic]
            if (v && Array.isArray(v._commandSections)) {
              bundleSec.push(...v._commandSections)
            }

            // Load platoon section maps
            for (const key of Object.keys(merged || {})) {
              const node = (merged as any)[key]
              if (node && node._platoonSectionMap && typeof node._platoonSectionMap === 'object') {
                bundlePMap[key] = node._platoonSectionMap
              }
            }

            setCommandSections(bundleSec)
            setPlatoonSectionMap(bundlePMap)
          } catch {
            // Failed to load from bundle
          }
        })()
      }
    } catch {
      // Error loading unit structure
    }
  }, [currentUser])

  const docsFor = (reqId: string) => documents.filter(d => d.requestId === reqId)
  const originatorFor = (r: Request) => users[r.uploadedById] || null

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

  const battalionSectionFor = (r: Request) => {
    // When at COMMANDER_REVIEW, routeSection is the command section, not the battalion section
    // We need to look at activity log to find the battalion section that last processed this request
    const normCommandSections = commandSections.map(s => String(s || '').trim().toUpperCase())

    // Check activity log for the last battalion section (before command review)
    if (r.activity && r.activity.length) {
      // Look backwards through activity for a fromSection that was a battalion section
      for (let i = r.activity.length - 1; i >= 0; i--) {
        const entry = r.activity[i]
        const fromSec = String(entry.fromSection || '').trim()
        const normFromSec = fromSec.toUpperCase()

        // If fromSection is not a command section and not "Commander", it's likely the battalion section
        if (fromSec && !normCommandSections.includes(normFromSec) && normFromSec !== 'COMMANDER') {
          return fromSec
        }

        // Also check toSection for when it went TO battalion
        const toSec = String(entry.toSection || '').trim()
        const normToSec = toSec.toUpperCase()
        if (toSec && !normCommandSections.includes(normToSec) && normToSec !== 'COMMANDER' && /battalion|section/i.test(String(entry.action || ''))) {
          return toSec
        }
      }
    }

    // Fallback: If current routeSection is NOT a command section, use it
    if (r.routeSection) {
      const normRouteSec = String(r.routeSection || '').trim().toUpperCase()
      if (!normCommandSections.includes(normRouteSec)) {
        return r.routeSection
      }
    }

    // Last fallback: use platoon-section mapping
    const ouic = r.unitUic || ''
    const o = originatorFor(r)
    const oc = (o?.company && o.company !== 'N/A') ? o.company : ''
    const ou = (o?.unit && o.unit !== 'N/A') ? o.unit : ''
    return platoonSectionMap[ouic]?.[oc]?.[ou] || ''
  }

  const inCommander = useMemo(() => {
    const cuic = getCurrentUserUic()
    return requests.filter(r => {
      const stage = r.currentStage || ''
      const ouic = r.unitUic || ''
      return stage === 'COMMANDER_REVIEW' && (!r.routeSection || r.routeSection === '') && (cuic ? ouic === cuic : true)
    })
  }, [requests, currentUser, getCurrentUserUic])

  const inInstallationCommander = useMemo(() => {
    const iid = currentUser?.installationId || ''
    return requests.filter(r => {
      const stage = r.currentStage || ''
      return stage === 'INSTALLATION_REVIEW' && (!r.routeSection || r.routeSection === '') && (iid ? r.installationId === iid : true)
    })
  }, [requests, currentUser])

  const byCommandSection = useMemo(() => {
    const cuic = getCurrentUserUic()
    const result: Record<string, Request[]> = {}
    const normalize = (s: string) => String(s || '').trim().toUpperCase()
    const normSections = commandSections.map(s => normalize(s))

    // Initialize with known command sections
    for (const name of commandSections) result[name] = []

    for (const r of requests) {
      const stage = r.currentStage || ''
      const ouic = r.unitUic || ''
      const routeSec = r.routeSection || ''
      const normRouteSec = normalize(routeSec)

      if (stage === 'COMMANDER_REVIEW' && routeSec && (cuic ? ouic === cuic : true)) {
        const idx = normSections.indexOf(normRouteSec)
        const sectionKey = idx >= 0 ? commandSections[idx] : routeSec

        if (!result[sectionKey]) {
          result[sectionKey] = []
        }
        result[sectionKey].push(r)
      }
    }
    return result
  }, [requests, commandSections, currentUser, getCurrentUserUic])

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
    const cuic = getCurrentUserUic()
    let records = requests.filter(r => {
      if (!r.filedAt) return false
      if (cuic && r.unitUic !== cuic) return false
      return true
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
  }, [requests, currentUser, filesSearchQuery, getDisposalYear, getCurrentUserUic])

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

  const isReturned = (r: Request) => {
    const a = r.activity && r.activity.length ? r.activity[r.activity.length - 1] : null
    return !!a && /returned/i.test(String(a.action || ''))
  }

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
      const origin = o ? `${o.rank} ${o.lastName}, ${o.firstName}${o.mi ? ` ${o.mi}` : ''}` : ''
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
  const exportCommander = () => downloadCsv('commander.csv', buildRows(inCommander))
  const exportSection = (name: string) => downloadCsv(`${name}.csv`, buildRows(byCommandSection[name] || []))
  const exportAll = () => downloadCsv('command_all.csv', buildRows([...inCommander, ...commandSections.flatMap(n => byCommandSection[n] || [])]))

  const updateRequest = async (r: Request, newStage: string, action: string) => {
    const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}` : 'Reviewer'
    const entry = { actor, timestamp: new Date().toISOString(), action, comment: (comments[r.id] || '').trim() }
    const updated: Request = {
      ...r,
      currentStage: newStage,
      activity: [...(r.activity || []), entry]
    }
    try {
      await upsertRequest(updated as any)
      setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
      setComments(prev => ({ ...prev, [r.id]: '' }))
    } catch (error) {
      console.error('Failed to update request:', error)
      toast.error('Failed to update request')
    }
  }

  const approveToCommander = async (r: Request) => {
    const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}` : 'Reviewer'
    const prevSec = r.routeSection || ''
    const entry = { actor, timestamp: new Date().toISOString(), action: 'Approved and routed to COMMANDER', comment: (comments[r.id] || '').trim(), fromSection: prevSec || undefined, toSection: 'Commander' }
    const updated: Request = {
      ...r,
      currentStage: 'COMMANDER_REVIEW',
      routeSection: '',
      activity: [...(r.activity || []), entry]
    }
    try {
      await upsertRequest(updated as any)
      setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
      setComments(prev => ({ ...prev, [r.id]: '' }))
    } catch (error) {
      console.error('Failed to approve request to commander:', error)
      toast.error('Failed to approve request to commander')
    }
  }

  const sendToCommandSection = async (r: Request) => {
    const cmdSection = selectedCommandSection[r.id] || ''
    if (!cmdSection || cmdSection === 'NONE') return

    const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}` : 'Commander'
    const actionText = `Sent to ${cmdSection} for review by Commander`

    const updated: Request = {
      ...r,
      currentStage: 'COMMANDER_REVIEW',
      routeSection: cmdSection,
      activity: [...(r.activity || []), { actor, timestamp: new Date().toISOString(), action: actionText, comment: (comments[r.id] || '').trim(), fromSection: 'Commander', toSection: cmdSection }]
    }

    try {
      await upsertRequest(updated as any);
      setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)));
      setComments(prev => ({ ...prev, [r.id]: '' }));
      setSelectedCommandSection(prev => ({ ...prev, [r.id]: '' }));
    } catch (error) {
      console.error('Failed to send to command section:', error);
      toast.error('Failed to send to command section')
    }
  }

  const commanderDecision = async (r: Request, type: 'Approved' | 'Endorsed' | 'Rejected') => {
    const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}` : 'Commander'
    const dest = battalionSectionFor(r)
    const actionText = type === 'Approved' ? 'Approved by Commander'
      : type === 'Endorsed' ? 'Endorsed by Commander'
      : 'Rejected by Commander — requires action'

    // All commander decisions route back to BATTALION_REVIEW
    // Battalion staff then handles next steps: archive, return to company, send externally, etc.
    const updated: Request = {
      ...r,
      currentStage: 'BATTALION_REVIEW',
      routeSection: dest || r.routeSection || '',
      commanderApprovalDate: type === 'Approved' ? new Date().toISOString() : r.commanderApprovalDate,
      activity: [...(r.activity || []), { actor, timestamp: new Date().toISOString(), action: actionText, comment: (comments[r.id] || '').trim(), fromSection: 'Commander', toSection: dest || r.routeSection || undefined }]
    }

    try {
      await upsertRequest(updated as any);
      setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)));
      setComments(prev => ({ ...prev, [r.id]: '' }));
      setSelectedCommandSection(prev => ({ ...prev, [r.id]: '' }));
    } catch (error) {
      console.error('Failed to make commander decision:', error)
      toast.error('Failed to record commander decision')
    }
  }

  const commanderArchive = async (r: Request) => {
    const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}` : 'Commander'
    const entry = { actor, timestamp: new Date().toISOString(), action: 'Archived by Commander', comment: (comments[r.id] || '').trim() }
    const updated: Request = {
      ...r,
      currentStage: 'ARCHIVED',
      finalStatus: 'Archived',
      activity: [...(r.activity || []), entry]
    }
    try {
      await upsertRequest(updated as any)
      setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
      setComments(prev => ({ ...prev, [r.id]: '' }))
      setSelectedCommandSection(prev => ({ ...prev, [r.id]: '' }))
    } catch (error) {
      console.error('Failed to archive request:', error)
      toast.error('Failed to archive request')
    }
  }

  const commanderReturn = async (r: Request) => {
    const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}` : 'Commander'
    const dest = battalionSectionFor(r)
    const entry = { actor, timestamp: new Date().toISOString(), action: `Returned to ${dest || 'Battalion'} by Commander`, comment: (comments[r.id] || '').trim(), fromSection: 'Commander', toSection: dest || r.routeSection || undefined }
    const updated: Request = {
      ...r,
      currentStage: 'BATTALION_REVIEW',
      routeSection: dest || r.routeSection || '',
      activity: [...(r.activity || []), entry]
    }
    try {
      await upsertRequest(updated as any)
      setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
      setComments(prev => ({ ...prev, [r.id]: '' }))
      setSelectedCommandSection(prev => ({ ...prev, [r.id]: '' }))
    } catch (error) {
      console.error('Failed to return request:', error)
      toast.error('Failed to return request')
    }
  }

  const commandSectionReturn = async (r: Request) => {
    const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}` : 'Command Section'
    const dest = battalionSectionFor(r)
    const prevSec = r.routeSection || ''
    const actionText = `Returned to ${dest || 'Battalion'} by ${prevSec || 'Command Section'}`
    const entry = { actor, timestamp: new Date().toISOString(), action: actionText, comment: (comments[r.id] || '').trim(), fromSection: prevSec || undefined, toSection: dest || undefined }

    const updated: Request = {
      ...r,
      currentStage: 'BATTALION_REVIEW',
      routeSection: dest || r.routeSection || '',
      activity: [...(r.activity || []), entry]
    }

    try {
      await upsertRequest(updated as any);
      setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)));
      setComments(prev => ({ ...prev, [r.id]: '' }));
    } catch (error) {
      console.error('Failed to return from command section:', error)
      toast.error('Failed to return from command section')
    }
  }

  const routeToCommandSection = async (r: Request, targetSection: string) => {
    if (!targetSection) return
    const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}` : 'Command Section'
    const prevSec = r.routeSection || ''
    const actionText = `Routed to ${targetSection} by ${prevSec || 'Command Section'}`
    const entry = { actor, timestamp: new Date().toISOString(), action: actionText, comment: (comments[r.id] || '').trim(), fromSection: prevSec || undefined, toSection: targetSection }

    const updated: Request = {
      ...r,
      currentStage: 'COMMANDER_REVIEW',
      routeSection: targetSection,
      activity: [...(r.activity || []), entry]
    }

    try {
      await upsertRequest(updated as any)
      setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
      setComments(prev => ({ ...prev, [r.id]: '' }))
      setSelectedCommandSection(prev => ({ ...prev, [r.id]: '' }))
      toast.success(`Routed to ${targetSection}`)
    } catch (error) {
      console.error('Failed to route to command section:', error)
      toast.error('Failed to route to command section')
    }
  }

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
      // @ts-ignore
      fileUrl: URL.createObjectURL(file)
    })) as any

    const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}` : 'Reviewer'
    const entry = { actor, timestamp: new Date().toISOString(), action: `Reviewer added ${newDocs.length} document(s)`, comment: (comments[r.id] || '').trim() }

    const updated: Request = {
      ...r,
      documentIds: [...(r.documentIds || []), ...newDocs.map(d => d.id)],
      activity: [...(r.activity || []), entry]
    }
    try {
      await upsertDocuments(newDocs as any)
      await upsertRequest(updated as any)
      setDocuments(prev => [...prev, ...newDocs])
      setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
      setAttach(prev => ({ ...prev, [r.id]: [] }))
      setComments(prev => ({ ...prev, [r.id]: '' }))
    } catch (error) {
      console.error('Failed to add files to request:', error);
      toast.error('Failed to add files to request')
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-[var(--surface)] rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--text)]">Unit Command Dashboard</h2>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">{currentUser?.unitUic || ''}</span>
            <button className="px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2 hidden md:block" onClick={exportAll}>Export All</button>
          </div>
        </div>

        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('Pending')}
              className={`${activeTab === 'Pending' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Pending
            </button>
            <button
              onClick={() => setActiveTab('Files')}
              className={`${activeTab === 'Files' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Files ({filedRecordCount})
            </button>
          </nav>
        </div>

        {activeTab === 'Pending' && (
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-[var(--text)]">Commander</h3>
              <button className="px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2 hidden md:block" onClick={exportCommander}>Export Commander</button>
            </div>
            <div className="mt-4">
              <RequestTable
                  title="Pending"
                  requests={inCommander.filter(r => r.currentStage !== 'ARCHIVED')}
                  users={users}
                  onRowClick={(r) => setExpandedCard(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                  expandedRows={expandedCard}
                  platoonSectionMap={platoonSectionMap}
                >
                  {(r: Request) => (
                    <CommanderRequestDetails
                      r={r}
                      docsFor={docsFor}
                      expandedDocs={expandedDocs}
                      setExpandedDocs={setExpandedDocs}
                      setOpenDocsId={setOpenDocsId}
                      docsRef={docsRef}
                      comments={comments}
                      setComments={setComments}
                      attach={attach}
                      setAttach={setAttach}
                      addFilesToRequest={addFilesToRequest}
                      selectedCommandSection={selectedCommandSection}
                      setSelectedCommandSection={setSelectedCommandSection}
                      commandSections={commandSections}
                      sendToCommandSection={sendToCommandSection}
                      commanderDecision={commanderDecision}
                      expandedLogs={expandedLogs}
                      setExpandedLogs={setExpandedLogs}
                    />
                  )}
                </RequestTable>
            </div>
          </div>

          {/* Show all command sections, even if they have no items */}
          {commandSections.map((name) => {
            const pending = (byCommandSection[name] || []).filter(r => r.currentStage !== 'ARCHIVED');
            const archived = (byCommandSection[name] || []).filter(r => r.currentStage === 'ARCHIVED');

            return (
              <div key={name}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-[var(--text)]">{name}</h3>
                  <button className="px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2 hidden md:block" onClick={() => exportSection(name)}>Export {name}</button>
                </div>
                {/* Always show Pending section, even if empty */}
                <div className="mt-4">
                  <RequestTable
                    title="Pending"
                    requests={pending}
                    users={users}
                    onRowClick={(r) => setExpandedCard(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                    expandedRows={expandedCard}
                    platoonSectionMap={platoonSectionMap}
                  >
                    {(r: Request) => (
                      <CommandSectionRequestDetails
                        r={r}
                        docsFor={docsFor}
                        comments={comments}
                        setComments={setComments}
                        attach={attach}
                        setAttach={setAttach}
                        addFilesToRequest={addFilesToRequest}
                        approveToCommander={approveToCommander}
                        commandSectionReturn={commandSectionReturn}
                        commandSections={commandSections}
                        selectedCommandSection={selectedCommandSection}
                        setSelectedCommandSection={setSelectedCommandSection}
                        routeToCommandSection={routeToCommandSection}
                      />
                    )}
                  </RequestTable>
                </div>
                {archived.length > 0 && (
                  <div className="mt-4">
                    <RequestTable
                      title="Archived"
                      requests={archived}
                      users={users}
                      onRowClick={(r) => setExpandedCard(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                      expandedRows={expandedCard}
                      platoonSectionMap={platoonSectionMap}
                    >
                      {(r: Request) => (
                        <div id={`details-csec-archived-${r.id}`} className="p-4 bg-gray-50 space-y-3">
                          <div>
                            <h4 className="font-medium text-gray-800">Final Status: {r.finalStatus || 'Archived'}</h4>
                            <p className="text-sm text-gray-600">This request is archived and cannot be modified.</p>
                          </div>

                          <div>
                            <button
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
                              aria-expanded={!!expandedDocs[r.id]}
                              aria-controls={`docs-csec-archived-${r.id}`}
                              onClick={() => { setExpandedDocs(prev => ({ ...prev, [r.id]: !prev[r.id] })); setOpenDocsId(prev => (!expandedDocs[r.id] ? r.id : null)) }}
                            >
                              Show Documents
                            </button>
                            <div
                              id={`docs-csec-archived-${r.id}`}
                              className={`${expandedDocs[r.id] ? 'mt-2 space-y-2' : 'hidden'}`}
                            >
                              <DocumentList
                                documents={docsFor(r.id).map(d => ({ ...d, fileUrl: (d as any).fileUrl }))}
                              />
                            </div>
                          </div>

                          <div>
                            <button
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
                              aria-expanded={!!expandedLogs[r.id]}
                              aria-controls={`logs-csec-archived-${r.id}`}
                              onClick={() => setExpandedLogs(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                            >
                              {expandedLogs[r.id] ? 'Hide' : 'Show'} Full Activity Log
                            </button>
                            <div id={`logs-csec-archived-${r.id}`} className={expandedLogs[r.id] ? 'mt-2 space-y-2' : 'hidden'}>
                              {r.activity && r.activity.length ? (
                                r.activity.map((a, idx) => (
                                  <div key={idx} className="text-xs text-gray-700">
                                    <div className="font-medium">{a.actor} • {new Date(a.timestamp).toLocaleString()} • {a.action}</div>
                                    {a.comment && <div className="text-gray-600 pl-4 border-l-2 border-gray-300 ml-2">{a.comment}</div>}
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs text-gray-500">No activity to display.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </RequestTable>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
  )
}
