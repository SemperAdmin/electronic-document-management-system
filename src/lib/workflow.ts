/**
 * Workflow Engine - Centralized request approval workflow logic
 *
 * This module encapsulates all business logic for:
 * - Stage definitions and transitions
 * - Permission checks (who can approve/view)
 * - Authorization logic (scope-based access)
 * - Workflow validation rules
 *
 * Instead of duplicating this logic across ReviewDashboard, CommandDashboard,
 * SectionDashboard, and DocumentManager, all components use this single source of truth.
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type WorkflowStage =
  | 'ORIGINATOR_REVIEW'
  | 'PLATOON_REVIEW'
  | 'COMPANY_REVIEW'
  | 'BATTALION_REVIEW'
  | 'COMMANDER_REVIEW'
  | 'ARCHIVED';

export type WorkflowAction =
  | 'APPROVE'
  | 'RETURN'
  | 'SUBMIT'
  | 'ROUTE'
  | 'ARCHIVE';

export type UserRole =
  | 'MEMBER'
  | 'PLATOON_REVIEWER'
  | 'COMPANY_REVIEWER'
  | 'BATTALION_REVIEWER'
  | 'COMMANDER';

export interface WorkflowUser {
  id: string;
  role?: string;
  email?: string;
  unitUic?: string;
  company?: string;
  unit?: string;
  platoon?: string;
  userPlatoon?: string;
  isAppAdmin?: boolean;
  isUnitAdmin?: boolean;
  isCommandStaff?: boolean;
}

export interface WorkflowRequest {
  id: string;
  currentStage?: string;
  routeSection?: string;
  uploadedById: string;
  unitUic?: string;
  activity?: Array<{
    actor: string;
    timestamp: string;
    action: string;
    comment?: string;
  }>;
}

export interface StageTransitionOptions {
  comment?: string;
  routeSection?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Initial stage for new requests (originator's inbox)
 */
export const ORIGINATOR_STAGE: WorkflowStage = 'ORIGINATOR_REVIEW';

/**
 * All workflow stages in sequential order
 */
export const WORKFLOW_STAGES: readonly WorkflowStage[] = [
  'ORIGINATOR_REVIEW',
  'PLATOON_REVIEW',
  'COMPANY_REVIEW',
  'BATTALION_REVIEW',
  'COMMANDER_REVIEW',
  'ARCHIVED',
] as const;

/**
 * Review stages (excludes originator and archived)
 */
export const REVIEW_STAGES: readonly WorkflowStage[] = [
  'PLATOON_REVIEW',
  'COMPANY_REVIEW',
  'BATTALION_REVIEW',
  'COMMANDER_REVIEW',
] as const;

// ============================================================================
// Stage Transitions
// ============================================================================

/**
 * Get the next stage in the workflow
 *
 * @param currentStage - Current workflow stage
 * @returns Next stage, or current stage if already at end
 *
 * @example
 * nextStage('PLATOON_REVIEW') // => 'COMPANY_REVIEW'
 * nextStage('ARCHIVED') // => 'ARCHIVED' (no further progression)
 */
export function nextStage(currentStage?: string): WorkflowStage {
  const stage = (currentStage || 'PLATOON_REVIEW') as WorkflowStage;
  const index = WORKFLOW_STAGES.indexOf(stage);

  if (index === -1) return 'PLATOON_REVIEW';
  if (index >= WORKFLOW_STAGES.length - 1) return stage;

  return WORKFLOW_STAGES[index + 1];
}

/**
 * Get the previous stage in the workflow
 *
 * @param currentStage - Current workflow stage
 * @returns Previous stage, or first review stage if at beginning
 *
 * @example
 * previousStage('COMPANY_REVIEW') // => 'PLATOON_REVIEW'
 * previousStage('PLATOON_REVIEW') // => 'PLATOON_REVIEW' (no further regression)
 */
