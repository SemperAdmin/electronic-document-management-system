import React, { useEffect, useState, useMemo } from 'react';
import { Unit } from '../lib/units';
import { listDocumentsLegacy, upsertDocuments, listRequestsLegacy, upsertRequest, listUsersLegacy, DocumentRecord, RequestRecord } from '../lib/db';
import { deleteDocumentById, deleteRequestById, deleteDocumentsByRequestId } from '@/lib/db';
import { usePagination } from '@/hooks/usePagination';
import { useDocumentStorage } from '@/hooks/useDocumentStorage';
import { Pagination } from '@/components/Pagination';
import RequestTable from './RequestTable';
import { Request, UserRecord } from '../types';
import { normalizeString, hasReviewer } from '../lib/reviewers';
import { Stage, formatStageLabel, canRequesterEdit, originatorArchiveOnly } from '@/lib/stage';
import { logEvent } from '@/lib/logger';
import { supabaseClient } from '../lib/supabase';
import { validateFiles, validateFile, sanitizeFilename, MAX_FILES_PER_UPLOAD } from '@/lib/validation';
import { Document, ActionEntry, FeedbackMessage } from './documents/types';
import { DocCard, formatFileSize } from './documents/DocCard';
import { NewRequestForm } from './documents/NewRequestForm';
import { RequestDetailsModal } from './documents/RequestDetailsModal';

const STORAGE_BUCKET = 'edms-docs';

