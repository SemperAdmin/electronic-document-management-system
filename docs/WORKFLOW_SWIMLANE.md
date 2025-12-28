# Document Routing Workflow - Swim Lane Diagram

## Overview

This document describes the complete workflow for document routing in the Electronic Document Management System (EDMS). The system supports multi-level review and approval processes across Unit, Installation, and HQMC levels.

---

## Swim Lane Flowchart

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                           DOCUMENT ROUTING WORKFLOW                                                                                      │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                                                                         │
│  ┌─────────────────┐                                                                                                                                                    │
│  │   ORIGINATOR    │  ┌──────────┐     ┌──────────────────┐                                                                                                             │
│  │   (Member)      │  │  CREATE  │────►│ Submit Request   │──────────────────────────────────────────────────────────────────────────────────────────┐                  │
│  │                 │  │ REQUEST  │     └──────────────────┘                                                                                          │                  │
│  │                 │  └──────────┘              ▲                                                                                                     │                  │
│  │                 │                            │ Resubmit (after return to originator)                                                              │                  │
│  │                 │              ┌─────────────┴─────────────┐                                                                                       │                  │
│  │                 │              │   ORIGINATOR_REVIEW       │◄─────────────────────────────────────────────────────────────────────────────────────┐│                  │
│  │                 │              │   - Edit/Update request   │                                                           Return to Originator       ││                  │
│  │                 │              │   - Archive (if approved) │                                                                                      ││                  │
│  │                 │              │   - Delete (if not appr)  │                                                                                      ││                  │
│  │                 │              └───────────────────────────┘                                                                                      ││                  │
│  └─────────────────┘                                                                                                                                 ││                  │
│                                                                                                                                                      ││                  │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼┼──────────────────┤
│                                                                                                                                                      ││                  │
│  ┌─────────────────┐              ┌───────────────────────────┐                                                                                      ││                  │
│  │    PLATOON      │              │     PLATOON_REVIEW        │◄─────────────────────────────────────────────────────────────────────────────────────┼┘                  │
│  │   REVIEWER      │              │                           │                                                                                      │                   │
│  │                 │              │  Actions:                 │                                                                                      │                   │
│  │  (if exists)    │              │  ├─► Approve ─────────────┼──────────────────────────────────────┐                                               │                   │
│  │                 │              │  ├─► Return to Originator─┼──────────────────────────────────────┼───────────────────────────────────────────────┘                   │
│  │                 │              │  └─► Add Files/Comments   │                                      │                                                                   │
│  │                 │              └───────────────────────────┘                                      │                                                                   │
│  └─────────────────┘                                                                                 │                                                                   │
│                                                                                                      │                                                                   │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────┤
│                                                                                                      │                                                                   │
│  ┌─────────────────┐              ┌───────────────────────────┐                                      │                                                                   │
│  │    COMPANY      │              │     COMPANY_REVIEW        │◄─────────────────────────────────────┘                                                                   │
│  │   REVIEWER      │              │                           │◄─────────────────────────────────────┐ (Return from Battalion)                                          │
│  │                 │              │  Actions:                 │                                      │                                                                   │
│  │  (if exists)    │              │  ├─► Approve ─────────────┼──────────────────────────────────────┼───┐                                                               │
│  │                 │              │  ├─► Route to Bn Section──┼──────────────────────────────────────┼───┼─┐ (Select S-1, S-3, etc.)                                     │
│  │                 │              │  ├─► Return to Platoon ───┼──────────────────────────────────────┼───┼─┼─► (Back to PLATOON_REVIEW)                                  │
│  │                 │              │  ├─► Return to Originator─┼──────────────────────────────────────┼───┼─┼─► (Back to ORIGINATOR_REVIEW)                               │
│  │                 │              │  └─► Add Files/Comments   │                                      │   │ │                                                             │
│  │                 │              └───────────────────────────┘                                      │   │ │                                                             │
│  └─────────────────┘                                                                                 │   │ │                                                             │
│                                                                                                      │   │ │                                                             │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┼───┼─┼─────────────────────────────────────────────────────────────┤
│                                                                                                      │   │ │                                                             │
│  ┌─────────────────┐              ┌───────────────────────────┐                                      │   │ │                                                             │
│  │   BATTALION     │              │    BATTALION_REVIEW       │◄─────────────────────────────────────┴───┴─┘                                                             │
│  │    SECTION      │              │    (routeSection: S-1,    │◄─────────────────────────────────────┐ (Return from Command Section)                                    │
│  │                 │              │     S-3, S-4, etc.)       │                                      │                                                                   │
│  │  S-1, S-3, S-4  │              │                           │                                      │                                                                   │
│  │  Adjutant, etc. │              │  Actions:                 │                                      │                                                                   │
│  │                 │              │  ├─► Approve to Command ──┼──────────────────────────────────────┼───┐                                                               │
│  │                 │              │  │   Section              │                                      │   │                                                               │
│  │                 │              │  ├─► Return to Company ───┼──────────────────────────────────────┼───┼─► (Back to COMPANY_REVIEW)                                    │
│  │                 │              │  ├─► Return to Originator─┼──────────────────────────────────────┼───┼─► (Back to ORIGINATOR_REVIEW)                                 │
│  │                 │              │  ├─► Archive (if approved)│                                      │   │                                                               │
│  │                 │              │  └─► Add Files/Comments   │                                      │   │                                                               │
│  │                 │              └───────────────────────────┘                                      │   │                                                               │
│  └─────────────────┘                                                                                 │   │                                                               │
│                                                                                                      │   │                                                               │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┼───┼───────────────────────────────────────────────────────────────┤
│                                                                                                      │   │                                                               │
│  ┌─────────────────┐              ┌───────────────────────────┐                                      │   │                                                               │
│  │  UNIT COMMAND   │              │    COMMANDER_REVIEW       │◄─────────────────────────────────────┴───┘                                                               │
│  │    SECTION      │              │    (routeSection: S-1,    │                                                                                                          │
│  │                 │              │     S-3, SgtMaj, etc.)    │                                                                                                          │
│  │  S-1, S-3,      │              │                           │                                                                                                          │
│  │  SgtMaj, XO     │              │  Actions:                 │                                                                                                          │
│  │                 │              │  ├─► Approve to Commander─┼──────────────────────────────────────┐                                                                   │
│  │                 │              │  ├─► Route to Other ──────┼─┐ (Route to S-3, SgtMaj, etc.)       │                                                                   │
│  │                 │              │  │   Command Section      │ │                                    │                                                                   │
│  │                 │              │  ├─► Return to Battalion──┼─┼─► (Back to BATTALION_REVIEW)       │                                                                   │
│  │                 │              │  └─► Add Files/Comments   │ │                                    │                                                                   │
│  │                 │              └───────────────────────────┘ │                                    │                                                                   │
│  │                 │                        ▲                   │                                    │                                                                   │
│  │                 │                        └───────────────────┘                                    │                                                                   │
│  └─────────────────┘                                                                                 │                                                                   │
│                                                                                                      │                                                                   │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────┤
│                                                                                                      │                                                                   │
│  ┌─────────────────┐              ┌───────────────────────────┐                                      │                                                                   │
│  │      UNIT       │              │    COMMANDER_REVIEW       │◄─────────────────────────────────────┘                                                                   │
│  │   COMMANDER     │              │    (routeSection: empty)  │                                                                                                          │
│  │                 │              │                           │                                                                                                          │
│  │                 │              │  Actions:                 │                                                                                                          │
│  │                 │              │  ├─► APPROVE ─────────────┼──┐ (Request complete at unit level)                                                                      │
│  │                 │              │  │   (Marks approved)     │  │                                                                                                       │
│  │                 │              │  ├─► ENDORSE ─────────────┼──┼──┐ (Forward to Installation)                                                                          │
│  │                 │              │  │   (Forward higher)     │  │  │                                                                                                    │
│  │                 │              │  ├─► Route to Command ────┼──┼──┼─► (Back to COMMANDER_REVIEW with section)                                                          │
│  │                 │              │  │   Section              │  │  │                                                                                                    │
│  │                 │              │  ├─► Return to Battalion──┼──┼──┼─► (Back to BATTALION_REVIEW)                                                                       │
│  │                 │              │  ├─► Return to Originator─┼──┼──┼─► (Back to ORIGINATOR_REVIEW)                                                                      │
│  │                 │              │  └─► Add Files/Comments   │  │  │                                                                                                    │
│  │                 │              └───────────────────────────┘  │  │                                                                                                    │
│  └─────────────────┘                                             │  │                                                                                                    │
│                                                                  │  │                                                                                                    │
│  ═══════════════════════════════════════════════════════════════╪══╪════════════════════════════════════════════════════════════════════════════════════════════════════ │
│                            UNIT LEVEL COMPLETE                   │  │              INSTALLATION LEVEL (if endorsed)                                                      │
│  ═══════════════════════════════════════════════════════════════╪══╪════════════════════════════════════════════════════════════════════════════════════════════════════ │
│                                                                  │  │                                                                                                    │
├──────────────────────────────────────────────────────────────────┼──┼────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                  │  │                                                                                                    │
│  ┌─────────────────┐              ┌───────────────────────────┐  │  │                                                                                                    │
│  │  INSTALLATION   │              │  INSTALLATION_REVIEW      │◄─┼──┘                                                                                                    │
│  │    SECTION      │              │  (routeSection: section)  │  │                                                                                                       │
│  │                 │              │                           │  │                                                                                                       │
│  │                 │              │  Actions:                 │  │                                                                                                       │
│  │                 │              │  ├─► Approve to Install ──┼──┼──┐                                                                                                    │
│  │                 │              │  │   Commander            │  │  │                                                                                                    │
│  │                 │              │  ├─► Return to Unit ──────┼──┼──┼─► (Back to BATTALION_REVIEW)                                                                       │
│  │                 │              │  └─► Add Files/Comments   │  │  │                                                                                                    │
│  │                 │              └───────────────────────────┘  │  │                                                                                                    │
│  └─────────────────┘                                             │  │                                                                                                    │
│                                                                  │  │                                                                                                    │
├──────────────────────────────────────────────────────────────────┼──┼────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                  │  │                                                                                                    │
│  ┌─────────────────┐              ┌───────────────────────────┐  │  │                                                                                                    │
│  │  INSTALLATION   │              │  INSTALLATION_REVIEW      │◄─┼──┘                                                                                                    │
│  │   COMMANDER     │              │  (routeSection: empty)    │  │                                                                                                       │
│  │                 │              │                           │  │                                                                                                       │
│  │                 │              │  Actions:                 │  │                                                                                                       │
│  │                 │              │  ├─► APPROVE ─────────────┼──┼──┐ (Request complete at installation)                                                                 │
│  │                 │              │  ├─► ENDORSE ─────────────┼──┼──┼──┐ (Forward to HQMC)                                                                               │
│  │                 │              │  ├─► Return to Unit ──────┼──┼──┼──┼─► (Back to BATTALION_REVIEW)                                                                    │
│  │                 │              │  └─► Add Files/Comments   │  │  │  │                                                                                                 │
│  │                 │              └───────────────────────────┘  │  │  │                                                                                                 │
│  └─────────────────┘                                             │  │  │                                                                                                 │
│                                                                  │  │  │                                                                                                 │
│  ═══════════════════════════════════════════════════════════════╪══╪══╪═════════════════════════════════════════════════════════════════════════════════════════════════ │
│                      INSTALLATION LEVEL COMPLETE                 │  │  │               HQMC LEVEL (if endorsed)                                                          │
│  ═══════════════════════════════════════════════════════════════╪══╪══╪═════════════════════════════════════════════════════════════════════════════════════════════════ │
│                                                                  │  │  │                                                                                                 │
├──────────────────────────────────────────────────────────────────┼──┼──┼─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                  │  │  │                                                                                                 │
│  ┌─────────────────┐              ┌───────────────────────────┐  │  │  │                                                                                                 │
│  │  HQMC SECTION   │              │      HQMC_REVIEW          │◄─┼──┼──┘                                                                                                 │
│  │   (MM, MP, FM)  │              │  (routeSection: division) │  │  │                                                                                                    │
│  │                 │              │                           │  │  │                                                                                                    │
│  │                 │              │  Actions:                 │  │  │                                                                                                    │
│  │                 │              │  ├─► Approve to HQMC ─────┼──┼──┼──┐                                                                                                 │
│  │                 │              │  │   Approver             │  │  │  │                                                                                                 │
│  │                 │              │  ├─► Return to Install ───┼──┼──┼──┼─► (Back to INSTALLATION_REVIEW)                                                                 │
│  │                 │              │  └─► Add Files/Comments   │  │  │  │                                                                                                 │
│  │                 │              └───────────────────────────┘  │  │  │                                                                                                 │
│  └─────────────────┘                                             │  │  │                                                                                                 │
│                                                                  │  │  │                                                                                                 │
├──────────────────────────────────────────────────────────────────┼──┼──┼─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                  │  │  │                                                                                                 │
│  ┌─────────────────┐              ┌───────────────────────────┐  │  │  │                                                                                                 │
│  │  HQMC APPROVER  │              │      HQMC_REVIEW          │◄─┼──┼──┘                                                                                                 │
│  │                 │              │  (Approver level)         │  │  │                                                                                                    │
│  │                 │              │                           │  │  │                                                                                                    │
│  │                 │              │  Actions:                 │  │  │                                                                                                    │
│  │                 │              │  ├─► APPROVE ─────────────┼──┼──┼───► FINAL APPROVAL                                                                                 │
│  │                 │              │  ├─► Return to Section ───┼──┼──┼─► (Back to HQMC Section)                                                                           │
│  │                 │              │  └─► Add Files/Comments   │  │  │                                                                                                    │
│  │                 │              └───────────────────────────┘  │  │                                                                                                    │
│  └─────────────────┘                                             │  │                                                                                                    │
│                                                                  │  │                                                                                                    │
├──────────────────────────────────────────────────────────────────┼──┼────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                  │  │                                                                                                    │
│  ┌─────────────────┐              ┌───────────────────────────┐  │  │                                                                                                    │
│  │    ARCHIVE      │              │       ARCHIVED            │◄─┴──┴──── (After approval at any terminal level)                                                         │
│  │    (Terminal)   │              │                           │                                                                                                          │
│  │                 │              │  - Request is complete    │                                                                                                          │
│  │                 │              │  - Read-only access       │                                                                                                          │
│  │                 │              │  - Cannot be modified     │                                                                                                          │
│  │                 │              │  - Historical record      │                                                                                                          │
│  │                 │              └───────────────────────────┘                                                                                                          │
│  └─────────────────┘                                                                                                                                                     │
│                                                                                                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage Definitions