export function previousStage(currentStage?: string): WorkflowStage {
  const stage = (currentStage || 'PLATOON_REVIEW') as WorkflowStage;
  const index = WORKFLOW_STAGES.indexOf(stage);

  if (index <= 0) return 'PLATOON_REVIEW';

  return WORKFLOW_STAGES[index - 1];
}

/**
 * Check if a stage is a valid workflow stage
 */
export function isValidStage(stage: string): stage is WorkflowStage {
  return WORKFLOW_STAGES.includes(stage as WorkflowStage);
}

/**
 * Check if a stage requires review (not originator or archived)
 */
export function isReviewStage(stage?: string): boolean {
  if (!stage) return false;
  return REVIEW_STAGES.includes(stage as WorkflowStage);
}

// ============================================================================
// User Role & Stage Mapping
// ============================================================================

/**
 * Determine which workflow stage a user is responsible for based on their role
 *
 * @param user - User object with role information
 * @returns The workflow stage this user reviews
 *
 * @example
 * getUserReviewStage({ role: 'PLATOON_REVIEWER' }) // => 'PLATOON_REVIEW'
 * getUserReviewStage({ role: 'COMPANY_REVIEWER' }) // => 'COMPANY_REVIEW'
 */
export function getUserReviewStage(user: WorkflowUser | null): WorkflowStage {
  if (!user?.role) return 'PLATOON_REVIEW';

  const role = String(user.role).toUpperCase();

  if (role.includes('COMMANDER')) return 'COMMANDER_REVIEW';
  if (role.includes('BATTALION')) return 'BATTALION_REVIEW';
  if (role.includes('COMPANY')) return 'COMPANY_REVIEW';
  if (role.includes('PLATOON')) return 'PLATOON_REVIEW';

  return 'PLATOON_REVIEW';
}

/**
 * Check if a user has a specific role
 */
export function hasRole(user: WorkflowUser | null, role: UserRole): boolean {
  if (!user?.role) return false;
  return String(user.role).toUpperCase().includes(role);
}

/**
 * Check if user is an admin (app admin, unit admin, or command staff)
 */
export function isAdmin(user: WorkflowUser | null): boolean {
  if (!user) return false;
  return !!(user.isAppAdmin || user.isUnitAdmin || user.isCommandStaff);
}

// ============================================================================
// Authorization & Permissions
// ============================================================================

/**
 * Check if a user can approve a request at its current stage
 *
 * This checks:
 * 1. User's role matches the current stage
 * 2. User has proper scope (unit/company/platoon) for the request
 *
 * @param user - User attempting to approve
 * @param request - Request to be approved
 * @param originator - User who created the request
 * @returns true if user can approve this request
 */
export function canApprove(
  user: WorkflowUser | null,
  request: WorkflowRequest,
  originator: WorkflowUser | null
): boolean {
  if (!user || !originator) return false;

  // App admins can approve anything
  if (user.isAppAdmin) return true;

  const currentStage = request.currentStage || 'PLATOON_REVIEW';
  const userStage = getUserReviewStage(user);

  // User's role must match the current stage
  if (currentStage !== userStage) return false;

  // Check scope based on role
  return isInScope(user, originator, request);
}

/**
 * Check if a request is within a user's scope (can view/manage it)
 *
 * Scope rules:
 * - PLATOON: Same company, unit, and UIC
 * - COMPANY: Same company and UIC
 * - BATTALION: Same UIC (with optional section routing)
 * - COMMANDER: Same UIC
 * - APP_ADMIN: All requests
 *
 * @param user - User checking scope
 * @param originator - User who created the request
 * @param request - The request being checked
 * @param platoonSectionMap - Optional mapping for battalion section routing
 * @returns true if request is in user's scope
 */
