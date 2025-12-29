# EDMS Request Workflow – Swim Lane Diagram

## Overview

This document describes the complete workflow for document requests in the Electronic Document Management System (EDMS). Requests flow through multiple review stages, with actions available at each stage depending on the reviewer's role. Upon completion, requests are "filed" with retention information for records management.

---

## Swim Lane Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              EDMS REQUEST WORKFLOW                                                                       │
├──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬────────────────┤
│  ORIGINATOR  │   PLATOON    │   COMPANY    │  BATTALION   │ UNIT COMMAND │    UNIT      │ INSTALLATION │ INSTALLATION │     HQMC       │
│              │   REVIEWER   │   REVIEWER   │   SECTION    │   SECTION    │  COMMANDER   │   SECTION    │  COMMANDER   │  SECTION/APPR  │
├──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼────────────────┤
│              │              │              │              │              │              │              │              │                │
│  ┌────────┐  │              │              │              │              │              │              │              │                │
│  │ CREATE │  │              │              │              │              │              │              │              │                │
│  │REQUEST │  │              │              │              │              │              │              │              │                │
│  └───┬────┘  │              │              │              │              │              │              │              │                │
│      │       │              │              │              │              │              │              │              │                │
│      ▼       │              │              │              │              │              │              │              │                │
│  ┌────────┐  │              │              │              │              │              │              │              │                │
│  │ORIGINATOR│ │              │              │              │              │              │              │              │                │
│  │ REVIEW  │ │              │              │              │              │              │              │              │                │
│  └───┬────┘  │              │              │              │              │              │              │              │                │
│      │       │              │              │              │              │              │              │              │                │
│  ┌───┴───┐   │              │              │              │              │              │              │              │                │
│  │ File  │   │              │              │              │              │              │              │              │                │
│  │  or   │   │              │              │              │              │              │              │              │                │
│  │Submit │   │              │              │              │              │              │              │              │                │
│  └───┬───┘   │              │              │              │              │              │              │              │                │
│      │       │  ┌────────┐  │              │              │              │              │              │              │                │
│      └───────┼─►│PLATOON │  │              │              │              │              │              │              │                │
│              │  │ REVIEW │  │              │              │              │              │              │              │                │
│              │  └───┬────┘  │              │              │              │              │              │              │                │
│              │      │       │              │              │              │              │              │              │                │
│              │  ┌───┴───┐   │              │              │              │              │              │              │                │
│              │  │Return │   │  ┌────────┐  │              │              │              │              │              │                │
│  ◄───────────┼──┤  or   ├───┼─►│COMPANY │  │              │              │              │              │              │                │
│              │  │Approve│   │  │ REVIEW │  │              │              │              │              │              │                │
│              │  └───────┘   │  └───┬────┘  │              │              │              │              │              │                │
│              │              │      │       │              │              │              │              │              │                │
│              │              │  ┌───┴───┐   │  ┌────────┐  │              │              │              │              │                │
│              │  ◄───────────┼──┤Return │   │  │BATTALION│  │              │              │              │              │                │
│              │              │  │  or   ├───┼─►│ REVIEW │  │              │              │              │              │                │
│              │              │  │Approve│   │  │(Section)│  │              │              │              │              │                │
│              │              │  └───────┘   │  └───┬────┘  │              │              │              │              │                │
│              │              │              │      │       │              │              │              │              │                │
│              │              │              │  ┌───┴───┐   │  ┌────────┐  │              │              │              │                │
│              │              │  ◄───────────┼──┤Return │   │  │COMMAND │  │              │              │              │                │
│              │              │              │  │  or   ├───┼─►│SECTION │  │              │              │              │                │
│              │              │              │  │Approve│   │  │ REVIEW │  │              │              │              │                │
│              │              │              │  │  or   │   │  └───┬────┘  │              │              │              │                │
│              │              │              │  │ File  │   │      │       │              │              │              │                │
│              │              │              │  │  or   │   │  ┌───┴───┐   │  ┌────────┐  │              │              │                │
│              │              │              │  │Route  │   │  │Route  │   │  │COMMANDER│  │              │              │                │
│              │              │              │  │Extern │   │  │Section├───┼─►│ REVIEW │  │              │              │                │
│              │              │              │  └───────┘   │  │  or   │   │  └───┬────┘  │              │              │                │
│              │              │              │              │  │Return │   │      │       │              │              │                │
│              │              │              │  ◄───────────┼──┤  or   │   │  ┌───┴───┐   │              │              │                │
│              │              │              │              │  │Approve│   │  │Approve│   │              │              │                │
│              │              │              │              │  └───────┘   │  │Endorse│   │              │              │                │
│              │              │              │              │              │  │Reject │   │              │              │                │
│              │              │              │              │              │  │SendTo │   │              │              │                │
│              │              │              │  ◄───────────┼──────────────┼──┤Section│   │              │              │                │
│              │              │              │              │              │  └───┬───┘   │              │              │                │
│              │              │              │              │              │      │       │  ┌────────┐  │              │                │
│              │              │              │              │              │      └───────┼─►│INSTALL │  │              │                │
│              │              │              │              │              │              │  │SECTION │  │              │                │
│              │              │              │              │              │              │  │ REVIEW │  │              │                │
│              │              │              │              │              │              │  └───┬────┘  │              │                │
│              │              │              │              │              │              │      │       │  ┌────────┐  │                │
│              │              │              │              │              │  ◄───────────┼──────┼───────┼──┤INSTALL │  │                │
│              │              │              │              │              │              │      └───────┼─►│COMMAND │  │                │
│              │              │              │              │              │              │              │  │ REVIEW │  │                │
│              │              │              │              │              │              │              │  └───┬────┘  │                │
│              │              │              │              │              │              │              │      │       │  ┌────────┐    │
│              │              │              │              │              │              │  ◄───────────┼──────┼───────┼──┤  HQMC  │    │
│              │              │              │              │              │              │              │      └───────┼─►│ REVIEW │    │
│              │              │              │              │              │              │              │              │  └───┬────┘    │
│              │              │              │              │              │              │              │              │      │         │
│              │              │              │              │              │              │              │              │  ┌───┴───┐     │
│              │              │              │              │              │              │              │              │  │Approve│     │
│              │              │              │              │              │              │              │              │  │Return │     │
│              │              │              │              │              │              │              │              │  │ File  │     │
│              │              │              │              │              │              │              │              │  └───┬───┘     │
│              │              │              │              │              │              │              │              │      │         │
│              │              │              │              │              │              │              │              │      ▼         │
│              │              │              │              │              │              │              │              │  ┌────────┐    │
│              │              │              │              │              │              │              │              │  │ FILED  │    │
│              │              │              │              │              │              │              │              │  └────────┘    │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴────────────────┘
```

---

## Stage Definitions

| Stage | Description | Primary Actor(s) |
|-------|-------------|------------------|
| `ORIGINATOR_REVIEW` | Request created, awaiting originator submission | Originator (Member) |
| `PLATOON_REVIEW` | First-level review (if platoon reviewer exists) | Platoon Reviewer |
| `COMPANY_REVIEW` | Second-level review (if company reviewer exists) | Company Reviewer |
| `BATTALION_REVIEW` | Battalion section processing (S-1, S-3, etc.) | Battalion Section Staff |
| `COMMANDER_REVIEW` | Unit commander or command section review | Commander / Command Section |
| `INSTALLATION_REVIEW` | Installation-level section or commander review | Installation Staff |
| `HQMC_REVIEW` | Headquarters Marine Corps review | HQMC Section / Approver |
| `FILED` | Final state – request completed with retention tracking | N/A |

---

## Filing and Records Management

When a request is **filed**, the following information is captured:

| Field | Description |
|-------|-------------|
| `filedAt` | Date the record was finalized (used for retention calculation) |
| `ssic` | Standard Subject Identification Code |
| `ssicNomenclature` | Human-readable SSIC description |
| `ssicBucket` | Category grouping for the SSIC |
| `isPermanent` | Whether the record is permanent retention |
| `retentionValue` | Numeric retention period |
| `retentionUnit` | Unit for retention (YEARS, MONTHS, DAYS) |
| `cutoffTrigger` | When retention period starts (CALENDAR_YEAR, FISCAL_YEAR) |
| `disposalAction` | What happens after retention (DESTROY, TRANSFER, etc.) |

### Disposal Date Calculation

1. **Cutoff Date**: Based on `filedAt` and `cutoffTrigger`:
   - `CALENDAR_YEAR`: December 31 of the filed year
   - `FISCAL_YEAR`: September 30 (end of fiscal year containing filed date)
2. **Disposal Date**: Cutoff date + retention period

### Files Tab

All dashboards include a **Files** tab showing filed records:
- Grouped by **Disposal Year** (when records can be disposed)
- Sub-grouped by **SSIC Bucket** (category)
- Searchable by subject, SSIC, and category
- Permanent records grouped separately

---

## Actions by Stage

### ORIGINATOR_REVIEW

| Action | Result | Next Stage |
|--------|--------|------------|
| Submit | Routes to first available reviewer | PLATOON_REVIEW / COMPANY_REVIEW / BATTALION_REVIEW |
| File | File without further review (if approved by commander) | FILED |
| Edit | Modify request details | ORIGINATOR_REVIEW |
| Delete | Remove request entirely | (Deleted) |

**Note**: Originator can only file after commander approval, not at initial creation.

### PLATOON_REVIEW

| Action | Result | Next Stage |
|--------|--------|------------|
| Approve | Advances to company review | COMPANY_REVIEW |
| Return to Originator | Returns for corrections | ORIGINATOR_REVIEW |
| File | File record (if approved by commander) | FILED |
| Add Comment/Files | Attach notes or documents | PLATOON_REVIEW |

### COMPANY_REVIEW

| Action | Result | Next Stage |
|--------|--------|------------|
| Approve | Advances to battalion section | BATTALION_REVIEW |
| Return to Platoon | Returns to platoon reviewer | PLATOON_REVIEW |
| Return to Originator | Returns for corrections | ORIGINATOR_REVIEW |
| File | File record (if approved by commander) | FILED |
| Add Comment/Files | Attach notes or documents | COMPANY_REVIEW |

### BATTALION_REVIEW

| Action | Result | Next Stage |
|--------|--------|------------|
| Approve to Commander | Direct to unit commander | COMMANDER_REVIEW (routeSection='') |
| Approve to Command Section | Route to specific command section | COMMANDER_REVIEW (routeSection=section) |
| Return to Company | Returns to company reviewer | COMPANY_REVIEW |
| Return to Originator | Returns for corrections | ORIGINATOR_REVIEW |
| Route to External Unit | Send to another battalion | EXTERNAL_REVIEW |
| Route to Installation | Send to installation level | INSTALLATION_REVIEW |
| File | Complete and file request at this level | FILED |
| Add Comment/Files | Attach notes or documents | BATTALION_REVIEW |

### COMMANDER_REVIEW (Command Sections)

| Action | Result | Next Stage |
|--------|--------|------------|
| Approve to Commander | Route to unit commander | COMMANDER_REVIEW (routeSection='') |
| Return to Battalion | Return to battalion section | BATTALION_REVIEW |
| Route to Another Section | Transfer to different command section | COMMANDER_REVIEW (routeSection=other) |
| Add Comment/Files | Attach notes or documents | COMMANDER_REVIEW |

### COMMANDER_REVIEW (Unit Commander)

| Action | Result | Next Stage |
|--------|--------|------------|
| Approve | Approves request, routes back to battalion section | BATTALION_REVIEW |
| Endorse | Endorses request, routes back to battalion section | BATTALION_REVIEW |
| Reject | Rejects request, routes back to battalion section | BATTALION_REVIEW |
| Send to Command Section | Route to specific command section for review | COMMANDER_REVIEW (routeSection=section) |
| Add Comment/Files | Attach notes or documents | COMMANDER_REVIEW |

**Note:** The Commander cannot return requests directly to the originator or file them. All decisions (Approve/Endorse/Reject) route back to the battalion section that originally processed the request, where staff can then take further action (file, return to company/originator, route externally, etc.).

### INSTALLATION_REVIEW (Section)

| Action | Result | Next Stage |
|--------|--------|------------|
| Approve to Commander | Route to installation commander | INSTALLATION_REVIEW (routeSection='') |
| Return to Unit | Return to originating unit | BATTALION_REVIEW |
| Route to HQMC | Send to headquarters | HQMC_REVIEW |
| File | Complete and file at installation level | FILED |
| Add Comment/Files | Attach notes or documents | INSTALLATION_REVIEW |

### INSTALLATION_REVIEW (Commander)

| Action | Result | Next Stage |
|--------|--------|------------|
| Approve | Approves at installation level | FILED or BATTALION_REVIEW |
| Endorse | Endorses for higher review | HQMC_REVIEW |
| Reject | Rejects request | BATTALION_REVIEW |
| Return to Section | Return to installation section | INSTALLATION_REVIEW (routeSection=section) |
| Add Comment/Files | Attach notes or documents | INSTALLATION_REVIEW |

### HQMC_REVIEW

| Action | Result | Next Stage |
|--------|--------|------------|
| Approve | Final approval at HQMC | Activity logged |
| Reject | Return to installation | INSTALLATION_REVIEW |
| Return | Send back for corrections | INSTALLATION_REVIEW |
| File | Complete and file at HQMC level | FILED |
| Add Comment/Files | Attach notes or documents | HQMC_REVIEW |

---

## Permission Flags

| Flag | Description |
|------|-------------|
| `isAppAdmin` | System-wide administrator |
| `isUnitAdmin` | Unit-level administrator |
| `isInstallationAdmin` | Installation administrator |
| `isHqmcAdmin` | HQMC administrator |
| `isCommandStaff` | Access to Unit Command Dashboard |

---

## Role Scope Fields

| Field | Description |
|-------|-------------|
| `role` | User's role (MEMBER, PLATOON_REVIEWER, COMPANY_REVIEWER, COMMANDER) |
| `roleCompany` | Company scope for reviewer roles |
| `rolePlatoon` | Platoon scope for PLATOON_REVIEWER role |
| `company` | User's assigned company |
| `platoon` | User's assigned platoon |

**Note**: `roleCompany`/`rolePlatoon` define the reviewer's scope, while `company`/`platoon` define the user's organizational assignment.

---

## Routing Logic Summary

1. **Originator submits** → Routes to first available reviewer:
   - If PLATOON_REVIEWER exists for user's company/platoon → PLATOON_REVIEW
   - Else if COMPANY_REVIEWER exists for user's company → COMPANY_REVIEW
   - Else → BATTALION_REVIEW
2. **Each review level** → Can approve (forward) or return (backward)
3. **Battalion Section** → Routes to Command Section or directly to Commander
4. **Command Sections** → Process and route to Commander or return to Battalion
5. **Commander** → Approve/Endorse/Reject → Routes back to Battalion Section
6. **Battalion post-commander** → Can file, route to Installation, or handle rejection
7. **Installation** → Section review → Commander → HQMC or complete
8. **HQMC** → Final approval/file authority
9. **Any level post-approval** → Can file record with SSIC classification

---

## Key Business Rules

1. **Section Mapping**: Each platoon maps to a battalion section (e.g., 1st Platoon → S-1)
2. **Routing Preservation**: When rejected by Commander, requests return to the original battalion section
3. **Activity Log**: All actions are recorded with actor, timestamp, fromSection, toSection
4. **External Routing**: Requests can be routed to other battalions for endorsement
5. **Installation Escalation**: Requests requiring installation approval flow through installation sections
6. **HQMC Escalation**: Requests requiring headquarters approval flow through HQMC divisions
7. **Filing Requirements**: Records must have SSIC classification before filing
8. **Retention Tracking**: Filed records are tracked by disposal year for records management
9. **Subjects Uppercase**: All request subjects are automatically converted to uppercase
