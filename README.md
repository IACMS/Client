# IACMS Client (Frontend)

This folder contains the **IACMS web client** (React + Vite + Tailwind). The latest client commit (`09783a3`) focused on **integrating and refining the Workflow UI** across workflow design, publishing, and case progression.

## What was implemented (last commit)

### Frontend (UI + client logic)
- **Workflow Designer**
  - Added/expanded an editor experience for workflow **steps** and **transitions** (create/edit/delete).
  - Added **publish validation** and a publish flow (prevents publishing invalid workflows).
  - Added **RBAC role selection** utilities to restrict who can execute steps/transitions.

- **Case Progress + Execution**
  - Added a dedicated **Task progress** view showing workflow step order, completion phases, and a progress bar.
  - Added a **guided path panel** to help users understand current/completed/upcoming steps.
  - Added an **Execute transition** modal to run allowed actions (including “comment required” transitions).
  - Enforced **attachment-required steps** by blocking transitions until at least one attachment is linked to the current step.
  - Improved Case details to load case + workflow state + attachments + assignments and present them in tabs.

- **Admin / Tenant / User creation UX**
  - Added **Create Agency** modal (tenant registration flow with user-friendly gateway connectivity errors).
  - Refined **Create User** and **Create Case** flows to work cleanly with the workflow model and gateway API responses.

### API client and shared helpers
- Improved the API client (`src/lib/api.ts`) to:
  - Use `VITE_API_URL` (default `http://localhost:3000`) as the API gateway base.
  - Persist **access/refresh tokens** and automatically attempt a refresh on certain `401` responses for `/api/v1/auth/*`.

### Backend (direct implementation in `/home/e/code/IACMS/Current/IACMS`)

Backend latest commit: `f949eee` (“Adjustment for the Dynamic workflow”).

- **Database / Prisma domain sync**
  - Introduced a repo-level Prisma schema (`prisma/schema.prisma`) with **per-service Prisma client outputs** (generated into each service’s `src/generated/...`).
  - Added migrations to support dynamic workflows:
    - **Workflow modeling**: `workflow_steps`, `workflow_transitions`, and workflow `status` (`DRAFT | PUBLISHED | ARCHIVED`) plus required workflow `key`.
    - **Case workflow tracking**: `cases.current_step_id`, `cases.workflow_version`, `case_history` (with from/to step IDs), and `case_sequences`.
    - **Attachments linked to steps**: `workflow_steps.requires_attachment` and `case_attachments.workflow_step_id`.

- **Case service (dynamic workflow runtime)**
  - `GET /cases/:id` now includes `workflow` summary and `currentStep` details (including `requiresAttachment` + `allowedRoleIds`).
  - `GET /cases/:id/state` now returns:
    - `availableActions`
    - `history` enriched with `fromStep`/`toStep` summaries
    - `workflowGuide` (ordered step checklist + transitions for the UI’s progress/guide panels)
  - `POST /cases/:id/transitions/:transitionId/execute` now enforces:
    - transition belongs to the case’s workflow
    - attachment-required steps must have **at least one** attachment linked to the current step before moving forward

- **Attachments**
  - Upload now supports/records `workflowStepId` and validates it is within the case workflow (and matches the current step).

- **Workflow service (designer + versioning support)**
  - Added **`POST /workflows/:id/new-version`** to clone an existing workflow into a new **DRAFT** version (copies steps + transitions with new IDs).
  - Improved transition creation logic (validates endpoints, supports resolving a transition’s `fromStepId` via a parent transition destination, validates uniqueness per from-step, etc.).
  - API gateway RBAC now includes permissions for:
    - `POST /workflows/:id/new-version`
    - `PUT /workflows/:id/transitions/:transitionId`

- **Infra / build alignment**
  - Dockerfiles and service scripts updated so migrations/generation run against the repo-level Prisma schema (`--schema=../../prisma/schema.prisma`).
  - `docker-compose` dependency ordering updated to wait for `case-service`, `workflow-service`, and `referral-service` to start.

## Backend expectations (API surface consumed by this UI)

This repo is the client, but the implementation assumes the backend exposes an API gateway with routes similar to:

### Auth / Session
- `POST /api/v1/session/login`
- `POST /api/v1/session/logout`
- `GET  /api/v1/session/status`
- `POST /api/v1/auth/refresh`
- `GET  /api/v1/auth/profile`
- `PATCH /api/v1/auth/profile`
- `POST /api/v1/auth/change-password`
- `GET  /api/v1/auth/users`
- `POST /api/v1/auth/users/create`

### Tenants / Agencies
- `POST /api/v1/tenants/register`
- `GET  /api/v1/tenants/:id`
- `PATCH /api/v1/tenants/:id/config`

### Cases / Workflow state
- `GET  /api/v1/cases?tenantId=...`
- `POST /api/v1/cases`
- `GET  /api/v1/cases/:caseId`
- `GET  /api/v1/cases/:caseId/state`
- `POST /api/v1/cases/:caseId/transitions/:transitionId/execute`

### Workflows
- `GET    /api/v1/workflows?tenantId=...`
- `POST   /api/v1/workflows`
- `GET    /api/v1/workflows/:id/full`
- `POST   /api/v1/workflows/:id/new-version`
- `POST   /api/v1/workflows/:id/publish`
- `DELETE /api/v1/workflows/:id`
- `POST   /api/v1/workflows/:id/steps`
- `PUT    /api/v1/workflows/:id/steps/:stepId`
- `POST   /api/v1/workflows/:id/transitions`
- `PATCH  /api/v1/workflows/:id/transitions/:transitionId`
- `DELETE /api/v1/workflows/:id/transitions/:transitionId`

### RBAC Roles (for workflow restrictions)
- `GET /api/v1/rbac/roles`

### Attachments (for attachment-required steps)
- `GET    /api/v1/attachments/case/:caseId`
- `POST   /api/v1/attachments`
- `DELETE /api/v1/attachments/:id`

### Assignments
- `GET  /api/v1/assignments?caseId=...`
- `POST /api/v1/assignments`
- `POST /api/v1/assignments/:id/unassign`

## Run locally

### Prerequisites
- Node.js (recommended: current LTS)
- A running backend API gateway compatible with the endpoints above

### Setup
1. Install dependencies:

```bash
npm install
```

2. Configure the API base URL (optional; defaults to `http://localhost:3000`):

- Create a `.env` file in this folder with:

```bash
VITE_API_URL="http://localhost:3000"
```

3. Start the dev server:

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Notes for reviewers (what to look at)
- **Workflow design + publish**: `src/pages/WorkflowDesignerPage.tsx`, `src/components/WorkflowStepModal.tsx`, `src/components/WorkflowTransitionModal.tsx`, `src/lib/workflowPublishValidate.ts`
- **Case progress + transition execution**: `src/pages/CaseDetailPage.tsx`, `src/components/CaseTaskProgressView.tsx`, `src/components/ExecuteTransitionModal.tsx`
- **RBAC role support**: `src/lib/workflowRoles.ts`
- **API gateway client + token refresh**: `src/lib/api.ts`