| Stage | Description | Route Section |
|-------|-------------|---------------|
| `ORIGINATOR_REVIEW` | Request returned to originator for edits | N/A |
| `PLATOON_REVIEW` | Initial review at platoon level | N/A |
| `COMPANY_REVIEW` | Review at company level | N/A |
| `BATTALION_REVIEW` | Review at battalion section level | S-1, S-3, S-4, Adjutant, etc. |
| `COMMANDER_REVIEW` | Review by command sections or commander | S-1, S-3, SgtMaj, XO, or empty (Commander) |
| `INSTALLATION_REVIEW` | Review at installation level | Section name or empty (Commander) |
| `HQMC_REVIEW` | Review at HQMC level | Division code (MM, MP, FM) |
| `EXTERNAL_REVIEW` | Request sent to external unit | External unit name |
| `ARCHIVED` | Request completed and archived | N/A |

---

## Actions by Stage

### ORIGINATOR_REVIEW
| Action | Next Stage | Condition |
|--------|------------|-----------|
| Resubmit | PLATOON_REVIEW / COMPANY_REVIEW / BATTALION_REVIEW | Request was returned to originator |
| Edit | Same | Owner and not approved |
| Archive | ARCHIVED | Owner and request approved by commander |
| Delete | (Deleted) | Owner and not approved by any commander |