export function isInScope(
  user: WorkflowUser | null,
  originator: WorkflowUser | null,
  request: WorkflowRequest,
  platoonSectionMap?: Record<string, Record<string, Record<string, string>>>
): boolean {
  if (!user || !originator) return false;

  // App admins see everything
  if (user.isAppAdmin) return true;

  const role = String(user.role || '').toUpperCase();

  // Normalize company/unit fields (handle both field names)
  const originatorCompany = originator.company && originator.company !== 'N/A'
    ? originator.company
    : '';
  const originatorUnit = originator.unit && originator.unit !== 'N/A'
    ? originator.unit
    : '';
  const originatorUic = originator.unitUic || '';

  const userCompany = user.company && user.company !== 'N/A'
    ? user.company
    : '';
  const userUnit = user.unit && user.unit !== 'N/A'
    ? user.unit
    : '';
  const userUic = user.unitUic || '';

  // PLATOON REVIEWER: Same company, unit, and UIC
  if (role.includes('PLATOON')) {
    return originatorCompany === userCompany &&
           originatorUnit === userUnit &&
           (!userUic || originatorUic === userUic);
  }

  // COMPANY REVIEWER: Same company and UIC
  if (role.includes('COMPANY')) {
    return originatorCompany === userCompany &&
           (!userUic || originatorUic === userUic);
  }

  // BATTALION REVIEWER: Same UIC, with optional section routing
  if (role.includes('BATTALION')) {
    if (!userUic) return true; // No UIC restriction
    if (originatorUic !== userUic) return false;

    // Check section routing if applicable
    if (request.routeSection && platoonSectionMap) {
      const linkedSection = platoonSectionMap[userUic]?.[userCompany]?.[userUnit] || '';
      return linkedSection ? (request.routeSection === linkedSection) : true;
    }

    return true;
  }

  // COMMANDER: Same UIC
  if (role.includes('COMMANDER')) {
    return !userUic || originatorUic === userUic;
  }

  return false;
}

/**
 * Filter requests to only those a user can access
 *
 * @param requests - All requests
 * @param user - User filtering requests
 * @param users - Map of user IDs to user objects (for originator lookup)
 * @param platoonSectionMap - Optional battalion section routing map
 * @returns Requests within user's scope
 */
export function filterRequestsByScope(
  requests: WorkflowRequest[],
  user: WorkflowUser | null,
  users: Record<string, WorkflowUser>,
  platoonSectionMap?: Record<string, Record<string, Record<string, string>>>
): WorkflowRequest[] {
  if (!user) return [];

  return requests.filter(request => {
    const originator = users[request.uploadedById];
    return originator && isInScope(user, originator, request, platoonSectionMap);
  });
}

/**
 * Filter requests to only those at a specific stage
 */
export function filterRequestsByStage(
  requests: WorkflowRequest[],
  stage: WorkflowStage
): WorkflowRequest[] {
  return requests.filter(r => (r.currentStage || 'PLATOON_REVIEW') === stage);
}

/**
 * Get pending requests for a user (at their review stage and in their scope)
 */
export function getPendingRequests(
  requests: WorkflowRequest[],
  user: WorkflowUser | null,
  users: Record<string, WorkflowUser>,
  platoonSectionMap?: Record<string, Record<string, Record<string, string>>>
): WorkflowRequest[] {
  if (!user) return [];

  const userStage = getUserReviewStage(user);
  const inScope = filterRequestsByScope(requests, user, users, platoonSectionMap);

  return filterRequestsByStage(inScope, userStage);
}

// ============================================================================
// Request Status Checks
// ============================================================================

/**
 * Check if a request was returned (last activity contains "returned")
 */
export function isReturned(request: WorkflowRequest): boolean {
  if (!request.activity || request.activity.length === 0) {
    return false;
  }

  const lastActivity = request.activity[request.activity.length - 1];
  return /returned/i.test(String(lastActivity.action || ''));
}

/**
 * Check if a request is archived
 */
export function isArchived(request: WorkflowRequest): boolean {
  return request.currentStage === 'ARCHIVED';
}

/**
 * Check if a request is in originator review (needs revision)
 */
export function isInOriginatorReview(request: WorkflowRequest): boolean {
  return request.currentStage === 'ORIGINATOR_REVIEW';
}

