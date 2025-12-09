import React, { useEffect, useMemo, useState } from 'react'
import { listInstallations, listRequests, listUsers, listDocuments, upsertDocuments, upsertRequest, listHQMCDivisions, listHQMCStructure } from '@/lib/db'
import { SearchableUnitSelector } from '@/components/SearchableUnitSelector'
import type { DocumentRecord } from '@/lib/db'
import RequestTable from '@/components/RequestTable'
import { Request } from '@/types'

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
  const [activeTab, setActiveTab] = useState<'Pending' | 'Previously in Section'>('Pending')
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
  const [readdressHQMCInst, setReaddressHQMCInst] = useState<Record<string, boolean>>({})

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
  const exportAll = () => downloadCsv('installation_section_all.csv', buildRows([...inMySections, ...previouslyInSection]))

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

  const mySections: string[] = useMemo(() => {
    if (!install || !currentUser?.id) return []
    const assignments = install.sectionAssignments || {}
    const entries = Object.entries(assignments).filter(([, ids]: any) => Array.isArray(ids) && ids.includes(currentUser.id))
    return entries.map(([name]) => String(name))
  }, [install, currentUser])

  const inMySections = useMemo(() => {
    const iid = currentUser?.installationId || ''
    const allowed = new Set(mySections.map(s => s.toUpperCase()))
    return requests.filter(r => (r.currentStage === 'INSTALLATION_REVIEW') && r.installationId === iid && r.routeSection && allowed.has(String(r.routeSection || '').toUpperCase()))
  }, [requests, currentUser, mySections])

  const previouslyInSection = useMemo(() => {
    const iid = currentUser?.installationId || ''
    const allowed = new Set(mySections.map(s => s.toUpperCase()))
    return requests.filter(r => r.installationId === iid && (
      (r.currentStage !== 'INSTALLATION_REVIEW') ||
      !(r.routeSection && allowed.has(String(r.routeSection || '').toUpperCase()))
    ))
  }, [requests, currentUser, mySections])

  const restoreToSection = async (r: Request, sec?: string) => {
    const actor = `${currentUser?.rank || ''} ${currentUser?.lastName || ''}, ${currentUser?.firstName || ''}`.trim() || 'Installation Section'
    const targetSec = (sec || '').trim() || (r.routeSection || '')
    const entry = { actor, timestamp: new Date().toISOString(), action: `Restored to installation section${targetSec ? `: ${targetSec}` : ''}` }
    const updated: any = { ...r, currentStage: 'INSTALLATION_REVIEW', finalStatus: undefined, routeSection: targetSec, activity: [...(r.activity || []), entry] }
    try {
      await upsertRequest(updated)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
    } catch (e) {
      console.error('InstallationSectionDashboard - Failed to restore:', e)
      alert('Failed to restore to section')
    }
  }

  const sendToInstallationCommand = async (r: Request) => {
    const sec = selectedCmd[r.id] || ''
    if (!sec.trim()) return
    const actor = `${currentUser?.rank || ''} ${currentUser?.lastName || ''}, ${currentUser?.firstName || ''}`.trim() || 'Installation Section'
    const prevSec = r.routeSection || ''
    const entry = { actor, timestamp: new Date().toISOString(), action: `Routed to installation command section: ${sec}${prevSec ? ` (from ${prevSec})` : ''}` }
    const updated: any = { ...r, routeSection: sec, activity: [...(r.activity || []), entry] }
    try {
      await upsertRequest(updated)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
    } catch (e) {
      console.error('Failed to route to installation command section:', e)
      alert('Failed to route to installation command section')
    }
  }

  const returnToUnit = async (r: Request) => {
    const actor = `${currentUser?.rank || ''} ${currentUser?.lastName || ''}, ${currentUser?.firstName || ''}`.trim() || 'Installation Section'
    const entry = { actor, timestamp: new Date().toISOString(), action: 'Returned to unit for corrections', comment: (comments[r.id] || '').trim() }
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
    } catch (e) {
      console.error('Failed to return to unit:', e)
      alert('Failed to return to unit')
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

  const sendOutFromInstSection = async (r: Request) => {
    const actor = `${currentUser?.rank || ''} ${currentUser?.lastName || ''}, ${currentUser?.firstName || ''}`.trim() || 'Installation Section'
    let updated: any = { ...r }
    if (readdressHQMCInst[r.id]) {
      const div = hqmcDivisionSel[r.id] || ''
      const branch = hqmcBranchSel[r.id] || ''
      if (!div || !branch) { alert('Select HQMC division and section'); return }
      const entry = { actor, timestamp: new Date().toISOString(), action: `Sent to HQMC: ${div} - ${branch}`, comment: (comments[r.id] || '').trim() }
      updated = { ...r, currentStage: 'HQMC_REVIEW', routeSection: branch, activity: [...(r.activity || []), entry] }
    } else if (sendToExternalInst[r.id]) {
      const extUic = externalUnitUic[r.id] || ''
      const extUnitName = externalUnit[r.id] || ''
      const extSec = externalSection[r.id] || ''
      if (!extUic.trim()) { alert('Please select an external unit'); return }
      const entry = { actor, timestamp: new Date().toISOString(), action: extSec ? `Sent to external unit: ${extUnitName} - ${extSec}` : `Sent to external unit: ${extUnitName}`, comment: (comments[r.id] || '').trim() }
      updated = {
        ...r,
        currentStage: 'EXTERNAL_REVIEW',
        externalPendingUnitName: extUnitName,
        externalPendingUnitUic: extUic,
        externalPendingStage: extSec || undefined,
        routeSection: extSec || '',
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
      setSendToExternalInst(prev => ({ ...prev, [r.id]: false }))
      setReaddressHQMCInst(prev => ({ ...prev, [r.id]: false }))
    } catch (e) {
      console.error('InstallationSectionDashboard - Failed to route:', e)
      alert('Failed to route')
    }
  }

  const getPreviousHQMCSection = (r: Request) => {
    const acts = (r.activity || []).slice().reverse()
    for (const a of acts) {
      const s = String(a.action || '')
      const m1 = s.match(/Sent to HQMC:\s*([^\-]+)\s*-\s*(.+)/i)
      if (m1) return m1[2].trim()
      const m2 = s.match(/Submitted to HQMC Approver:\s*([^\-]+)\s*-\s*(.+)/i)
      if (m2) return m2[2].trim()
      const m3 = s.match(/Routed to HQMC section:\s*(.+)/i)
      if (m3) return m3[1].trim()
    }
    return String(r.routeSection || '')
  }

  const approveFromInstSection = async (r: Request) => {
    const actor = `${currentUser?.rank || ''} ${currentUser?.lastName || ''}, ${currentUser?.firstName || ''}`.trim() || 'Installation Section'
    let updated: any = { ...r }
    if (readdressHQMCInst[r.id]) {
      const div = hqmcDivisionSel[r.id] || ''
      const branch = hqmcBranchSel[r.id] || ''
      if (!div || !branch) { alert('Select HQMC division and section'); return }
      const entry = { actor, timestamp: new Date().toISOString(), action: `Submitted to HQMC Approver: ${div} - ${branch}`, comment: (comments[r.id] || '').trim() }
      updated = { ...r, currentStage: 'HQMC_REVIEW', routeSection: branch, activity: [...(r.activity || []), entry] }
    } else {
      const prevBranch = getPreviousHQMCSection(r)
      const entry = { actor, timestamp: new Date().toISOString(), action: prevBranch ? `Submitted to HQMC Approver: ${prevBranch}` : 'Submitted to HQMC Approver', comment: (comments[r.id] || '').trim() }
      updated = { ...r, currentStage: 'HQMC_REVIEW', routeSection: prevBranch || r.routeSection, activity: [...(r.activity || []), entry] }
    }
    try {
      await upsertRequest(updated)
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x))
      setComments(prev => ({ ...prev, [r.id]: '' }))
      setSendToExternalInst(prev => ({ ...prev, [r.id]: false }))
      setReaddressHQMCInst(prev => ({ ...prev, [r.id]: false }))
    } catch (e) {
      console.error('InstallationSectionDashboard - Failed to approve to HQMC:', e)
      alert('Failed to submit to HQMC approver')
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-[var(--surface)] rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--text)]">Installation Section Dashboard</h2>
          <div className="text-sm text-[var(--muted)]">{(install?.name || '')}</div>
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
              { (r.activity || []).some(a => /Endorsed by Installation Commander/i.test(String(a.action || ''))) && (
                <>
                <div className="mt-3 p-3 border border-brand-navy/20 rounded-lg bg-brand-cream/30">
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Send Options</label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id={`send-ext-inst-${r.id}`} checked={sendToExternalInst[r.id] || false} onChange={() => {
                        const next = !(sendToExternalInst[r.id] || false)
                        setSendToExternalInst(prev => ({ ...prev, [r.id]: next }))
                        if (next) setSubmitToHQMCInst(prev => ({ ...prev, [r.id]: false }))
                      }} />
                      <label htmlFor={`send-ext-inst-${r.id}`}>Send to External Unit</label>
                      <input type="checkbox" id={`readdress-hqmc-inst-${r.id}`} checked={readdressHQMCInst[r.id] || false} onChange={() => {
                        const next = !(readdressHQMCInst[r.id] || false)
                        setReaddressHQMCInst(prev => ({ ...prev, [r.id]: next }))
                        if (next) setSendToExternalInst(prev => ({ ...prev, [r.id]: false }))
                      }} />
                      <label htmlFor={`readdress-hqmc-inst-${r.id}`}>Readdress to HQMC Section</label>
                    </div>
                    {sendToExternalInst[r.id] && (
                      <div className="flex items-center gap-2">
                        <SearchableUnitSelector onUnitSelect={(u) => handleExternalUnitChange(r.id, u)} selectedUnit={{ uic: externalUnitUic[r.id] || '', unitName: externalUnit[r.id] || '' } as any} placeholder="Search by UIC, RUC, MCC, or Unit Name" />
                        <select className="px-3 py-2 border border-brand-navy/30 rounded-lg" value={externalSection[r.id] || ''} onChange={(e) => setExternalSection(prev => ({ ...prev, [r.id]: e.target.value }))} disabled={!(externalUnitSections[r.id] || []).length}>
                          <option value="">Select Section/Office (optional)</option>
                          {(externalUnitSections[r.id] || []).map(section => (
                            <option key={section} value={section}>{section}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {readdressHQMCInst[r.id] && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <select className="px-3 py-2 border border-brand-navy/30 rounded-lg" value={hqmcDivisionSel[r.id] || ''} onChange={(e) => { setHqmcDivisionSel(prev => ({ ...prev, [r.id]: e.target.value })); setHqmcBranchSel(prev => ({ ...prev, [r.id]: '' })) }}>
                          <option value="">Select HQMC Division</option>
                          {hqmcDivisions.map(d => (<option key={d.code} value={d.code}>{d.code} — {d.name}</option>))}
                        </select>
                        <select className="px-3 py-2 border border-brand-navy/30 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" value={hqmcBranchSel[r.id] || ''} onChange={(e) => setHqmcBranchSel(prev => ({ ...prev, [r.id]: e.target.value }))} disabled={!hqmcDivisionSel[r.id]}>
                          <option value="">Select HQMC Section</option>
                          {hqmcStructure.filter(s => String(s.division_code || '') === String(hqmcDivisionSel[r.id] || '')).map(s => (
                            <option key={s.branch} value={s.branch}>{s.branch}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="mt-2">
                      <button className="px-3 py-2 rounded bg-brand-gold text-brand-charcoal hover:bg-brand-gold-2 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => sendOutFromInstSection(r)} disabled={
                        readdressHQMCInst[r.id]
                          ? !(hqmcDivisionSel[r.id] && hqmcBranchSel[r.id])
                          : sendToExternalInst[r.id]
                            ? !(externalUnitUic[r.id])
                            : true
                      }>{ readdressHQMCInst[r.id] ? 'Submit to HQMC (Readdress)' : sendToExternalInst[r.id] ? 'Submit to External' : 'Submit' }</button>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button className="px-3 py-2 rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2" onClick={() => approveFromInstSection(r)}>Approve</button>
                  <button className="px-3 py-2 rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2" onClick={() => returnToUnit(r)}>Return</button>
                </div>
                </>
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
      </div>
    </div>
  )
}
