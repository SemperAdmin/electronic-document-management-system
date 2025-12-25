import { Request, UserRecord } from '@/types';

export interface Document {
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

export interface ActionEntry {
  actor: string;
  timestamp: string;
  action: string;
  comment?: string;
}

export interface FeedbackMessage {
  type: 'success' | 'error';
  message: string;
}

export interface DocumentManagerState {
  documents: Document[];
  userRequests: Request[];
  users: UserRecord[];
  currentUser: UserRecord | null;
  isUploading: boolean;
  loadingDocuments: boolean;
  loadingRequests: boolean;
  feedback: FeedbackMessage | null;
}

export interface RequestFormData {
  subject: string;
  dueDate: string;
  notes: string;
  selectedFiles: File[];
  submitForUserId: string;
}