interface DocumentManagerProps {
  selectedUnit: Unit | null;
  currentUser?: any;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ selectedUnit, currentUser: cuProp }) => {
  // State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
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

  // Hooks
  const storage = useDocumentStorage();


  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) return;

    // Check if adding these files would exceed the limit
    if (selectedFiles.length + files.length > MAX_FILES_PER_UPLOAD) {
      setFeedback({
        type: 'error',
        message: `Cannot add ${files.length} file(s). Maximum ${MAX_FILES_PER_UPLOAD} files allowed per request.`
      });
      try { event.target.value = '' } catch {}
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const result = validateFile(file);
      if (result.valid) {
        validFiles.push(file);
      } else {
        errors.push(...result.errors);
      }
    }

    // Add valid files
    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }

    // Show errors if any files were rejected
    if (errors.length > 0) {
      setFeedback({
        type: 'error',
        message: errors.slice(0, 3).join(' ') + (errors.length > 3 ? ` (+${errors.length - 3} more errors)` : '')
      });
    }

    try { event.target.value = '' } catch {}
  };

  const archiveByOriginator = async () => {
    if (!selectedRequest || !currentUser?.id || selectedRequest.uploadedById !== currentUser.id) return;
    const entry = {
      actor: `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}`,
      timestamp: new Date().toISOString(),
      action: 'Archived by Originator',
      comment: (editRequestNotes || '').trim()
    };
    const updated: Request = {
      ...selectedRequest,
      currentStage: Stage.ARCHIVED,
      finalStatus: 'Archived',
      activity: Array.isArray(selectedRequest.activity) ? [...selectedRequest.activity, entry] : [entry]
    };
    try {
      const resReq = await upsertRequest(updated as unknown as RequestRecord);
      if (!resReq.ok) throw new Error(getApiErrorMessage(resReq, 'request_upsert_failed'));
      setUserRequests(prev => prev.map(r => (r.id === updated.id ? updated : r)));
      setSelectedRequest(updated);
      setFeedback({ type: 'success', message: 'Request archived.' });
    } catch (e: any) {
      setFeedback({ type: 'error', message: `Failed to archive: ${String(e?.message || e)}` });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    // Validate subject
    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      setFeedback({ type: 'error', message: 'Subject is required.' });
      return;
    }
    if (trimmedSubject.length > 500) {
      setFeedback({ type: 'error', message: 'Subject is too long (maximum 500 characters).' });
      return;
    }

    // Validate notes length
    if (notes.length > 5000) {
      setFeedback({ type: 'error', message: 'Notes are too long (maximum 5000 characters).' });
      return;
    }

    if (!currentUser?.id) {
      setFeedback({ type: 'error', message: 'Create a profile before submitting.' });
      return;
    }

    // Final validation of all selected files before upload
    if (selectedFiles.length > 0) {
      const validation = validateFiles(selectedFiles);
      if (!validation.valid) {
        setFeedback({ type: 'error', message: validation.errors[0] });
        return;
      }
    }

    setIsUploading(true);
    const now = Date.now();
    const targetUserId = submitForUserId || currentUser.id;
    const targetUser = users.find(u => u.id === targetUserId);
    const targetUic = selectedUnit ? selectedUnit.uic : (targetUser?.unitUic || 'N/A');
    const requestId = `req-${now}`;

    let docs: Document[] = [];

    // Supabase Storage upload
    async function uploadToSupabase(file: File, storagePath: string): Promise<string> {
      if (!supabaseClient) throw new Error('Supabase not configured')

      const { error: uploadError } = await supabaseClient.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, { upsert: true })

      if (uploadError) throw new Error(uploadError.message)

      const { data: urlData } = supabaseClient.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath)

      return urlData?.publicUrl || ''
    }

    if (selectedFiles && selectedFiles.length > 0) {
      const uploadedUrls: string[] = []
      for (let i = 0; i < selectedFiles.length; i++) {
        const f = selectedFiles[i]
        const storagePath = `${targetUic}/${requestId}/${now}-${i}-${sanitizeFilename(f.name)}`
        try {
          const url = await uploadToSupabase(f, storagePath)
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
      currentStage: hasPlatoonReviewer ? Stage.PLATOON_REVIEW : hasCompanyReviewer ? Stage.COMPANY_REVIEW : Stage.BATTALION_REVIEW,
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
        try { logEvent('request_persist_failed', { requestId, error: String(e?.message || e) }, 'error') } catch {}
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
      try { logEvent('request_persist_failed', { requestId }, 'error') } catch {}
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

  // Helper to render a document card with callbacks
  const renderDocCard = (doc: Document) => (
    <DocCard key={doc.id} doc={doc} onView={openDoc} onDelete={deleteDocument} />
  );

  const deleteDocument = async (doc: Document) => {
    const storagePath = storage.extractStoragePath(doc.fileUrl)
    try {
      if (storagePath && supabaseClient) {
        await supabaseClient.storage.from(STORAGE_BUCKET).remove([storagePath])
      }
    } catch {}
    try {
      await deleteDocumentById(doc.id)
      setDocuments(prev => prev.filter(d => d.id !== doc.id))
      if (doc.requestId) {
        setUserRequests(prev => prev.map(r => (r.id === doc.requestId ? { ...r, documentIds: (r.documentIds || []).filter(id => id !== doc.id) } : r)))
      }
      setFeedback({ type: 'success', message: 'Document deleted.' })
    } catch (e: any) {
      setFeedback({ type: 'error', message: `Failed to delete: ${String(e?.message || e)}` })
    }
  }

  const deleteRequest = async (req: Request) => {
    const folderPrefix = `${req.unitUic || 'N-A'}/${req.id}/`
    try {
      if (supabaseClient) {
        // List all files in the request folder and delete them
        const { data: files } = await supabaseClient.storage.from(STORAGE_BUCKET).list(folderPrefix.slice(0, -1))
        if (files && files.length > 0) {
          const paths = files.map((f: any) => `${folderPrefix.slice(0, -1)}/${f.name}`)
          await supabaseClient.storage.from(STORAGE_BUCKET).remove(paths)
        }
      }
    } catch {}
    try {
      await deleteDocumentsByRequestId(req.id)
      await deleteRequestById(req.id)
      setDocuments(prev => prev.filter(d => d.requestId !== req.id))
      setUserRequests(prev => prev.filter(r => r.id !== req.id))
      setSelectedRequest(null)
      setFeedback({ type: 'success', message: 'Request and files deleted.' })
    } catch (e: any) {
      setFeedback({ type: 'error', message: `Failed to delete request: ${String(e?.message || e)}` })
    }
  }


  const saveRequestEdits = async () => {
    if (!selectedRequest || !currentUser?.id || selectedRequest.uploadedById !== currentUser.id) {
      setFeedback({ type: 'error', message: 'Only the requester can edit this.' });
      return;
    }
    const now = Date.now();
    const sanitize2 = (n: string) => n.replace(/[^A-Za-z0-9._-]/g, '-')

    // Supabase Storage upload for attachments
    async function uploadAttachmentToSupabase(file: File, storagePath: string): Promise<string> {
      if (!supabaseClient) throw new Error('Supabase not configured')

      const { error: uploadError } = await supabaseClient.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, { upsert: true })

      if (uploadError) throw new Error(uploadError.message)

      const { data: urlData } = supabaseClient.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath)

      return urlData?.publicUrl || ''
    }

    const uploaded2: string[] = []
    for (let i = 0; i < attachFiles.length; i++) {
      const f = attachFiles[i]
      const storagePath = `${selectedRequest.unitUic || 'N-A'}/${selectedRequest.id}/${now}-${i}-${sanitize2(f.name)}`
      try {
        const url = await uploadAttachmentToSupabase(f, storagePath)
        uploaded2.push(url)
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
      const allowed = currentUser && canRequesterEdit(selectedRequest, String(currentUser.id || ''))
      if (!allowed) {
        setFeedback({ type: 'error', message: 'Editing is not allowed at the current stage unless returned.' })
        return
      }
      try {
        const resDocs = await upsertDocuments(newDocs as unknown as DocumentRecord[]);
        if (!resDocs.ok) throw new Error(getApiErrorMessage(resDocs, 'document_upsert_failed'));
        const resReq = await upsertRequest(updatedRequest as unknown as RequestRecord);
        if (!resReq.ok) throw new Error(getApiErrorMessage(resReq, 'request_upsert_failed'));
      } catch (e: any) {
        try { logEvent('request_update_failed', { requestId: updatedRequest.id, error: String(e?.message || e) }, 'error') } catch {}
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

  const [loadingDocuments, setLoadingDocuments] = useState<boolean>(true)
  const [loadingRequests, setLoadingRequests] = useState<boolean>(true)
  useEffect(() => {
    listDocumentsLegacy().then((remote) => {
      setDocuments(remote as any);
    }).catch(() => setDocuments([])).finally(() => setLoadingDocuments(false));
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
    listRequestsLegacy().then((remote) => {
      setUserRequests(remote as any);
    }).catch(() => setUserRequests([])).finally(() => setLoadingRequests(false));
  }, []);

  useEffect(() => { setCurrentUser(cuProp || null) }, [cuProp]);

  useEffect(() => {
    listUsersLegacy().then((remote) => {
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
                className={`w-full px-3 py-2 border ${subject.trim() ? 'border-brand-navy/30' : 'border-brand-red'} rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold`}
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
              <button type="submit" className="bg-brand-gold text-brand-charcoal px-4 py-2 rounded-lg hover:bg-brand-gold-2 transition-colors disabled:opacity-60" disabled={!subject.trim()}>Submit</button>
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
            <div className="flex items-center justify-between py-2 text-sm text-[var(--muted)]">
              <div>{requestsPagination.totalItems > 0 ? `${requestsPagination.startIndex}–${requestsPagination.endIndex} of ${requestsPagination.totalItems}` : ''}</div>
              {loadingRequests && <div className="animate-pulse">Loading requests…</div>}
            </div>
            <RequestTable
              title="Your Requests"
              requests={loadingRequests ? Array.from({ length: 5 }).map((_, i) => ({ id: `s-${i}`, subject: '', uploadedById: '', documentIds: [], createdAt: new Date().toISOString(), currentStage: Stage.PLATOON_REVIEW } as any)) : requestsPagination.currentData}
              users={usersByIdMap}
              onRowClick={(r) => setSelectedRequest(r)}
              expandedRows={expandedRequests}
            >
              {(r: Request) => (
                <div id={`req-docs-${r.id}`}>
                  {loadingDocuments ? (
                    <div className="h-16 rounded bg-gray-100 animate-pulse" />
                  ) : (
                    documents.filter(d => d.requestId === r.id && d.type !== 'request').map(d => (
                      <DocCard key={d.id} doc={d} onView={openDoc} onDelete={deleteDocument} />
                    ))
                  )}
                  {!loadingDocuments && documents.filter(d => d.requestId === r.id && d.type !== 'request').length === 0 && (
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
                    <DocCard key={d.id} doc={d} onView={openDoc} onDelete={deleteDocument} />
                  ))}
                </div>
                {!originatorArchiveOnly(selectedRequest as any, String(currentUser?.id || '')) && (
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
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="px-4 py-2 rounded-lg border border-brand-navy/30 text-brand-navy hover:bg-brand-cream" onClick={() => setSelectedRequest(null)}>Close</button>
              {originatorArchiveOnly(selectedRequest as any, String(currentUser?.id || '')) ? (
                <button className="px-4 py-2 rounded-lg bg-brand-gold text-brand-charcoal hover:brightness-110" onClick={archiveByOriginator}>Archive</button>
              ) : (
                <button className="px-4 py-2 rounded-lg bg-brand-navy text-brand-cream hover:brightness-110" onClick={saveRequestEdits} disabled={!currentUser || currentUser.id !== (selectedRequest?.uploadedById || '')}>Save Changes</button>
              )}
              {currentUser && currentUser.id === (selectedRequest?.uploadedById || '') && (
                <button className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700" onClick={() => deleteRequest(selectedRequest!)}>Delete Request</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