### PLATOON_REVIEW
| Action | Next Stage | Condition |
|--------|------------|-----------|
| Approve | COMPANY_REVIEW | Always |
| Return to Originator | ORIGINATOR_REVIEW | Always |
| Add Files/Comments | Same | Always |

### COMPANY_REVIEW
| Action | Next Stage | Condition |
|--------|------------|-----------|
| Approve | BATTALION_REVIEW | Without section selection |
| Route to Battalion Section | BATTALION_REVIEW | With section selection (S-1, S-3, etc.) |
| Return to Platoon | PLATOON_REVIEW | If platoon reviewer exists |
| Return to Originator | ORIGINATOR_REVIEW | Always |
| Add Files/Comments | Same | Always |

### BATTALION_REVIEW
| Action | Next Stage | Condition |
|--------|------------|-----------|
| Approve to Command Section | COMMANDER_REVIEW | With routeSection set |
| Return to Company | COMPANY_REVIEW | Always |
| Return to Originator | ORIGINATOR_REVIEW | Always |
| Archive | ARCHIVED | Request approved by unit commander |
| Add Files/Comments | Same | Always |

### COMMANDER_REVIEW (Command Sections: S-1, S-3, SgtMaj, etc.)
| Action | Next Stage | Condition |
|--------|------------|-----------|
| Approve to Commander | COMMANDER_REVIEW | routeSection cleared (goes to commander) |
| Route to Other Command Section | COMMANDER_REVIEW | routeSection changed to another section |
| Return to Battalion | BATTALION_REVIEW | Always |
| Add Files/Comments | Same | Always |

