export interface ActionEntry {
  actor: string;
  actorRole?: string;
  timestamp: string;
  action: string;
  comment?: string;
  /** The section this action was routed from */
  fromSection?: string;
  /** The section this action is routing to */
  toSection?: string;
}

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
  activity?: ActionEntry[];
  commanderApprovalDate?: string;
  externalPendingUnitUic?: string;
  externalPendingUnitName?: string;
  externalPendingStage?: string;
  installationId?: string;
  finalStatus?: string;
  // SSIC/Retention fields
  ssic?: string;
  ssicNomenclature?: string;
  ssicBucket?: string;
  ssicBucketTitle?: string;
  isPermanent?: boolean;
  retentionValue?: number | null;
  retentionUnit?: string;
  cutoffTrigger?: string;
  cutoffDescription?: string;
  disposalAction?: string;
  dau?: string;
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
  isHqmcAdmin?: boolean
  hqmcDivision?: string
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