// ============================================================================
// Stage Transition Actions
// ============================================================================

/**
 * Create an approval action for transitioning a request
 *
 * @param request - Request being approved
 * @param user - User approving the request
 * @param options - Optional routing section or comment
 * @returns Updated request with new stage and activity entry
 */
export function approveRequest(
  request: WorkflowRequest,
  user: WorkflowUser,
  options: StageTransitionOptions = {}
): WorkflowRequest {
  const { comment, routeSection } = options;
  const currentStage = request.currentStage || 'PLATOON_REVIEW';
  const newStage = nextStage(currentStage);

  const actor = formatUserName(user);
  const action = routeSection
    ? `Approved and routed to ${routeSection}`
    : 'Approved';

  const activityEntry = {
    actor,
    timestamp: new Date().toISOString(),
    action,
    comment: comment?.trim() || undefined,
  };

  return {
    ...request,
    currentStage: newStage,
    routeSection: (newStage === 'BATTALION_REVIEW' && routeSection)
      ? routeSection
      : request.routeSection,
    activity: [...(request.activity || []), activityEntry],
  };
}

/**
 * Create a return action for sending a request back
 *
 * @param request - Request being returned
 * @param user - User returning the request
 * @param options - Optional comment explaining why
 * @returns Updated request with previous stage and activity entry
 */
export function returnRequest(
  request: WorkflowRequest,
  user: WorkflowUser,
  options: StageTransitionOptions = {}
): WorkflowRequest {
  const { comment } = options;
  const currentStage = request.currentStage || 'PLATOON_REVIEW';

  // Return to originator if at platoon level, otherwise previous stage
  const newStage = currentStage === 'PLATOON_REVIEW'
    ? ORIGINATOR_STAGE
    : previousStage(currentStage);

  const actor = formatUserName(user);
  const action = currentStage === 'PLATOON_REVIEW'
    ? 'Returned to originator for revision'
    : 'Returned to previous stage';

  const activityEntry = {
    actor,
    timestamp: new Date().toISOString(),
    action,
    comment: comment?.trim() || undefined,
  };

  return {
    ...request,
    currentStage: newStage,
    activity: [...(request.activity || []), activityEntry],
  };
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Format user's display name for activity log
 */
export function formatUserName(user: WorkflowUser): string {
  const rank = user.role || '';
  const lastName = (user as any).lastName || '';
  const firstName = (user as any).firstName || '';
  const mi = (user as any).mi || '';

  if (lastName && firstName) {
    return `${rank} ${lastName}, ${firstName}${mi ? ` ${mi}` : ''}`;
  }

  return user.email || 'Unknown User';
}

/**
 * Get human-readable stage name
 */
export function getStageName(stage: WorkflowStage): string {
  const names: Record<WorkflowStage, string> = {
    ORIGINATOR_REVIEW: 'Originator Review',
    PLATOON_REVIEW: 'Platoon Review',
    COMPANY_REVIEW: 'Company Review',
    BATTALION_REVIEW: 'Battalion Review',
    COMMANDER_REVIEW: 'Commander Review',
    ARCHIVED: 'Archived',
  };

  return names[stage] || stage;
}

/**
 * Validate that a user can perform a specific action on a request
 */
export function validateAction(
  user: WorkflowUser | null,
  request: WorkflowRequest,
  action: WorkflowAction,
  originator: WorkflowUser | null
): { valid: boolean; error?: string } {
  if (!user) {
    return { valid: false, error: 'User not authenticated' };
  }

  if (!originator) {
    return { valid: false, error: 'Request originator not found' };
  }

  if (action === 'APPROVE' || action === 'RETURN') {
    if (!canApprove(user, request, originator)) {
      return {
        valid: false,
        error: 'User does not have permission to approve this request'
      };
    }
  }

  if (action === 'ARCHIVE' && !isAdmin(user)) {
    return { valid: false, error: 'Only admins can archive requests' };
  }

  return { valid: true };
}
