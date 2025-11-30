import React, { useEffect, useState } from 'react';
import { Unit } from '../lib/units';

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

interface Request {
  id: string;
  subject: string;
  dueDate?: string;
  notes?: string;
  unitUic: string;
  uploadedById: string;
  documentIds: string[];
  createdAt: string;
  currentStage?: string;
  activity?: Array<{ actor: string; timestamp: string; action: string; comment?: string }>;
}

interface ActionEntry {
  actor: string;
  timestamp: string;
  action: string;
  comment?: string;
}

interface DocumentManagerProps {
  selectedUnit: Unit | null;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ selectedUnit }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
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


  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files);
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

    let docs: Document[] = [];
    if (selectedFiles && selectedFiles.length > 0) {
      docs = Array.from(selectedFiles).map((file, index) => ({
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
        fileUrl: URL.createObjectURL(file),
      }));
    }

    const requestId = `req-${now}`;
    docs = docs.map(d => ({ ...d, requestId }));
    setDocuments(prev => [...prev, ...docs]);
    setSelectedFiles(null);
    setSubject('');
    setDueDate('');
    setNotes('');

    try {
      for (const d of docs) {
        try {
          const serializable = { ...d, uploadedAt: d.uploadedAt.toISOString() };
          localStorage.setItem(`fs/documents/${d.id}.json`, JSON.stringify(serializable));
          await fetch('/api/documents/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(serializable) });
        } catch {}
      }
      const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}` : 'Unknown';
      const requestPayload = {
        id: requestId,
        subject: subject.trim(),
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        unitUic: targetUic,
        uploadedById: targetUserId,
        documentIds: docs.map(d => d.id),
        createdAt: new Date().toISOString(),
        currentStage: 'PLATOON_REVIEW',
        activity: [
          { actor, timestamp: new Date().toISOString(), action: 'Submitted request', comment: (notes || '').trim() }
        ]
      };
      try {
        localStorage.setItem(`fs/requests/${requestId}.json`, JSON.stringify(requestPayload));
        await fetch('/api/requests/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestPayload) });
      } catch {}
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

  const saveDocEdits = () => {
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
      const key = selectedDoc.requestId ? `fs/requests/${selectedDoc.requestId}.json` : '';
      if (key) {
        let req: any = null;
        try {
          const raw = localStorage.getItem(key);
          if (raw) req = JSON.parse(raw);
        } catch {}
        if (!req) req = { id: selectedDoc.requestId, activity: [] };
        req.activity = Array.isArray(req.activity) ? [...req.activity, entry] : [entry];
        try {
          localStorage.setItem(key, JSON.stringify(req));
          fetch('/api/requests/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) }).catch(() => {});
        } catch {}
        setRequestActivity((prev) => [...prev, entry]);
      }
    } catch {}
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
          <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">{doc.currentStage}</span>
        )}
        {doc.fileUrl && (
          <a
            href={doc.fileUrl}
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

  const openInApp = (doc: Document) => {
    if (!doc.fileUrl) return;
    window.open(doc.fileUrl, '_blank');
  };

  const saveRequestEdits = async () => {
    if (!selectedRequest || !currentUser?.id || selectedRequest.uploadedById !== currentUser.id) {
      setFeedback({ type: 'error', message: 'Only the requester can edit this.' });
      return;
    }
    const now = Date.now();
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
      fileUrl: URL.createObjectURL(file)
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
      for (const d of newDocs) {
        const serializable = { ...d, uploadedAt: d.uploadedAt.toISOString() };
        try { localStorage.setItem(`fs/documents/${d.id}.json`, JSON.stringify(serializable)); } catch {}
        try { await fetch('/api/documents/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(serializable) }); } catch {}
      }
      try { localStorage.setItem(`fs/requests/${updatedRequest.id}.json`, JSON.stringify(updatedRequest)); } catch {}
      try { await fetch('/api/requests/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedRequest) }); } catch {}
      setDocuments(prev => [...prev, ...newDocs]);
      setUserRequests(prev => prev.map(r => (r.id === updatedRequest.id ? updatedRequest : r)));
      setSelectedRequest(updatedRequest);
      setAttachFiles([]);
      setFeedback({ type: 'success', message: newDocs.length ? 'Files added and request updated.' : 'Request updated.' });
    } catch {
      setFeedback({ type: 'error', message: 'Failed to update request.' });
    }
  };

  useEffect(() => {
    try {
      const byId = new Map<string, Document>();

      // 1) Gather any previously saved aggregate list
      try {
        const raw = localStorage.getItem('documents');
        if (raw) {
          const parsed = JSON.parse(raw) as (Omit<Document, 'uploadedAt'> & { uploadedAt: string })[];
          const restored = parsed.map(d => ({ ...d, uploadedAt: new Date(d.uploadedAt) })) as Document[];
          for (const d of restored) byId.set(d.id, d);
        }
      } catch {}

      // 2) Gather per-file localStorage entries written during uploads
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('fs/documents/') && key.endsWith('.json')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw) as (Omit<Document, 'uploadedAt'> & { uploadedAt: string });
              const restored: Document = { ...parsed, uploadedAt: new Date(parsed.uploadedAt) } as Document;
              byId.set(restored.id, restored);
            }
          }
        }
      } catch {}

      // 3) Gather static JSON files persisted to disk via API
      try {
        const staticDocModules = import.meta.glob('../documents/*.json', { eager: true });
        const staticDocs: any[] = Object.values(staticDocModules).map((m: any) => m?.default ?? m);
        for (const sd of staticDocs) {
          if (!sd || !sd.id) continue;
          const restored: Document = { ...sd, uploadedAt: new Date(sd.uploadedAt) } as Document;
          byId.set(restored.id, restored);
        }
      } catch {}

      setDocuments(Array.from(byId.values()));
    } catch {}
  }, []);

  useEffect(() => {
    if (selectedRequest) {
      setEditRequestSubject(selectedRequest.subject || '');
      setEditRequestDueDate(selectedRequest.dueDate || '');
      setEditRequestNotes(selectedRequest.notes || '');
      setAttachFiles([]);
    }
  }, [selectedRequest]);

  useEffect(() => {
    try {
      const serializable = documents.map(d => ({ ...d, uploadedAt: d.uploadedAt.toISOString() }));
      localStorage.setItem('documents', JSON.stringify(serializable));
    } catch {}
  }, [documents]);

  useEffect(() => {
    try {
      const collected: Request[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('fs/requests/') && key.endsWith('.json')) {
          const raw = localStorage.getItem(key);
          if (raw) collected.push(JSON.parse(raw));
        }
      }
      const staticReqModules = import.meta.glob('../requests/*.json', { eager: true });
      const staticReqs: Request[] = Object.values(staticReqModules).map((m: any) => (m?.default ?? m) as Request);
      const byId = new Map<string, Request>();
      for (const r of staticReqs) byId.set(r.id, r);
      for (const r of collected) byId.set(r.id, r);
      setUserRequests(Array.from(byId.values()));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('currentUser');
      if (raw) setCurrentUser(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const collected: any[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('fs/users/') && key.endsWith('.json')) {
          const rawU = localStorage.getItem(key);
          if (rawU) collected.push(JSON.parse(rawU));
        }
      }
      const staticUserModules = import.meta.glob('../users/*.json', { eager: true });
      const staticUsers: any[] = Object.values(staticUserModules).map((m: any) => (m?.default ?? m));
      const byId = new Map<string, any>();
      for (const u of staticUsers) if (u?.id) byId.set(u.id, u);
      for (const u of collected) if (u?.id) byId.set(u.id, u);
      setUsers(Array.from(byId.values()));
    } catch {}
  }, []);

  

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
            <span className="text-sm text-[var(--muted)]">{selectedFiles ? `${selectedFiles.length} file(s) selected` : 'No files selected'}</span>
            <div className="md:ml-auto flex gap-2">
              <button type="button" onClick={() => { setShowForm(false); setSelectedFiles(null); setSubject(''); setDueDate(''); setNotes(''); setFeedback(null); }} className="px-4 py-2 rounded-lg border border-brand-navy/30 text-brand-navy hover:bg-brand-cream">Cancel</button>
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
            <h3 className="text-lg font-semibold text-[var(--text)] mb-3">Your Requests</h3>
            <div className="space-y-3">
              {userRequests.filter(r => r.uploadedById === currentUser.id).map((r) => (
                <div key={r.id}>
                  <div className={isReturnedReq(r) ? "flex items-center justify-between p-4 border border-brand-red-2 rounded-lg bg-brand-cream" : "flex items-center justify-between p-4 border border-brand-navy/20 rounded-lg hover:bg-brand-cream/50"}>
                    <div>
                      <div className="font-medium text-[var(--text)]">{r.subject}</div>
                      <div className="text-sm text-[var(--muted)]">
                        {new Date(r.createdAt).toLocaleDateString()} • {documents.filter(d => d.requestId === r.id && d.type !== 'request').length} document(s)
                      </div>
                      {r.dueDate && (
                        <div className="text-xs text-[var(--muted)]">Due {new Date(r.dueDate).toLocaleDateString()}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {r.currentStage && (
                        <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">{r.currentStage}</span>
                      )}
                      {isReturnedReq(r) && (
                        <span className="px-2 py-1 text-xs bg-brand-red-2 text-brand-cream rounded-full">Returned</span>
                      )}
                      <button
                        className="px-3 py-1 text-xs bg-brand-navy text-brand-cream rounded hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold underline decoration-brand-red-2 underline-offset-2"
                        onClick={() => setExpandedRequests(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                        aria-expanded={!!expandedRequests[r.id]}
                        aria-controls={`req-docs-${r.id}`}
                      >
                        {expandedRequests[r.id] ? 'Hide' : 'Show'} Documents
                      </button>
                      <button
                        className="px-3 py-1 text-xs bg-brand-cream text-brand-navy rounded hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold underline decoration-brand-red-2 underline-offset-2"
                        onClick={() => setSelectedRequest(r)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  <div id={`req-docs-${r.id}`} className={expandedRequests[r.id] ? 'mt-2 space-y-2' : 'hidden'}>
                    {documents.filter(d => d.requestId === r.id && d.type !== 'request').map(d => (
                      <DocCard key={d.id} doc={d} />
                    ))}
                    {documents.filter(d => d.requestId === r.id && d.type !== 'request').length === 0 && (
                      <div className="text-sm text-[var(--muted)]">No documents</div>
                    )}
                  </div>
                </div>
              ))}
              {userRequests.filter(r => r.uploadedById === currentUser.id).length === 0 && (
                <div className="text-sm text-[var(--muted)]">No requests submitted</div>
              )}
            </div>
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
                    <input type="file" multiple onChange={(e) => setAttachFiles(e.target.files ? Array.from(e.target.files) : [])} className="hidden" accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png" />
                    Add Files
                  </label>
                  <span className="ml-2 text-xs text-[var(--muted)]">{attachFiles.length ? `${attachFiles.length} file(s) selected` : 'No files selected'}</span>
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
