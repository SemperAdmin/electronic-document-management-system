# EDMS Request Workflow – Swim Lane Diagram

## Overview

This document describes the complete workflow for document requests in the Electronic Document Management System (EDMS). Requests flow through multiple review stages, with actions available at each stage depending on the reviewer's role.

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
│  │Archive│   │              │              │              │              │              │              │              │                │
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
│              │              │              │  │Archive│   │      │       │              │              │              │                │
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
│              │              │              │              │              │              │              │              │  │Archive│     │
│              │              │              │              │              │              │              │              │  └───┬───┘     │
│              │              │              │              │              │              │              │              │      │         │
│              │              │              │              │              │              │              │              │      ▼         │
│              │              │              │              │              │              │              │              │  ┌────────┐    │
│              │              │              │              │              │              │              │              │  │ARCHIVED│    │
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
| `ARCHIVED` | Final state – request completed | N/A |

---

## Actions by Stage

### ORIGINATOR_REVIEW

| Action | Result | Next Stage |
|--------|--------|------------|
| Submit | Routes to first available reviewer | PLATOON_REVIEW / COMPANY_REVIEW / BATTALION_REVIEW |
| Archive | Originator archives without submission | ARCHIVED |
| Edit | Modify request details | ORIGINATOR_REVIEW |
| Delete | Remove request entirely | (Deleted) |

### PLATOON_REVIEW

| Action | Result | Next Stage |
|--------|--------|------------|
| Approve | Advances to company review | COMPANY_REVIEW |
| Return to Originator | Returns for corrections | ORIGINATOR_REVIEW |
| Add Comment/Files | Attach notes or documents | PLATOON_REVIEW |

### COMPANY_REVIEW

| Action | Result | Next Stage |
|--------|--------|------------|
| Approve | Advances to battalion section | BATTALION_REVIEW |
| Return to Platoon | Returns to platoon reviewer | PLATOON_REVIEW |
| Return to Originator | Returns for corrections | ORIGINATOR_REVIEW |
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
| Archive | Complete request at this level | ARCHIVED |
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

**Note:** The Commander cannot return requests directly to the originator or archive them. All decisions (Approve/Endorse/Reject) route back to the battalion section that originally processed the request, where staff can then take further action (archive, return to company/originator, route externally, etc.).

### INSTALLATION_REVIEW (Section)

| Action | Result | Next Stage |
|--------|--------|------------|
| Approve to Commander | Route to installation commander | INSTALLATION_REVIEW (routeSection='') |
| Return to Unit | Return to originating unit | BATTALION_REVIEW |
| Route to HQMC | Send to headquarters | HQMC_REVIEW |
| Add Comment/Files | Attach notes or documents | INSTALLATION_REVIEW |

### INSTALLATION_REVIEW (Commander)

| Action | Result | Next Stage |
|--------|--------|------------|
| Approve | Approves at installation level | ARCHIVED or BATTALION_REVIEW |
| Endorse | Endorses for higher review | HQMC_REVIEW |
| Reject | Rejects request | BATTALION_REVIEW |
| Return to Section | Return to installation section | INSTALLATION_REVIEW (routeSection=section) |
| Add Comment/Files | Attach notes or documents | INSTALLATION_REVIEW |

### HQMC_REVIEW

| Action | Result | Next Stage |
|--------|--------|------------|
| Approve | Final approval | ARCHIVED |
| Reject | Return to installation | INSTALLATION_REVIEW |
| Return | Send back for corrections | INSTALLATION_REVIEW |
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

## Routing Logic Summary

1. **Originator submits** → Routes to first available reviewer (Platoon → Company → Battalion)
2. **Each review level** → Can approve (forward) or return (backward)
3. **Battalion Section** → Routes to Command Section or directly to Commander
4. **Command Sections** → Process and route to Commander or return to Battalion
5. **Commander** → Approve/Endorse/Reject → Routes back to Battalion Section
6. **Battalion post-commander** → Can archive, route to Installation, or handle rejection
7. **Installation** → Section review → Commander → HQMC or complete
8. **HQMC** → Final approval authority

---

## Key Business Rules

1. **Section Mapping**: Each platoon maps to a battalion section (e.g., 1st Platoon → S-1)
2. **Routing Preservation**: When rejected by Commander, requests return to the original battalion section
3. **Activity Log**: All actions are recorded with actor, timestamp, fromSection, toSection
4. **External Routing**: Requests can be routed to other battalions for endorsement
5. **Installation Escalation**: Requests requiring installation approval flow through installation sections
6. **HQMC Escalation**: Requests requiring headquarters approval flow through HQMC divisions