### COMMANDER_REVIEW (Unit Commander)
| Action | Next Stage | Condition |
|--------|------------|-----------|
| Approve | ARCHIVED or ORIGINATOR_REVIEW | Request complete at unit level |
| Endorse | INSTALLATION_REVIEW | Forward to installation |
| Route to Command Section | COMMANDER_REVIEW | routeSection set |
| Return to Battalion | BATTALION_REVIEW | Always |
| Return to Originator | ORIGINATOR_REVIEW | Always |
| Add Files/Comments | Same | Always |

### INSTALLATION_REVIEW (Section)
| Action | Next Stage | Condition |
|--------|------------|-----------|
| Approve to Installation Commander | INSTALLATION_REVIEW | routeSection cleared |
| Return to Unit | BATTALION_REVIEW | Always |
| Add Files/Comments | Same | Always |

### INSTALLATION_REVIEW (Installation Commander)
| Action | Next Stage | Condition |
|--------|------------|-----------|
| Approve | ARCHIVED | Request complete at installation level |
| Endorse | HQMC_REVIEW | Forward to HQMC |
| Return to Unit | BATTALION_REVIEW | Always |
| Add Files/Comments | Same | Always |

### HQMC_REVIEW (Section)
| Action | Next Stage | Condition |
|--------|------------|-----------|
| Approve to HQMC Approver | HQMC_REVIEW | Approver level |
| Return to Installation | INSTALLATION_REVIEW | Always |
| Add Files/Comments | Same | Always |

