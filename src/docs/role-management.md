Element: Administrative role management panel

Purpose: Edit role, scope (unit/company/platoon), and command precedence order for a member.

Access: Only visible and actionable to Unit Admins and Commanders. Members cannot change these attributes.

Behavior:
- Role determines scope UI (company or company+platoon, or unit default).
- Changes persist to local storage and backend.
- Command order is a positive integer; lower means higher precedence.

Security: Validates inputs; enforces role-based access; preserves audit via request activity logs elsewhere.

