export interface Request {
  id: string;
  subject: string;
  dueDate?: string;
  notes?: string;
  unitUic?: string;
  uploadedById: string;
  submitForUserId?: string;
  documentIds: string[];
  createdAt: string;
  currentStage?: string;
  routeSection?: string;
  activity?: Array<{ actor: string; timestamp: string; action: string; comment?: string }>;
  commanderApprovalDate?: string;
  externalPendingUnitUic?: string;
  externalPendingUnitName?: string;
  externalPendingStage?: string;
  installationId?: string;
}
export interface Installation {
  id: string;
  name: string;
  unitUics: string[];
}
