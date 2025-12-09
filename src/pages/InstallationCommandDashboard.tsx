import React, { useEffect, useMemo, useState } from 'react'
import { listInstallations, listRequests, listUsers, listDocuments, upsertDocuments, upsertRequest, listHQMCDivisions, listHQMCStructure } from '@/lib/db'
import type { DocumentRecord } from '@/lib/db'
import { SearchableUnitSelector } from '@/components/SearchableUnitSelector'
import RequestTable from '@/components/RequestTable'
import { Request } from '@/types'

export default function InstallationCommandDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [expandedCard, setExpandedCard] = useState<Record<string, boolean>>({})
  const [install, setInstall] = useState<any | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'Pending' | 'Previously in Command Section'>('Pending')
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [comments, setComments] = useState<Record<string, string>>({})
  const [attach, setAttach] = useState<Record<string, File[]>>({})
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({})
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})
  const [openDocsId, setOpenDocsId] = useState<string | null>(null)
  const docsRef = React.useRef<HTMLDivElement>(null)
  const [selectedCmdCommander, setSelectedCmdCommander] = useState<Record<string, string>>({})
  const [nextInstSection, setNextInstSection] = useState<Record<string, string>>({})
  const [externalUnitUic, setExternalUnitUic] = useState<Record<string, string>>({})
  const [externalUnit, setExternalUnit] = useState<Record<string, string>>({})
  const [externalUnitSections, setExternalUnitSections] = useState<Record<string, string[]>>({})
  const [externalSection, setExternalSection] = useState<Record<string, string>>({})
  const [sendToExternalCmd, setSendToExternalCmd] = useState<Record<string, boolean>>({})
  const [submitToHQMCCmd, setSubmitToHQMCCmd] = useState<Record<string, boolean>>({})
  const [hqmcDivisions, setHqmcDivisions] = useState<Array<{ id: string; name: string; code: string }>>([])
  const [hqmcStructure, setHqmcStructure] = useState<Array<{ division_name: string; division_code?: string; branch: string; description?: string }>>([])
  const [hqmcDivisionSelCmd, setHqmcDivisionSelCmd] = useState<Record<string, string>>({})
  const [hqmcBranchSelCmd, setHqmcBranchSelCmd] = useState<Record<string, string>>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem('currentUser')
      if (raw) setCurrentUser(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    listRequests().then((rs) => setRequests(rs as any)).catch(() => setRequests([]))
    listDocuments().then((ds) => setDocuments(ds as any)).catch(() => setDocuments([]))
  }, [])

  useEffect(() => {
    if (!currentUser?.installationId) return
    listInstallations().then((all) => {
      const target = (all as any[]).find(i => i.id === currentUser.installationId)
      setInstall(target || null)
    }).catch(() => setInstall(null))
    listUsers().then((u) => setUsers(u as any)).catch(() => setUsers([]))
  }, [currentUser])

  useEffect(() => {
    listHQMCDivisions().then(setHqmcDivisions).catch(() => setHqmcDivisions([]))
    listHQMCStructure().then(setHqmcStructure).catch(() => setHqmcStructure([]))
  }, [])

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
      alert('Failed to save files')
    }
  }

  const sendToInstallationCommander = async (r: Request) => {
    const actor = `${currentUser?.rank || ''} ${currentUser?.lastName || ''}, ${currentUser?.firstName || ''}`.trim() || 'Installation Command Section'
    const entry = { actor, timestamp: new Date().toISOString(), action: 'Sent to Installation Commander', comment: (comments[r.id] || '').trim() }
    const updated: any = { ...r, routeSection: '', activity: [...(r.activity || []), entry] }
    try {
      await upsertRequest(updated)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
      setComments(prev => ({ ...prev, [r.id]: '' }))
    } catch (e) {
      console.error('Failed to send to installation commander:', e)
      alert('Failed to send to installation commander')
    }
  }

  const returnToInstallationSection = async (r: Request) => {
    const actor = `${currentUser?.rank || ''} ${currentUser?.lastName || ''}, ${currentUser?.firstName || ''}`.trim() || 'Installation Command Section'
    // Try to extract previous section from activity entry
    const lastRoute = (r.activity || []).slice().reverse().find(a => /Routed to installation command section/i.test(String(a.action || '')))
    let prevSec = ''
    if (lastRoute) {
      const m = String(lastRoute.action || '').match(/\(from\s+(.+?)\)/i)
      if (m) prevSec = m[1]
    }
    const entry = { actor, timestamp: new Date().toISOString(), action: `Returned to installation section${prevSec ? `: ${prevSec}` : ''}`, comment: (comments[r.id] || '').trim() }
    const updated: any = { ...r, routeSection: prevSec, activity: [...(r.activity || []), entry] }
    try {
      await upsertRequest(updated)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
      setComments(prev => ({ ...prev, [r.id]: '' }))
    } catch (e) {
      console.error('Failed to return to installation section:', e)
      alert('Failed to return to installation section')
    }
  }

  const routeToInstallationSection = async (r: Request) => {
    const sec = nextInstSection[r.id] || ''
    if (!sec.trim()) return
    const actor = `${currentUser?.rank || ''} ${currentUser?.lastName || ''}, ${currentUser?.firstName || ''}`.trim() || 'Installation Commander'
    const entry = { actor, timestamp: new Date().toISOString(), action: `Sent to installation section: ${sec}`, comment: (comments[r.id] || '').trim() }
    const updated: any = { ...r, currentStage: 'INSTALLATION_REVIEW', routeSection: sec, activity: [...(r.activity || []), entry] }
    try {
      await upsertRequest(updated)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
      setComments(prev => ({ ...prev, [r.id]: '' }))
      setNextInstSection(prev => ({ ...prev, [r.id]: '' }))
    } catch (e) {
      console.error('Failed to route to installation section:', e)
      alert('Failed to route to installation section')
    }
  }

  const routeToInstallationCommandFromCommander = async (r: Request) => {
    const sec = selectedCmdCommander[r.id] || ''
    if (!sec.trim()) return
    const actor = `${currentUser?.rank || ''} ${currentUser?.lastName || ''}, ${currentUser?.firstName || ''}`.trim() || 'Installation Commander'
    const entry = { actor, timestamp: new Date().toISOString(), action: `Sent to installation command section: ${sec}`, comment: (comments[r.id] || '').trim() }
    const updated: any = { ...r, routeSection: sec, activity: [...(r.activity || []), entry] }
    try {
      await upsertRequest(updated)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
      setComments(prev => ({ ...prev, [r.id]: '' }))
      setSelectedCmdCommander(prev => ({ ...prev, [r.id]: '' }))
    } catch (e) {
      console.error('Failed to route to installation command section:', e)
      alert('Failed to route to installation command section')
    }
  }

  const installationCommanderDecision = async (r: Request, type: 'Approved' | 'Endorsed' | 'Rejected') => {
    const actor = `${currentUser?.rank || ''} ${currentUser?.lastName || ''}, ${currentUser?.firstName || ''}`.trim() || 'Installation Commander'
    const actionText = type === 'Approved' ? 'Approved by Installation Commander'
      : type === 'Endorsed' ? 'Endorsed by Installation Commander'
      : 'Rejected by Installation Commander — requires action'

    let updated: any = { ...r }
    const decisionEntry = { actor, timestamp: new Date().toISOString(), action: actionText, comment: (comments[r.id] || '').trim() }

    if (type === 'Rejected') {
      const prevSec = getPreviousInstallSection(r)
      updated = {
        ...r,
        currentStage: 'INSTALLATION_REVIEW',
        finalStatus: undefined,
        routeSection: prevSec,
        activity: [...(r.activity || []), decisionEntry, { actor, timestamp: new Date().toISOString(), action: prevSec ? `Returned to installation section: ${prevSec}` : 'Returned to installation commander' }]
      }
    } else {
      if (type === 'Approved') {
        const sec = selectedCmdCommander[r.id] || ''
        if (!sec.trim()) { alert('Select a command section to send to'); return }
        updated = {
          ...r,
          currentStage: 'INSTALLATION_REVIEW',
          routeSection: sec,
          activity: [...(r.activity || []), decisionEntry, { actor, timestamp: new Date().toISOString(), action: `Sent to installation section: ${sec}` }]
        }
      } else {
        const prevSec = getPreviousInstallSection(r)
        updated = {
          ...r,
          currentStage: 'INSTALLATION_REVIEW',
          routeSection: prevSec,
          activity: [...(r.activity || []), decisionEntry, { actor, timestamp: new Date().toISOString(), action: prevSec ? `Sent to installation section: ${prevSec}` : 'Returned to installation commander' }]
        }
      }
    }

    try {
      await upsertRequest(updated)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
      setComments(prev => ({ ...prev, [r.id]: '' }))
    } catch (e) {
      console.error('Failed to record installation commander decision:', e)
      alert('Failed to record decision')
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
      console.error('InstallationCommandDashboard - Failed to load unit sections from localStorage:', error)
    }
    setExternalUnitSections(prev => ({ ...prev, [requestId]: sections }))
    setExternalSection(prev => ({ ...prev, [requestId]: '' }))
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

  const getPreviousInstallSection = (r: Request) => {
    const acts = (r.activity || []).slice().reverse()
    for (const a of acts) {
      const s = String(a.action || '')
      const m = s.match(/Sent to installation section:\s*(.+)/i) || s.match(/Restored to installation section:\s*(.+)/i) || s.match(/Returned to installation section:\s*(.+)/i)
      if (m) return m[1].trim()
    }
    return ''
  }

  const restoreToInstallationSection = async (r: Request, sec?: string) => {
    const actor = `${currentUser?.rank || ''} ${currentUser?.lastName || ''}, ${currentUser?.firstName || ''}`.trim() || 'Installation Commander'
    const targetSec = (sec || '').trim() || getPreviousInstallSection(r)
    const entry = { actor, timestamp: new Date().toISOString(), action: `Restored to installation section${targetSec ? `: ${targetSec}` : ''}` }
    const updated: any = {
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
      alert('Failed to restore to installation section')
    }
  }

  const sendOutFromCmdSection = async (r: Request) => {
    const actor = `${currentUser?.rank || ''} ${currentUser?.lastName || ''}, ${currentUser?.firstName || ''}`.trim() || 'Installation Command Section'
    let updated: any = { ...r }
    if (submitToHQMCCmd[r.id]) {
      const div = hqmcDivisionSelCmd[r.id] || ''
      const branch = hqmcBranchSelCmd[r.id] || ''
      if (!div || !branch) { alert('Select HQMC division and section'); return }
      const entry = { actor, timestamp: new Date().toISOString(), action: `Sent to HQMC: ${div} - ${branch}`, comment: (comments[r.id] || '').trim() }
      updated = { ...r, routeSection: branch, activity: [...(r.activity || []), entry] }
    } else if (sendToExternalCmd[r.id]) {
      const extUnitUicVal = externalUnitUic[r.id] || ''
      const extUnitVal = externalUnit[r.id] || ''
      const extSecVal = externalSection[r.id] || ''
      if (!extUnitUicVal.trim()) { alert('Please select an external unit'); return }
      const entry = { actor, timestamp: new Date().toISOString(), action: extSecVal ? `Sent to external unit: ${extUnitVal} - ${extSecVal}` : `Sent to external unit: ${extUnitVal}`, comment: (comments[r.id] || '').trim() }
      updated = {
        ...r,
        currentStage: 'EXTERNAL_REVIEW',
        externalPendingUnitName: extUnitVal,
        externalPendingUnitUic: extUnitUicVal,
        externalPendingStage: extSecVal || undefined,
        routeSection: extSecVal || '',
        activity: [...(r.activity || []), entry]
      }
    } else {
      alert('Select an option: External Unit or Submit to HQMC')
      return
    }
    try {
      await upsertRequest(updated)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
      setComments(prev => ({ ...prev, [r.id]: '' }))
      setSendToExternalCmd(prev => ({ ...prev, [r.id]: false }))
      setSubmitToHQMCCmd(prev => ({ ...prev, [r.id]: false }))
    } catch (e) {
      console.error('Failed to route from command section:', e)
      alert('Failed to route from command section')
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
                      <div className="mt-3 p-3 border border-brand-navy/20 rounded-lg bg-brand-cream/30">
                        <label className="block text-sm font-medium text-[var(--text)] mb-2">Send Options</label>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id={`send-ext-cmd-${r.id}`} checked={sendToExternalCmd[r.id] || false} onChange={() => {
                            const next = !(sendToExternalCmd[r.id] || false)
                            setSendToExternalCmd(prev => ({ ...prev, [r.id]: next }))
                            if (next) setSubmitToHQMCCmd(prev => ({ ...prev, [r.id]: false }))
                          }} />
                          <label htmlFor={`send-ext-cmd-${r.id}`}>Send to External Unit</label>
                          <input type="checkbox" id={`submit-hqmc-cmd-${r.id}`} checked={submitToHQMCCmd[r.id] || false} onChange={() => {
                            const next = !(submitToHQMCCmd[r.id] || false)
                            setSubmitToHQMCCmd(prev => ({ ...prev, [r.id]: next }))
                            if (next) setSendToExternalCmd(prev => ({ ...prev, [r.id]: false }))
                          }} />
                          <label htmlFor={`submit-hqmc-cmd-${r.id}`}>Submit to HQMC</label>
                        </div>
                        {sendToExternalCmd[r.id] && (
                          <div className="mt-2 space-y-2">
                            <SearchableUnitSelector onUnitSelect={(u) => handleExternalUnitChange(r.id, u)} selectedUnit={{ uic: externalUnitUic[r.id] || '', unitName: externalUnit[r.id] || '' } as any} placeholder="Search by UIC, RUC, MCC, or Unit Name" />
                            <select className="px-3 py-2 border border-brand-navy/30 rounded-lg" value={externalSection[r.id] || ''} onChange={(e) => setExternalSection(prev => ({ ...prev, [r.id]: e.target.value }))} disabled={!(externalUnitSections[r.id] || []).length}>
                              <option value="">Select Section/Office (optional)</option>
                              {(externalUnitSections[r.id] || []).map(section => (
                                <option key={section} value={section}>{section}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {submitToHQMCCmd[r.id] && (
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                            <select className="px-3 py-2 border border-brand-navy/30 rounded-lg" value={hqmcDivisionSelCmd[r.id] || ''} onChange={(e) => { setHqmcDivisionSelCmd(prev => ({ ...prev, [r.id]: e.target.value })); setHqmcBranchSelCmd(prev => ({ ...prev, [r.id]: '' })) }}>
                              <option value="">Select HQMC Division</option>
                              {hqmcDivisions.map(d => (<option key={d.code} value={d.code}>{d.code} — {d.name}</option>))}
                            </select>
                            <select className="px-3 py-2 border border-brand-navy/30 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" value={hqmcBranchSelCmd[r.id] || ''} onChange={(e) => setHqmcBranchSelCmd(prev => ({ ...prev, [r.id]: e.target.value }))} disabled={!hqmcDivisionSelCmd[r.id]}>
                              <option value="">Select HQMC Section</option>
                              {hqmcStructure.filter(s => String(s.division_code || '') === String(hqmcDivisionSelCmd[r.id] || '')).map(s => (
                                <option key={s.branch} value={s.branch}>{s.branch}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="mt-2">
                          <button className="px-3 py-2 rounded bg-brand-gold text-brand-charcoal hover:bg-brand-gold-2 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => sendOutFromCmdSection(r)} disabled={
                            submitToHQMCCmd[r.id]
                              ? !(hqmcDivisionSelCmd[r.id] && hqmcBranchSelCmd[r.id])
                              : sendToExternalCmd[r.id]
                                ? !(externalUnitUic[r.id])
                                : true
                          }>Submit</button>
                        </div>
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
      </div>
    </div>
  )
}
