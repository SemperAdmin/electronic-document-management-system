import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Unit } from '../lib/units';
import { listDocumentsLegacy, upsertDocuments, listRequestsLegacy, upsertRequest, listUsersLegacy, DocumentRecord, RequestRecord } from '../lib/db';
import { deleteDocumentById, deleteRequestById, deleteDocumentsByRequestId } from '@/lib/db';
import { usePagination } from '@/hooks/usePagination';
import { useDocumentStorage } from '@/hooks/useDocumentStorage';
import { Pagination } from '@/components/Pagination';
import RequestTable from './RequestTable';
import { Request, UserRecord } from '../types';
import { normalizeString, hasReviewer } from '../lib/reviewers';
import { Stage, formatStageLabel, canRequesterEdit, originatorArchiveOnly, canDeleteRequest } from '@/lib/stage';
import { logEvent } from '@/lib/logger';
import { supabaseClient } from '../lib/supabase';
import { validateFiles, validateFile, sanitizeFilename, MAX_FILES_PER_UPLOAD } from '@/lib/validation';
import { Document, ActionEntry, FeedbackMessage } from './documents/types';
import { DocCard, formatFileSize } from './documents/DocCard';
import { NewRequestForm } from './documents/NewRequestForm';
import { RequestDetailsModal } from './documents/RequestDetailsModal';
import { SsicSearch, SsicSelection, RetentionInfoPanel } from './common';
import { loadUnitStructureFromBundle } from '@/lib/unitStructure';

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
  const [activeTab, setActiveTab] = useState<'Pending' | 'Files'>('Pending');
  const [unitSections, setUnitSections] = useState<Record<string, string[]>>({});
  const [selectedBattalionSection, setSelectedBattalionSection] = useState<string>('');
  const [ssicSelection, setSsicSelection] = useState<SsicSelection | null>(null);
  const [requestDetailTab, setRequestDetailTab] = useState<'documents' | 'retention' | 'activity'>('documents');
  const [editingRetention, setEditingRetention] = useState<boolean>(false);
  const [retentionSsicSelection, setRetentionSsicSelection] = useState<SsicSelection | null>(null);

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

  const resubmitRequest = async () => {
    if (!selectedRequest || !currentUser?.id || selectedRequest.uploadedById !== currentUser.id) return;

    // Determine which stage to route to based on available reviewers
    const originator = users.find(u => u.id === selectedRequest.uploadedById);
    const originUnitUic = selectedRequest.unitUic || originator?.unitUic || '';
    const originCompany = normalizeString(originator?.company);
    const originPlatoon = normalizeString(originator?.platoon);

    const hasPlatoonReviewer = hasReviewer(users, 'PLATOON_REVIEWER', { company: originCompany, platoon: originPlatoon, uic: originUnitUic });
    const hasCompanyReviewer = hasReviewer(users, 'COMPANY_REVIEWER', { company: originCompany, uic: originUnitUic });

    const targetStage = hasPlatoonReviewer ? Stage.PLATOON_REVIEW : hasCompanyReviewer ? Stage.COMPANY_REVIEW : Stage.BATTALION_REVIEW;

    const entry = {
      actor: `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}`,
      actorRole: 'Member',
      timestamp: new Date().toISOString(),
      action: 'Resubmitted request',
      comment: (editRequestNotes || '').trim()
    };

    const updated: Request = {
      ...selectedRequest,
      currentStage: targetStage,
      routeSection: '', // Clear any routing section
      activity: [...(selectedRequest.activity || []), entry]
    };

    try {
      const resReq = await upsertRequest(updated as unknown as RequestRecord);
      if (!resReq.ok) throw new Error(getApiErrorMessage(resReq, 'request_upsert_failed'));
      setUserRequests(prev => prev.map(r => (r.id === updated.id ? updated : r)));
      setSelectedRequest(updated);
      setEditRequestNotes('');
      setFeedback({ type: 'success', message: 'Request resubmitted for review.' });
    } catch (e: any) {
      setFeedback({ type: 'error', message: `Failed to resubmit: ${String(e?.message || e)}` });
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
      const actorRole = 'Member'
      const originUnitUic = targetUic;
      const originCompany = normalizeString(targetUser?.company);
      const originPlatoon = normalizeString(targetUser?.platoon);

      const hasPlatoonReviewer = hasReviewer(users, 'PLATOON_REVIEWER', { company: originCompany, platoon: originPlatoon, uic: originUnitUic });
      const hasCompanyReviewer = hasReviewer(users, 'COMPANY_REVIEWER', { company: originCompany, uic: originUnitUic });
      const goesDirectlyToBattalion = !hasPlatoonReviewer && !hasCompanyReviewer;

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
      routeSection: goesDirectlyToBattalion && selectedBattalionSection ? selectedBattalionSection : undefined,
      // SSIC/Retention fields
      ssic: ssicSelection?.ssic,
      ssicNomenclature: ssicSelection?.nomenclature,
      ssicBucket: ssicSelection?.bucket,
      ssicBucketTitle: ssicSelection?.bucketTitle,
      isPermanent: ssicSelection?.isPermanent,
      retentionValue: ssicSelection?.retentionValue,
      retentionUnit: ssicSelection?.retentionUnit,
      cutoffTrigger: ssicSelection?.cutoffTrigger,
      cutoffDescription: ssicSelection?.cutoffDescription,
      disposalAction: ssicSelection?.disposalAction,
      dau: ssicSelection?.dau,
      activity: [
        { actor, actorRole, timestamp: new Date().toISOString(), action: 'Submitted request', comment: (notes || '').trim() }
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
      setSelectedBattalionSection('');
      setSsicSelection(null);
      } catch {
      setIsUploading(false);
      try { logEvent('request_persist_failed', { requestId }, 'error') } catch {}
      setFeedback({ type: 'error', message: 'Failed to persist submission.' });
    }
  };

  const openDoc = useCallback((doc: Document) => {
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
  }, []);

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
      const actorRole = 'Member'
      const entry: ActionEntry = { actor, actorRole, timestamp: new Date().toISOString(), action: 'Updated document', comment: (editNotes || '').trim() };
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

  // Check if request needs resubmission by originator
  const needsResubmit = (r: Request) => r.currentStage === 'ORIGINATOR_REVIEW';

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

  const deleteDocument = useCallback(async (doc: Document) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteRequest = useCallback(async (req: Request) => {
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
  }, []);


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

  const saveRetentionUpdate = async () => {
    if (!selectedRequest || !currentUser || !retentionSsicSelection) return;

    const actor = `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}`;
    const actorRole = currentUser.role || 'Reviewer';

    const entry = {
      actor,
      actorRole,
      timestamp: new Date().toISOString(),
      action: 'Updated retention classification',
      comment: `Changed SSIC to ${retentionSsicSelection.ssic} - ${retentionSsicSelection.nomenclature}`
    };

    const updatedRequest: Request = {
      ...selectedRequest,
      ssic: retentionSsicSelection.ssic,
      ssicNomenclature: retentionSsicSelection.nomenclature,
      ssicBucket: retentionSsicSelection.bucket,
      ssicBucketTitle: retentionSsicSelection.bucketTitle,
      isPermanent: retentionSsicSelection.isPermanent,
      retentionValue: retentionSsicSelection.retentionValue,
      retentionUnit: retentionSsicSelection.retentionUnit,
      cutoffTrigger: retentionSsicSelection.cutoffTrigger,
      cutoffDescription: retentionSsicSelection.cutoffDescription,
      disposalAction: retentionSsicSelection.disposalAction,
      dau: retentionSsicSelection.dau,
      activity: [...(selectedRequest.activity || []), entry]
    };

    try {
      const resReq = await upsertRequest(updatedRequest as unknown as RequestRecord);
      if (!resReq.ok) throw new Error(getApiErrorMessage(resReq, 'request_upsert_failed'));

      setUserRequests(prev => prev.map(r => (r.id === updatedRequest.id ? updatedRequest : r)));
      setSelectedRequest(updatedRequest);
      setEditingRetention(false);
      setRetentionSsicSelection(null);
      setFeedback({ type: 'success', message: 'Retention classification updated.' });
    } catch (e: any) {
      setFeedback({ type: 'error', message: `Failed to update retention: ${String(e?.message || e)}` });
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
      setEditingRetention(false);
      setRetentionSsicSelection(null);
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

  // Load unit sections for battalion section selector
  useEffect(() => {
    try {
      const rawUs = localStorage.getItem('unit_structure');
      const secMap: Record<string, string[]> = {};
      if (rawUs) {
        const parsed = JSON.parse(rawUs);
        for (const uic of Object.keys(parsed || {})) {
          const v = parsed[uic];
          if (v && Array.isArray(v._sections)) secMap[uic] = v._sections;
        }
        setUnitSections(secMap);
      } else {
        (async () => {
          try {
            const merged = await loadUnitStructureFromBundle();
            for (const uic of Object.keys(merged || {})) {
              const v = (merged as any)[uic];
              if (v && Array.isArray(v._sections)) secMap[uic] = v._sections;
            }
            setUnitSections(secMap);
          } catch {}
        })();
      }
    } catch {}
  }, []);

  // Filter user's requests for Pending tab
  const myRequests = useMemo(() => {
    if (!currentUser?.id) return [];
    const filtered = userRequests.filter(r => r.uploadedById === currentUser.id);
    // Pending tab shows non-archived requests
    return filtered.filter(r => r.currentStage !== 'ARCHIVED');
  }, [userRequests, currentUser]);

  // Get disposal year from request (returns "Permanent" for permanent records or the year as string)
  const getDisposalYear = useCallback((request: Request): string => {
    if (request.isPermanent) return 'Permanent';
    if (!request.retentionValue || !request.cutoffTrigger) return 'Unknown';

    const createdDate = new Date(request.createdAt);
    let cutoffDate: Date;

    switch (request.cutoffTrigger) {
      case 'CALENDAR_YEAR':
        cutoffDate = new Date(createdDate.getFullYear(), 11, 31);
        break;
      case 'FISCAL_YEAR':
        cutoffDate = createdDate.getMonth() >= 9
          ? new Date(createdDate.getFullYear() + 1, 8, 30)
          : new Date(createdDate.getFullYear(), 8, 30);
        break;
      default:
        cutoffDate = createdDate;
    }

    const disposalDate = new Date(cutoffDate);
    if (request.retentionUnit === 'years') {
      disposalDate.setFullYear(disposalDate.getFullYear() + request.retentionValue);
    } else if (request.retentionUnit === 'months') {
      disposalDate.setMonth(disposalDate.getMonth() + request.retentionValue);
    } else if (request.retentionUnit === 'days') {
      disposalDate.setDate(disposalDate.getDate() + request.retentionValue);
    }

    return disposalDate.getFullYear().toString();
  }, []);

  // Group records by disposal year, then by bucket
  type GroupedRecords = Record<string, Record<string, Request[]>>;

  const groupedRecords = useMemo<GroupedRecords>(() => {
    if (!currentUser?.id) return {};

    const records = userRequests.filter(r => r.uploadedById === currentUser.id && r.ssic);
    const grouped: GroupedRecords = {};

    for (const record of records) {
      const year = getDisposalYear(record);
      const bucket = record.ssicBucketTitle || record.ssicBucket || 'Uncategorized';

      if (!grouped[year]) {
        grouped[year] = {};
      }
      if (!grouped[year][bucket]) {
        grouped[year][bucket] = [];
      }
      grouped[year][bucket].push(record);
    }

    // Sort records within each bucket by date created (newest first)
    for (const year of Object.keys(grouped)) {
      for (const bucket of Object.keys(grouped[year])) {
        grouped[year][bucket].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    }

    return grouped;
  }, [userRequests, currentUser, getDisposalYear]);

  // Get sorted year keys (Permanent first, then years in ascending order)
  const sortedYearKeys = useMemo(() => {
    const years = Object.keys(groupedRecords);
    return years.sort((a, b) => {
      if (a === 'Permanent') return -1;
      if (b === 'Permanent') return 1;
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return parseInt(a) - parseInt(b);
    });
  }, [groupedRecords]);

  // Calculate disposal date based on retention rules
  const calculateDisposalDate = useCallback((request: Request): string => {
    if (!request.retentionValue || !request.cutoffTrigger) return 'N/A';
    if (request.isPermanent) return 'Permanent';

    const createdDate = new Date(request.createdAt);
    let cutoffDate: Date;

    switch (request.cutoffTrigger) {
      case 'CALENDAR_YEAR':
        cutoffDate = new Date(createdDate.getFullYear(), 11, 31); // Dec 31
        break;
      case 'FISCAL_YEAR':
        // Fiscal year ends Sep 30
        cutoffDate = createdDate.getMonth() >= 9
          ? new Date(createdDate.getFullYear() + 1, 8, 30)
          : new Date(createdDate.getFullYear(), 8, 30);
        break;
      default:
        cutoffDate = createdDate;
    }

    // Add retention period
    const disposalDate = new Date(cutoffDate);
    if (request.retentionUnit === 'years') {
      disposalDate.setFullYear(disposalDate.getFullYear() + request.retentionValue);
    } else if (request.retentionUnit === 'months') {
      disposalDate.setMonth(disposalDate.getMonth() + request.retentionValue);
    } else if (request.retentionUnit === 'days') {
      disposalDate.setDate(disposalDate.getDate() + request.retentionValue);
    }

    return disposalDate.toLocaleDateString();
  }, []);

  // Get originator name
  const getOriginatorName = useCallback((request: Request): string => {
    const user = users.find(u => u.id === request.uploadedById);
    if (!user) return 'Unknown';
    return `${user.lastName}, ${user.firstName?.charAt(0) || ''}`;
  }, [users]);

  // Pagination for user requests
  const requestsPagination = usePagination(myRequests, { pageSize: 10 });

  const usersByIdMap = useMemo(() => users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {}), [users]);

  // Check if originator needs to select a battalion section (no platoon/company reviewers)
  const needsBattalionSection = useMemo(() => {
    const targetUserId = submitForUserId || currentUser?.id;
    const targetUser = users.find(u => u.id === targetUserId);
    const targetUic = selectedUnit ? selectedUnit.uic : (targetUser?.unitUic || '');
    const originCompany = normalizeString(targetUser?.company);
    const originPlatoon = normalizeString(targetUser?.platoon);

    if (!targetUic) return false;

    const hasPlatoonReviewer = hasReviewer(users, 'PLATOON_REVIEWER', { company: originCompany, platoon: originPlatoon, uic: targetUic });
    const hasCompanyReviewer = hasReviewer(users, 'COMPANY_REVIEWER', { company: originCompany, uic: targetUic });

    return !hasPlatoonReviewer && !hasCompanyReviewer;
  }, [users, currentUser, submitForUserId, selectedUnit]);

  // Get available sections for the current unit
  const availableSections = useMemo(() => {
    const targetUserId = submitForUserId || currentUser?.id;
    const targetUser = users.find(u => u.id === targetUserId);
    const targetUic = selectedUnit ? selectedUnit.uic : (targetUser?.unitUic || '');
    return unitSections[targetUic] || [];
  }, [unitSections, users, currentUser, submitForUserId, selectedUnit]);

  // Get friendly status label for a request
  const getStatusLabel = useCallback((r: Request): { level: string; scope: string } => {
    const stage = normalizeString(r.currentStage || 'PLATOON_REVIEW');
    const originator = users.find(u => u.id === r.uploadedById);

    switch (stage) {
      case 'ORIGINATOR_REVIEW':
        return { level: 'Member', scope: '' };
      case 'PLATOON_REVIEW': {
        const c = originator?.company && originator.company !== 'N/A' ? originator.company : '';
        const p = originator?.platoon && originator.platoon !== 'N/A' ? originator.platoon : '';
        if (c && p) return { level: 'Platoon', scope: `(${c}-${p})` };
        if (c) return { level: 'Platoon', scope: `(${c})` };
        return { level: 'Platoon', scope: '' };
      }
      case 'COMPANY_REVIEW': {
        const c = originator?.company && originator.company !== 'N/A' ? originator.company : '';
        return { level: 'Company', scope: c ? `(${c})` : '' };
      }
      case 'BATTALION_REVIEW':
        return { level: 'Battalion', scope: r.routeSection ? `(${r.routeSection})` : '' };
      case 'COMMANDER_REVIEW':
        return { level: 'Commander', scope: r.routeSection ? `(${r.routeSection})` : '' };
      case 'ARCHIVED':
        return { level: 'Archived', scope: '' };
      default:
        return { level: formatStageLabel(r), scope: '' };
    }
  }, [users]);

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

          <div>
            <SsicSearch
              value={ssicSelection}
              onChange={setSsicSelection}
              required
            />
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

          {needsBattalionSection && availableSections.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Battalion Section</label>
                <select
                  value={selectedBattalionSection}
                  onChange={(e) => setSelectedBattalionSection(e.target.value)}
                  className={`w-full px-3 py-2 border ${selectedBattalionSection ? 'border-brand-navy/30' : 'border-brand-gold'} rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold`}
                >
                  <option value="">Select section</option>
                  {availableSections.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <p className="text-xs text-[var(--muted)] mt-1">No platoon/company reviewer available. Select a section for routing.</p>
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
              <button type="button" onClick={() => { setShowForm(false); setSelectedFiles([]); setSubject(''); setDueDate(''); setNotes(''); setSelectedBattalionSection(''); setSsicSelection(null); setFeedback(null); }} className="px-4 py-2 rounded-lg border border-brand-navy/30 text-brand-navy hover:bg-brand-cream">Cancel</button>
              <button type="submit" className="bg-brand-gold text-brand-charcoal px-4 py-2 rounded-lg hover:bg-brand-gold-2 transition-colors disabled:opacity-60" disabled={!subject.trim() || !ssicSelection}>Submit</button>
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
                  onClick={() => setActiveTab('Files')}
                  className={`${activeTab === 'Files' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Files
                </button>
              </nav>
            </div>

            {/* Pending Tab Content */}
            {activeTab === 'Pending' && (
              <>
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
              </>
            )}

            {/* Files Tab Content - Records Management Dashboard */}
            {activeTab === 'Files' && (
              <div className="py-4 space-y-6">
                {loadingRequests ? (
                  <div className="animate-pulse">Loading records…</div>
                ) : sortedYearKeys.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No records with retention classification yet.</p>
                    <p className="text-sm mt-1">Create a new request with SSIC classification to see records here.</p>
                  </div>
                ) : (
                  <>
                    {/* Records grouped by disposal year, then by bucket */}
                    {sortedYearKeys.map((year) => {
                      const buckets = groupedRecords[year];
                      const sortedBuckets = Object.keys(buckets).sort();
                      const isPermanentYear = year === 'Permanent';
                      const recordCount = Object.values(buckets).reduce((sum, arr) => sum + arr.length, 0);

                      return (
                        <div key={year} className="space-y-3">
                          {/* Year Header */}
                          <div className={`${isPermanentYear ? 'bg-blue-800' : 'bg-brand-navy'} text-brand-cream px-4 py-2 rounded-lg font-medium flex items-center justify-between`}>
                            <span>
                              {isPermanentYear ? 'Permanent Records' : `Disposal Year: ${year}`}
                            </span>
                            <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
                              {recordCount} record{recordCount !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Buckets within year */}
                          {sortedBuckets.map((bucket) => {
                            const records = buckets[bucket];
                            return (
                              <div key={`${year}-${bucket}`} className="ml-4">
                                {/* Bucket Header */}
                                <div className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-t-lg font-medium text-sm border border-b-0 border-gray-200 flex items-center justify-between">
                                  <span>{bucket}</span>
                                  <span className="text-xs text-gray-500">{records.length} item{records.length !== 1 ? 's' : ''}</span>
                                </div>

                                {/* Records Table */}
                                <div className="border border-gray-200 rounded-b-lg overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Name</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">SSIC</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Retention</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Disposal Date</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Originator</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Date Created</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Disposal Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {records.map((r) => (
                                        <tr
                                          key={r.id}
                                          className="hover:bg-gray-50 cursor-pointer"
                                          onClick={() => setSelectedRequest(r)}
                                        >
                                          <td className="px-3 py-2 font-medium text-brand-navy">{r.subject}</td>
                                          <td className="px-3 py-2">{r.ssic}</td>
                                          <td className="px-3 py-2">
                                            {r.isPermanent ? (
                                              <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                                Permanent
                                              </span>
                                            ) : (
                                              <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                                                {r.retentionValue} {r.retentionUnit}
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2">{calculateDisposalDate(r)}</td>
                                          <td className="px-3 py-2">{getOriginatorName(r)}</td>
                                          <td className="px-3 py-2">{new Date(r.createdAt).toLocaleDateString()}</td>
                                          <td className="px-3 py-2">{r.disposalAction || (r.isPermanent ? 'TRANSFER' : 'DESTROY')}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
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
                        <div className="font-medium">{a.actor}{a.actorRole ? ` • ${a.actorRole}` : ''} • {new Date(a.timestamp).toLocaleString()} • {a.action}</div>
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
              {selectedRequest.currentStage && (() => {
                const { level, scope } = getStatusLabel(selectedRequest);
                return (
                  <span className="inline-flex flex-col items-center px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-lg border border-brand-navy/30 leading-tight">
                    <span>{level}</span>
                    {scope && <span className="text-[10px]">{scope}</span>}
                  </span>
                );
              })()}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Notes</label>
                <textarea rows={3} value={editRequestNotes} onChange={(e) => setEditRequestNotes(e.target.value)} className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold" />
              </div>

              {/* Tabbed Navigation */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-4" aria-label="Request details tabs">
                  <button
                    onClick={() => setRequestDetailTab('documents')}
                    className={`${requestDetailTab === 'documents' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                  >
                    Documents
                  </button>
                  <button
                    onClick={() => setRequestDetailTab('retention')}
                    className={`${requestDetailTab === 'retention' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                  >
                    Retention
                  </button>
                  <button
                    onClick={() => setRequestDetailTab('activity')}
                    className={`${requestDetailTab === 'activity' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                  >
                    Activity
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="mt-3">
                {/* Documents Tab */}
                {requestDetailTab === 'documents' && (
                  <div className="space-y-3">
                    {documents.filter(d => d.requestId === selectedRequest.id && d.type !== 'request').length > 0 ? (
                      documents.filter(d => d.requestId === selectedRequest.id && d.type !== 'request').map(d => (
                        <DocCard key={d.id} doc={d} onView={openDoc} onDelete={deleteDocument} />
                      ))
                    ) : (
                      <div className="text-sm text-[var(--muted)]">No documents attached</div>
                    )}
                    {!originatorArchiveOnly(selectedRequest as any, String(currentUser?.id || '')) && (
                      <div className="mt-3">
                        <label className="bg-brand-navy text-brand-cream px-3 py-1 rounded-lg hover:brightness-110 cursor-pointer inline-block">
                          <input type="file" multiple onChange={(e) => { const files = e.target.files ? Array.from(e.target.files) : []; setAttachFiles(prev => [...prev, ...files]); try { e.target.value = '' } catch {} }} className="hidden" accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png" />
                          Add Files
                        </label>
                        <div className="ml-2 flex flex-wrap gap-2 mt-2">
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
                )}

                {/* Retention Tab */}
                {requestDetailTab === 'retention' && (
                  <div>
                    {editingRetention ? (
                      <div className="space-y-4">
                        <SsicSearch
                          value={retentionSsicSelection}
                          onChange={setRetentionSsicSelection}
                          required
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => { setEditingRetention(false); setRetentionSsicSelection(null); }}
                            className="px-3 py-1 rounded border border-brand-navy/30 text-brand-navy hover:bg-brand-cream text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={saveRetentionUpdate}
                            disabled={!retentionSsicSelection}
                            className="px-3 py-1 rounded bg-brand-navy text-brand-cream hover:brightness-110 text-sm disabled:opacity-50"
                          >
                            Save Retention
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {selectedRequest.ssic ? (
                          <RetentionInfoPanel request={selectedRequest} />
                        ) : (
                          <div className="text-sm text-[var(--muted)] p-4 bg-gray-50 rounded-lg">
                            No retention information available for this request.
                          </div>
                        )}
                        {/* Edit button for reviewers - anyone can update retention for now */}
                        {currentUser && selectedRequest.currentStage !== 'ARCHIVED' && (
                          <button
                            type="button"
                            onClick={() => setEditingRetention(true)}
                            className="mt-3 px-3 py-1 rounded border border-brand-navy/30 text-brand-navy hover:bg-brand-cream text-sm"
                          >
                            {selectedRequest.ssic ? 'Change Retention' : 'Add Retention Info'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Activity Tab */}
                {requestDetailTab === 'activity' && (
                  <div className="space-y-2">
                    {selectedRequest.activity && selectedRequest.activity.length ? (
                      selectedRequest.activity.map((a, idx) => (
                        <div key={idx} className="text-xs text-gray-700 p-2 bg-gray-50 rounded">
                          <div className="font-medium">{a.actor}{a.actorRole ? ` • ${a.actorRole}` : ''} • {new Date(a.timestamp).toLocaleString()} • {a.action}</div>
                          {a.comment && <div className="text-gray-600 mt-1">{a.comment}</div>}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-[var(--muted)]">No activity recorded</div>
                    )}
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
              {currentUser && needsResubmit(selectedRequest) && currentUser.id === selectedRequest.uploadedById && (
                <button className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700" onClick={resubmitRequest}>Resubmit</button>
              )}
              {currentUser && canDeleteRequest(selectedRequest as any, String(currentUser?.id || '')) && (
                <button className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700" onClick={() => deleteRequest(selectedRequest!)}>Delete Request</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
