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
  finalStatus?: string;
}
export interface Installation {
  id: string;
  name: string;
  unitUics: string[];
  sections?: string[];
  commandSections?: string[];
  sectionAssignments?: Record<string, string[]>;
  commandSectionAssignments?: Record<string, string[]>;
  commanderUserId?: string;
}
export interface DocumentItem {
  id: string;
  name: string;
  uploadedAt: string;
  fileUrl?: string;
  requestId?: string;
}
export type UserRecord = {
  id: string
  email?: string
  rank?: string
  firstName?: string
  lastName?: string
  mi?: string
  service?: string
  role?: string
  unitUic?: string
  unit?: string
  company?: string
  isUnitAdmin?: boolean
  isInstallationAdmin?: boolean
  isCommandStaff?: boolean
  isAppAdmin?: boolean
  edipi?: string
  passwordHash?: string
  platoon?: string
  roleCompany?: string
  rolePlatoon?: string
  installationId?: string
  commandOrder?: number
}
export { HQMCSection, SectionRequest } from './types/hqmc'
