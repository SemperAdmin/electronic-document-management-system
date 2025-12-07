import React, { useEffect, useState, useMemo } from 'react';
import { getSupabase } from '../lib/supabase';
import { Unit } from '../lib/units';
import { listDocuments, upsertDocuments, listRequests, upsertRequest, listUsers, DocumentRecord, RequestRecord } from '../lib/db';
import { getSupabaseUrl } from '../lib/supabase';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/Pagination';
import RequestTable from './RequestTable';
import { Request, UserRecord } from '../types';
import { normalizeString, hasReviewer } from '../lib/reviewers';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  category: string;
  tags: string[];
  unitUic: string;
  subject: string;
  dueDate?: string;
  notes?: string;
  uploadedById?: string;
  currentStage?: string;
  requestId?: string;
  fileUrl?: string;
}

interface ActionEntry {
  actor: string;
  timestamp: string;
  action: string;
  comment?: string;
}

interface DocumentManagerProps {
  selectedUnit: Unit | null;
  currentUser?: any;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ selectedUnit, currentUser: cuProp }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [requestActivity, setRequestActivity] = useState<ActionEntry[]>([]);
  const [userRequests, setUserRequests] = useState<Request[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [editRequestSubject, setEditRequestSubject] = useState('');
  const [editRequestDueDate, setEditRequestDueDate] = useState('');
  const [editRequestNotes, setEditRequestNotes] = useState('');
  const [attachFiles, setAttachFiles] = useState<File[]>([]);
  const [docsExpanded, setDocsExpanded] = useState<boolean>(false);
  const [expandedRequests, setExpandedRequests] = useState<Record<string, boolean>>({});
  const [submitForUserId, setSubmitForUserId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'Pending' | 'Archived'>('Pending');


  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    setSelectedFiles((prev) => [...prev, ...files]);
    try { event.target.value = '' } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!subject.trim()) {
      setFeedback({ type: 'error', message: 'Subject is required.' });
      return;
    }
    if (!currentUser?.id) {
      setFeedback({ type: 'error', message: 'Create a profile before submitting.' });
      return;
    }

    setIsUploading(true);
    const now = Date.now();
    const targetUserId = submitForUserId || currentUser.id;
    const targetUser = users.find(u => u.id === targetUserId);
    const targetUic = selectedUnit ? selectedUnit.uic : (targetUser?.unitUic || 'N/A');
    const requestId = `req-${now}`;

    let docs: Document[] = [];
    const supaUrl = getSupabaseUrl() || ((import.meta as any)?.env?.VITE_SUPABASE_URL as string || localStorage.getItem('supabase_url') || '')
    const makePublicUrl = (pathKey: string) => {
      try {
        const sb = getSupabase()
        if (sb && sb.storage && typeof sb.storage.from === 'function') {
          const res = sb.storage.from('edms-docs').getPublicUrl(pathKey)
          if (res?.data?.publicUrl) return String(res.data.publicUrl)
        }
      } catch {}
      return `${supaUrl}/storage/v1/object/public/edms-docs/${pathKey}`
    }
    const sanitize = (n: string) => n.replace(/[^A-Za-z0-9._-]/g, '-')
    async function uploadToStorage(file: File, pathKey: string) {
      try {
        const resp = await fetch('/api/storage/sign-upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: pathKey }) })
        const json = await resp.json()
        if (!resp.ok || !json?.signedUrl) throw new Error(String(json?.error || 'sign_url_failed'))
        const putRes = await fetch(String(json.signedUrl), { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file })
        if (!putRes.ok) {
          let msg = 'upload_failed'
          try { msg = await putRes.text() } catch {}
          throw new Error(msg)
        }
        return makePublicUrl(pathKey)
      } catch (e) {
        try {
          const sb = getSupabase()
          if (!sb?.storage) throw e
          const { data, error } = await sb.storage.from('edms-docs').upload(pathKey, file, { upsert: true, contentType: file.type || 'application/octet-stream' })
          if (error) throw error
          return makePublicUrl(pathKey)
        } catch (fallbackErr) {
          throw (e || fallbackErr)
        }
      }
    }
    if (selectedFiles && selectedFiles.length > 0) {
      const uploadedUrls: string[] = []
      for (let i = 0; i < selectedFiles.length; i++) {
        const f = selectedFiles[i]
        const pathKey = `${targetUic}/${requestId}/${now}-${i}-${sanitize(f.name)}`
        try {
          const url = await uploadToStorage(f, pathKey)
          uploadedUrls.push(url)
        } catch (err: any) {
          setIsUploading(false)
          setFeedback({ type: 'error', message: `Failed to upload ${f.name}: ${String(err?.message || err)}` })
          return
        }
      }
      docs = selectedFiles.map((file, index) => ({
        id: `${now}-${index}`,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date(),
        category: 'administration',
        tags: [],
        unitUic: targetUic,
        subject: subject.trim(),
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        uploadedById: targetUserId,
        currentStage: 'PLATOON_REVIEW',
        fileUrl: uploadedUrls[index],
      }));
    }

    docs = docs.map(d => ({ ...d, requestId }));
    setDocuments(prev => [...prev, ...docs]);
    setSelectedFiles([]);
    setSubject('');
    setDueDate('');
    setNotes('');

    try {
      const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}` : 'Unknown';
      const originUnitUic = targetUic;
      const originCompany = normalizeString(targetUser?.company);
      const originPlatoon = normalizeString(targetUser?.platoon);

      const hasPlatoonReviewer = hasReviewer(users, 'PLATOON_REVIEWER', { company: originCompany, platoon: originPlatoon, uic: originUnitUic });
      const hasCompanyReviewer = hasReviewer(users, 'COMPANY_REVIEWER', { company: originCompany, uic: originUnitUic });

      const requestPayload = {
        id: requestId,
        subject: subject.trim(),
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        unitUic: targetUic,
        uploadedById: targetUserId,
        submitForUserId: targetUserId,
        documentIds: docs.map(d => d.id),
        createdAt: new Date().toISOString(),
        currentStage: 'PLATOON_REVIEW',
        activity: [
          { actor, timestamp: new Date().toISOString(), action: 'Submitted request', comment: (notes || '').trim() }
        ]
      };
      try {
        const resReq = await upsertRequest(requestPayload as unknown as RequestRecord);
        if (!resReq.ok) throw new Error(getApiErrorMessage(resReq, 'request_upsert_failed'));
        const resDocs = await upsertDocuments(docs as unknown as DocumentRecord[]);
        if (!resDocs.ok) throw new Error(getApiErrorMessage(resDocs, 'document_upsert_failed'));
      } catch (e: any) {
        setIsUploading(false);
        setFeedback({ type: 'error', message: `Failed to persist submission: ${String(e?.message || e)}` });
        return;
      }
      setUserRequests(prev => {
        const exists = prev.some(r => r.id === requestPayload.id);
        return exists ? prev.map(r => (r.id === requestPayload.id ? (requestPayload as Request) : r)) : [...prev, requestPayload as Request];
      });
      setIsUploading(false);
      setFeedback({ type: 'success', message: 'Submission successful.' });
      setShowForm(false);
    } catch {
      setIsUploading(false);
      setFeedback({ type: 'error', message: 'Failed to persist submission.' });
    }
  };

  const openDoc = (doc: Document) => {
    setSelectedDoc(doc);
    setEditSubject(doc.subject || '');
    setEditDueDate(doc.dueDate || '');
    setEditNotes(doc.notes || '');
    try {
      const raw = localStorage.getItem(`fs/requests/${doc.requestId}.json`);
      if (raw) {
        const req = JSON.parse(raw);
        setRequestActivity(Array.isArray(req.activity) ? req.activity : []);
      } else {
        const staticReqModules = import.meta.glob('../requests/*.json', { eager: true });
        const staticReqs: any[] = Object.values(staticReqModules).map((m: any) => m?.default ?? m);
        const match = staticReqs.find((r: any) => r && r.id === doc.requestId);
        setRequestActivity(match && Array.isArray(match.activity) ? match.activity : []);
      }
    } catch {
      setRequestActivity([]);
    }
  };

  const getApiErrorMessage = (res: { error?: any }, fallbackMessage: string): string => {
    return String(res.error?.message || res.error || fallbackMessage);
  }

  const saveDocEdits = async () => {
    if (!selectedDoc) return;
    const updated = documents.map(d => d.id === selectedDoc.id ? {
      ...d,
      subject: editSubject.trim() || d.subject,
      dueDate: editDueDate || undefined,
      notes: editNotes.trim() || undefined,
    } : d);
    setDocuments(updated);
    try {
      const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}` : 'Unknown';
      const entry: ActionEntry = { actor, timestamp: new Date().toISOString(), action: 'Updated document', comment: (editNotes || '').trim() };
      const req = selectedDoc.requestId ? userRequests.find(r => r.id === selectedDoc.requestId) : null;
      if (req) {
        const nextReq = { ...req, activity: Array.isArray(req.activity) ? [...req.activity, entry] : [entry] };
        try {
          const res = await upsertRequest(nextReq as unknown as RequestRecord);
          if (!res.ok) throw new Error(getApiErrorMessage(res, 'request_upsert_failed'));
        } catch (e: any) {
          console.error('Failed to save document edits:', e);
          setFeedback({ type: 'error', message: `Failed to save document edits: ${e.message}` });
          return;
        }
        setRequestActivity((prev) => [...prev, entry]);
      }
    } catch {}
    setEditNotes('');
    setSelectedDoc(null);
  };

  const filteredDocuments = documents.filter(doc => {
    if (!currentUser?.id) return false;
    if (currentUser.role === 'MEMBER' && doc.uploadedById !== currentUser.id) return false;
    if (doc.type === 'request') return false;
    return true;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  const isReturnedReq = (r: Request) => {
    const a = r.activity && r.activity.length ? r.activity[r.activity.length - 1] : null;
    return !!a && /returned/i.test(String(a?.action || ''));
  };

  const isReviewer = () => String(currentUser?.role || '').includes('REVIEW');
  const eligibleUsers = () => {
    if (!isReviewer()) return [];
    const role = String(currentUser?.role || '');
    return users.filter(u => {
      if (u.id === currentUser?.id) return false;
      if (role.includes('PLATOON')) {
        const oc = (u.company && u.company !== 'N/A') ? u.company : '';
        const ou = (u.unit && u.unit !== 'N/A') ? u.unit : '';
        const cc = (currentUser?.company && currentUser.company !== 'N/A') ? currentUser.company : '';
        const cu = (currentUser?.unit && currentUser.unit !== 'N/A') ? currentUser.unit : '';
        return oc === cc && ou === cu;
      }
      if (role.includes('COMPANY')) {
        const oc = (u.company && u.company !== 'N/A') ? u.company : '';
        const cc = (currentUser?.company && currentUser.company !== 'N/A') ? currentUser.company : '';
        return oc === cc;
      }
      if (role.includes('COMMANDER')) {
        return (u.unitUic || '') === (currentUser?.unitUic || '');
      }
      return false;
    });
  };

  const DocCard: React.FC<{ doc: Document }> = ({ doc }) => (
    <div
      className="flex items-center justify-between p-4 border border-brand-navy/20 rounded-lg bg-[var(--surface)] hover:bg-brand-cream/50 transition-colors"
      role="group"
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-brand-cream rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-brand-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <div className="font-medium text-[var(--text)]">{doc.subject}</div>
          <div className="text-sm text-[var(--muted)]">{doc.name} • {formatFileSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString()}</div>
          {doc.dueDate && <div className="text-xs text-[var(--muted)]">Due {new Date(doc.dueDate).toLocaleDateString()}</div>}
          {doc.notes && <div className="text-xs text-[var(--muted)] mt-1">Notes: {doc.notes}</div>}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {doc.currentStage && (
          <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">{formatStage(doc as any)}</span>
        )}
        {doc.fileUrl && (
          <a
            href={normalizeDocUrl(doc.fileUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 text-xs bg-brand-cream text-brand-navy rounded hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold underline decoration-brand-red-2 underline-offset-2"
          >
            Open
          </a>
        )}
        <button
          className="px-3 py-1 text-xs bg-brand-cream text-brand-navy rounded hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold underline decoration-brand-red-2 underline-offset-2"
          onClick={(e) => { e.stopPropagation(); openDoc(doc); }}
        >
          View/Edit
        </button
        >
        
      </div>
    </div>
  );

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

  const normalizeDocUrl = (url?: string): string | undefined => {
    if (!url) return undefined
    const supaBase = getSupabaseUrl() || localStorage.getItem('supabase_url') || ((import.meta as any)?.env?.VITE_SUPABASE_URL as string || '')
    if (!supaBase) return url
    try {
      // Absolute URL: rewrite host if path matches storage
      if (/^https?:\/\//i.test(url)) {
        const u = new URL(url)
        const marker = '/storage/v1/object/public/edms-docs/'
        const idx = u.pathname.indexOf(marker)
        if (idx >= 0) {
          const path = u.pathname.substring(idx) // from /storage...
          const search = u.search || ''
          return `${supaBase}${path}${search}`
        }
        return url
      }
      // Relative URL
      if (url.startsWith('/')) return `${supaBase}${url}`
      if (url.startsWith('storage/')) return `${supaBase}/${url}`
      const marker = '/storage/v1/object/public/edms-docs/'
      const idx = url.indexOf(marker)
      if (idx >= 0) {
        const path = url.substring(idx)
        return `${supaBase}${path}`
      }
    } catch {}
    return url
  }

  const openInApp = (doc: Document) => {
    const href = normalizeDocUrl(doc.fileUrl)
    if (!href) return
    window.open(href, '_blank');
  };


  const saveRequestEdits = async () => {
    if (!selectedRequest || !currentUser?.id || selectedRequest.uploadedById !== currentUser.id) {
      setFeedback({ type: 'error', message: 'Only the requester can edit this.' });
      return;
    }
    const now = Date.now();
    const sanitize2 = (n: string) => n.replace(/[^A-Za-z0-9._-]/g, '-')
    const supaUrl2 = (import.meta as any)?.env?.VITE_SUPABASE_URL as string || ''
    const makePublicUrl2 = (pathKey: string) => {
      try {
        const sb = getSupabase()
        if (sb && sb.storage && typeof sb.storage.from === 'function') {
          const res = sb.storage.from('edms-docs').getPublicUrl(pathKey)
          if (res?.data?.publicUrl) return String(res.data.publicUrl)
        }
      } catch {}
      return `${supaUrl2}/storage/v1/object/public/edms-docs/${pathKey}`
    }
    const uploaded2: string[] = []
    for (let i = 0; i < attachFiles.length; i++) {
      const f = attachFiles[i]
      const pathKey = `${selectedRequest.unitUic || 'N-A'}/${selectedRequest.id}/${now}-${i}-${sanitize2(f.name)}`
      try {
        const resp = await fetch('/api/storage/sign-upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: pathKey }) })
        const json = await resp.json()
        if (!resp.ok || !json?.signedUrl) throw new Error(String(json?.error || 'sign_url_failed'))
        const putRes = await fetch(String(json.signedUrl), { method: 'PUT', headers: { 'Content-Type': f.type || 'application/octet-stream' }, body: f })
        if (!putRes.ok) throw new Error('upload_failed')
        uploaded2.push(makePublicUrl2(pathKey))
      } catch (e: any) {
        setFeedback({ type: 'error', message: `Failed to upload ${f.name}: ${String(e?.message || e)}` })
        return
      }
    }
    const newDocs: Document[] = attachFiles.map((file, idx) => ({
      id: `${now}-${idx}`,
      name: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: new Date(),
      category: 'administration',
      tags: [],
      unitUic: selectedRequest.unitUic || 'N/A',
      subject: editRequestSubject.trim() || selectedRequest.subject,
      dueDate: editRequestDueDate || undefined,
      notes: editRequestNotes.trim() || undefined,
      uploadedById: currentUser.id,
      currentStage: selectedRequest.currentStage || 'PLATOON_REVIEW',
      requestId: selectedRequest.id,
      fileUrl: uploaded2[idx]
    }));
    const updatedRequest: Request = {
      ...selectedRequest,
      subject: editRequestSubject.trim() || selectedRequest.subject,
      dueDate: editRequestDueDate || undefined,
      notes: editRequestNotes.trim() || undefined,
      documentIds: [...(selectedRequest.documentIds || []), ...newDocs.map(d => d.id)],
      activity: [
        ...(selectedRequest.activity || []),
        {
          actor: `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}`,
          timestamp: new Date().toISOString(),
          action: newDocs.length ? `Updated request and added ${newDocs.length} document(s)` : 'Updated request',
          comment: (editRequestNotes || '').trim()
        }
      ]
    };
    try {
      try {
        const resDocs = await upsertDocuments(newDocs as unknown as DocumentRecord[]);
        if (!resDocs.ok) throw new Error(getApiErrorMessage(resDocs, 'document_upsert_failed'));
        const resReq = await upsertRequest(updatedRequest as unknown as RequestRecord);
        if (!resReq.ok) throw new Error(getApiErrorMessage(resReq, 'request_upsert_failed'));
      } catch (e: any) {
        setFeedback({ type: 'error', message: `Failed to persist documents: ${String(e?.message || e)}` });
        return;
      }
      setDocuments(prev => [...prev, ...newDocs]);
      setUserRequests(prev => prev.map(r => (r.id === updatedRequest.id ? updatedRequest : r)));
      setSelectedRequest(updatedRequest);
      setAttachFiles([]);
      setEditRequestNotes('');
      setFeedback({ type: 'success', message: newDocs.length ? 'Files added and request updated.' : 'Request updated.' });
    } catch {
      setFeedback({ type: 'error', message: 'Failed to update request.' });
    }
  };

  useEffect(() => {
    listDocuments().then((remote) => {
      setDocuments(remote as any);
    }).catch(() => setDocuments([]));
  }, []);

  useEffect(() => {
    if (selectedRequest) {
      setEditRequestSubject(selectedRequest.subject || '');
      setEditRequestDueDate(selectedRequest.dueDate || '');
      setEditRequestNotes(selectedRequest.notes || '');
      setAttachFiles([]);
    }
  }, [selectedRequest]);

  useEffect(() => {}, [documents]);

  useEffect(() => {
    listRequests().then((remote) => {
      setUserRequests(remote as any);
    }).catch(() => setUserRequests([]));
  }, []);

  useEffect(() => { setCurrentUser(cuProp || null) }, [cuProp]);

  useEffect(() => {
    listUsers().then((remote) => {
      setUsers(remote as any);
    }).catch(() => setUsers([]));
  }, []);

  // Filter user's requests
  const myRequests = useMemo(() => {
    if (!currentUser?.id) return [];
    const filtered = userRequests.filter(r => r.uploadedById === currentUser.id);
    if (activeTab === 'Pending') {
      return filtered.filter(r => r.currentStage !== 'ARCHIVED');
    }
    return filtered.filter(r => r.currentStage === 'ARCHIVED');
  }, [userRequests, currentUser, activeTab]);

  // Pagination for user requests
  const requestsPagination = usePagination(myRequests, { pageSize: 10 });

  const usersByIdMap = useMemo(() => users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {}), [users]);

  return (
    <div className="bg-[var(--surface)] rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[var(--text)]">Documents</h2>
          <button type="button" onClick={() => setShowForm(true)} className="bg-brand-navy text-brand-cream px-4 py-2 rounded-lg hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold underline decoration-brand-red-2 underline-offset-4">New Request</button>
        </div>

        {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--text)] mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Document subject/title"
                className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">Due Date (optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
              />
            </div>
          </div>

          {String(currentUser?.role || '').includes('REVIEW') && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Submit For (optional)</label>
                <select
                  value={submitForUserId}
                  onChange={(e) => setSubmitForUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg"
                >
                  <option value="">Myself</option>
                  {eligibleUsers().map(u => (
                    <option key={u.id} value={u.id}>{u.rank} {u.lastName}, {u.firstName}{u.mi ? ` ${u.mi}` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Additional context for reviewers"
              className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
            />
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <label className="bg-brand-navy text-brand-cream px-4 py-2 rounded-lg hover:bg-brand-red-2 cursor-pointer transition-colors inline-block">
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              />
              Attach Files
            </label>
            <div className="flex-1">
              {selectedFiles.length > 0 ? (
                <div className="ml-2 flex flex-wrap gap-2">
                  {selectedFiles.map((f, idx) => (
                    <span key={idx} className="inline-flex items-center gap-2 px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded border border-brand-navy/20">
                      <span className="max-w-[240px] truncate" title={f.name}>{f.name}</span>
                      <button
                        type="button"
                        className="text-brand-red-2 hover:underline"
                        onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                      >
                        Delete
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="ml-2 text-xs text-[var(--muted)]">No files selected</span>
              )}
            </div>
            <div className="md:ml-auto flex gap-2">
              <button type="button" onClick={() => { setShowForm(false); setSelectedFiles([]); setSubject(''); setDueDate(''); setNotes(''); setFeedback(null); }} className="px-4 py-2 rounded-lg border border-brand-navy/30 text-brand-navy hover:bg-brand-cream">Cancel</button>
              <button type="submit" className="bg-brand-gold text-brand-charcoal px-4 py-2 rounded-lg hover:bg-brand-gold-2 transition-colors">Submit</button>
            </div>
          </div>

          {feedback && (
            <div className={`p-3 rounded-lg border ${feedback.type === 'success' ? 'bg-brand-cream border-brand-gold text-brand-navy' : 'bg-brand-cream border-brand-red text-brand-red'}`}>
              {feedback.message}
            </div>
          )}
        </form>
        )}

        
      </div>

      <div className="p-6">
        {currentUser && (
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('Pending')}
                  className={`${activeTab === 'Pending' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setActiveTab('Archived')}
                  className={`${activeTab === 'Archived' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Archived
                </button>
              </nav>
            </div>
            <RequestTable
              title="Your Requests"
              requests={requestsPagination.currentData}
              users={usersByIdMap}
              onRowClick={(r) => setSelectedRequest(r)}
              expandedRows={expandedRequests}
            >
              {(r: Request) => (
                <div id={`req-docs-${r.id}`}>
                  {documents.filter(d => d.requestId === r.id && d.type !== 'request').map(d => (
                    <DocCard key={d.id} doc={d} />
                  ))}
                  {documents.filter(d => d.requestId === r.id && d.type !== 'request').length === 0 && (
                    <div className="text-sm text-[var(--muted)]">No documents</div>
                  )}
                </div>
              )}
            </RequestTable>
            {requestsPagination.totalItems > 0 && (
              <Pagination
                currentPage={requestsPagination.currentPage}
                totalPages={requestsPagination.totalPages}
                totalItems={requestsPagination.totalItems}
                pageSize={requestsPagination.pageSize}
                startIndex={requestsPagination.startIndex}
                endIndex={requestsPagination.endIndex}
                onPageChange={requestsPagination.goToPage}
                onPageSizeChange={requestsPagination.setPageSize}
                onNext={requestsPagination.nextPage}
                onPrevious={requestsPagination.previousPage}
                onFirst={requestsPagination.goToFirstPage}
                onLast={requestsPagination.goToLastPage}
                canGoNext={requestsPagination.canGoNext}
                canGoPrevious={requestsPagination.canGoPrevious}
                pageSizeOptions={[5, 10, 25, 50]}
              />
            )}
          </div>
        )}
        {isUploading && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800">Uploading documents...</span>
            </div>
          </div>
        )}

        
      </div>
      {selectedDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] rounded-lg shadow w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[var(--text)]">Request Details</h3>
              <button className="text-brand-navy" onClick={() => setSelectedDoc(null)}>✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Subject</label>
                <input type="text" value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">Due Date</label>
                  <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                  <input type="text" value={selectedDoc.currentStage || ''} disabled className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Notes</label>
                <textarea rows={4} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold" />
              </div>
              <div className="text-sm text-gray-500">{selectedDoc.name} • {formatFileSize(selectedDoc.size)} • {new Date(selectedDoc.uploadedAt).toLocaleDateString()}</div>
              <div>
                <h4 className="text-sm font-medium text-[var(--text)] mt-4">Action Log</h4>
                <div className="mt-2 space-y-2">
                  {requestActivity.length === 0 ? (
                    <div className="text-xs text-gray-500">No activity</div>
                  ) : (
                    requestActivity.map((a, idx) => (
                      <div key={idx} className="text-xs text-gray-700">
                        <div className="font-medium">{a.actor} • {new Date(a.timestamp).toLocaleString()} • {a.action}</div>
                        {a.comment && <div className="text-gray-600">{a.comment}</div>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="px-4 py-2 rounded-lg border border-brand-navy/30 text-brand-navy hover:bg-brand-cream" onClick={() => setSelectedDoc(null)}>Close</button>
              <button className="px-4 py-2 rounded-lg bg-brand-navy text-brand-cream hover:bg-brand-red-2" onClick={saveDocEdits}>Save</button>
            </div>
          </div>
        </div>
      )}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" onClick={() => setSelectedRequest(null)}>
          <div className="bg-[var(--surface)] rounded-lg shadow w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[var(--text)]">Request</h3>
              <button className="text-brand-navy" onClick={() => setSelectedRequest(null)}>✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Subject</label>
                <input type="text" value={editRequestSubject} onChange={(e) => setEditRequestSubject(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-[var(--muted)]">Submitted {new Date(selectedRequest.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">Due Date</label>
                  <input type="date" value={editRequestDueDate} onChange={(e) => setEditRequestDueDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              {selectedRequest.currentStage && (
                <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">{selectedRequest.currentStage}</span>
              )}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Notes</label>
                <textarea rows={3} value={editRequestNotes} onChange={(e) => setEditRequestNotes(e.target.value)} className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-[var(--text)]">Action Log</h4>
                <div className="mt-2 space-y-2">
                  {selectedRequest.activity && selectedRequest.activity.length ? (
                    selectedRequest.activity.map((a, idx) => (
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
              <div>
                <h4 className="text-sm font-medium text-[var(--text)]">Documents</h4>
                <button
                  className="mt-2 px-3 py-1 rounded bg-brand-navy text-brand-cream hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold underline decoration-brand-red-2 underline-offset-2"
                  aria-expanded={docsExpanded}
                  aria-controls="docs-panel"
                  onClick={() => setDocsExpanded((p) => !p)}
                >
                  {docsExpanded ? 'Hide' : 'Show'} Documents
                </button>
                <div id="docs-panel" className={docsExpanded ? 'mt-3 space-y-2' : 'hidden'}>
                  {documents.filter(d => d.requestId === selectedRequest.id && d.type !== 'request').map(d => (
                    <DocCard key={d.id} doc={d} />
                  ))}
                </div>
                <div className="mt-3">
                  <label className="bg-brand-navy text-brand-cream px-3 py-1 rounded-lg hover:brightness-110 cursor-pointer inline-block">
                    <input type="file" multiple onChange={(e) => { const files = e.target.files ? Array.from(e.target.files) : []; setAttachFiles(prev => [...prev, ...files]); try { e.target.value = '' } catch {} }} className="hidden" accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png" />
                    Add Files
                  </label>
                  <div className="ml-2 flex flex-wrap gap-2">
                    {attachFiles.length === 0 ? (
                      <span className="text-xs text-[var(--muted)]">No files selected</span>
                    ) : (
                      attachFiles.map((f, idx) => (
                        <span key={idx} className="inline-flex items-center gap-2 px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded border border-brand-navy/20">
                          <span className="max-w-[240px] truncate" title={f.name}>{f.name}</span>
                          <button
                            type="button"
                            className="text-brand-red-2 hover:underline"
                            onClick={() => setAttachFiles(prev => prev.filter((_, i) => i !== idx))}
                          >
                            Delete
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button className="px-4 py-2 rounded-lg border border-brand-navy/30 text-brand-navy hover:bg-brand-cream" onClick={() => setSelectedRequest(null)}>Close</button>
              <button className="ml-2 px-4 py-2 rounded-lg bg-brand-navy text-brand-cream hover:brightness-110" onClick={saveRequestEdits} disabled={!currentUser || currentUser.id !== (selectedRequest?.uploadedById || '')}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