### HQMC_REVIEW (Approver)
| Action | Next Stage | Condition |
|--------|------------|-----------|
| Approve | ARCHIVED | Final approval |
| Return to Section | HQMC_REVIEW | Back to section reviewers |
| Add Files/Comments | Same | Always |

---

## Permission Flags

| Flag | Description | Dashboard Access |
|------|-------------|------------------|
| `isAppAdmin` | Application administrator | App Admin |
| `isUnitAdmin` | Unit administrator | Unit Admin |
| `isInstallationAdmin` | Installation administrator | Installation Admin |
| `isHqmcAdmin` | HQMC administrator | HQMC Admin |
| `isCommandStaff` | Unit command staff member | Unit Command Dashboard |
| `role` contains `REVIEW` | Reviewer at platoon/company/battalion level | Unit Review Dashboard |

---

## Routing Logic Summary

```
Member creates request
        │
        ▼
Has Platoon Reviewer? ──Yes──► PLATOON_REVIEW
        │No
        ▼
Has Company Reviewer? ──Yes──► COMPANY_REVIEW
        │No
        ▼
BATTALION_REVIEW
        │
        ▼
COMMANDER_REVIEW (Command Section or Commander)
        │
        ├──► Approved ──► ARCHIVED (or return to originator)
        │
        └──► Endorsed ──► INSTALLATION_REVIEW
                                │
                                ├──► Approved ──► ARCHIVED
                                │
                                └──► Endorsed ──► HQMC_REVIEW
                                                        │
                                                        └──► Approved ──► ARCHIVED
```

---

## Key Business Rules

1. **Delete**: Only the originator can delete, and only before any commander approval
2. **Archive**: Can be done by originator (if approved), battalion section (if unit approved), installation (if installation approved), or HQMC (if HQMC approved)
3. **Edit**: Originator can edit at early stages or when returned (unless already approved)
4. **Resubmit**: Available when request is returned to originator
5. **Route Section**: Used to track which specific section a request is assigned to within a stage
