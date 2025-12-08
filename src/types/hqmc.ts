export interface HQMCSection {
  id: string;
  name: string;
  type: 'MM' | 'MP' | 'FM';
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SectionRequest {
  id: string;
  section_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_review';
  priority: 'low' | 'medium' | 'high';
  submitted_by: string;
  submission_date: string;
  updated_at: string;
}

export interface SectionMember {
  id: string;
  user_id: string;
  section_id: string;
  role: 'member' | 'manager' | 'admin';
  assigned_at: string;
}

export interface HQMCAdmin {
  id: string;
  user_id: string;
  created_at: string;
}

export type UserRole = 'member' | 'manager' | 'admin';
export type SectionType = 'MM' | 'MP' | 'FM';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'in_review';
export type PriorityLevel = 'low' | 'medium' | 'high';