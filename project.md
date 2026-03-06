# Task Board — Implementation Plan
### COP290 Assignment 2

---

## Grading Breakdown (Keep in mind throughout)

| Component | Weight | What they look for |
|-----------|--------|--------------------|
| **Functionality** | 40% | All features working, error handling, edge cases |
| **Code Quality & Testing** | 25% | Strict TypeScript, no `any`, ESLint/Prettier, backend unit tests |
| **UI/UX Design** | 15% | Intuitive, responsive, visual feedback, accessibility |
| **Database Design** | 10% | Proper schema, relationships, indexing, data integrity |
| **Documentation** | 10% | README, API docs, code comments |

---

## Overview of All Phases

```
Phase 1 → Auth & User Management
Phase 2 → Projects
Phase 3 → Boards (Kanban)
Phase 4 → Issues / Tasks
Phase 5 → Issue Lifecycle & Workflow + Audit Trail
Phase 6 → Comments & Collaboration
Phase 7 → Notifications
Phase 8 → Testing, Polish & Documentation
```

---

## Phase 1 — Authentication, Authorization & User Management

> **This is the foundation. Nothing else works without it. Build this first.**

### 1.1 Database Schema (Prisma)

Models to define in `prisma/schema.prisma`:

- **`User`**
  - `id` (UUID, primary key)
  - `name` (String)
  - `email` (String, unique)
  - `passwordHash` (String)
  - `avatarUrl` (String, nullable)
  - `globalRole` (Enum: `GLOBAL_ADMIN`, `MEMBER`)
  - `createdAt`, `updatedAt` (DateTime)

- **`RefreshToken`**
  - `id` (UUID)
  - `token` (String, unique)
  - `userId` (FK → User)
  - `expiresAt` (DateTime)
  - `createdAt` (DateTime)

- **`ProjectMember`** *(junction table — needed now, used later)*
  - `userId` (FK → User)
  - `projectId` (FK → Project)
  - `role` (Enum: `PROJECT_ADMIN`, `PROJECT_MEMBER`, `PROJECT_VIEWER`)
  - Composite primary key: `(userId, projectId)`

### 1.2 Backend Tasks

**Routes to implement** (`/api/auth`, `/api/users`):

| Method | Endpoint | Description | Auth required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Register new user | No |
| `POST` | `/api/auth/login` | Login with email+password | No |
| `POST` | `/api/auth/refresh` | Refresh access token | No (refresh token in cookie) |
| `POST` | `/api/auth/logout` | Invalidate refresh token | Yes |
| `GET` | `/api/users/me` | Get own profile | Yes |
| `PATCH` | `/api/users/me` | Update name/avatar | Yes |
| `GET` | `/api/users` | List all users (admin only) | Yes (Global Admin) |

**Implementation checklist:**
- [ ] `POST /register` — hash password with `bcrypt` (saltRounds: 12), store user
- [ ] `POST /login` — verify password, issue **access token** (15min) + **refresh token** (7 days)
  - Access token → sent as `httpOnly` cookie named `access_token`
  - Refresh token → sent as `httpOnly` cookie named `refresh_token`, stored in DB
- [ ] `POST /refresh` — validate refresh token from DB, issue new access token
- [ ] `POST /logout` — delete refresh token from DB, clear cookies
- [ ] `auth` middleware — verify JWT on every protected route
- [ ] `requireGlobalAdmin` middleware — check `globalRole === GLOBAL_ADMIN`
- [ ] `requireProjectRole(role)` middleware — check project membership
- [ ] Avatar upload — use `multer` to handle file upload, store file path in DB
- [ ] Proper typed error responses (no generic 500s)

### 1.3 Frontend Tasks

**Pages to build:**
- `/register` — Registration form (name, email, password, confirm password)
- `/login` — Login form (email, password)
- `/profile` — User profile page (name, avatar upload, email display)

**Implementation checklist:**
- [ ] `AuthContext` — Global auth state using React Context + useReducer
  - State: `{ user, isLoading, isAuthenticated }`
  - Actions: `LOGIN`, `LOGOUT`, `UPDATE_PROFILE`
- [ ] `ProtectedRoute` component — redirects to `/login` if not authenticated
- [ ] Auto-refresh access token on expiry (intercept 401, call refresh endpoint, retry)
- [ ] Login/Register forms with client-side validation
- [ ] Avatar image preview before upload
- [ ] Redirect to dashboard after login

---

## Phase 2 — Projects

### 2.1 Database Schema

- **`Project`**
  - `id` (UUID)
  - `name` (String)
  - `description` (String, nullable)
  - `isArchived` (Boolean, default: false)
  - `createdAt`, `updatedAt` (DateTime)
  - Relations: `members → ProjectMember[]`, `boards → Board[]`

### 2.2 Backend Tasks

**Routes** (`/api/projects`):

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/projects` | List projects I'm a member of | Yes |
| `POST` | `/api/projects` | Create a new project | Yes (Global Admin) |
| `GET` | `/api/projects/:id` | Get project details | Yes (Member) |
| `PATCH` | `/api/projects/:id` | Update project | Yes (Project Admin) |
| `PATCH` | `/api/projects/:id/archive` | Archive/unarchive project | Yes (Project Admin) |
| `GET` | `/api/projects/:id/members` | List project members | Yes (Member) |
| `POST` | `/api/projects/:id/members` | Add member to project | Yes (Project/Global Admin) |
| `PATCH` | `/api/projects/:id/members/:userId` | Change member role | Yes (Project/Global Admin) |
| `DELETE` | `/api/projects/:id/members/:userId` | Remove member | Yes (Project/Global Admin) |

**Implementation checklist:**
- [ ] Project CRUD with proper ownership checks
- [ ] Archived projects are hidden from normal listing (add `?includeArchived=true` flag)
- [ ] When creating a project, auto-add the creator as `PROJECT_ADMIN`
- [ ] Members can only see projects they belong to (no data leakage)

### 2.3 Frontend Tasks

**Pages:**
- `/projects` — Project list dashboard (cards with name, description, member count)
- `/projects/new` — Create project form
- `/projects/:id` — Project detail page (boards list, member management tab)
- `/projects/:id/settings` — Edit name, description, member roles, archive

**Implementation checklist:**
- [ ] `ProjectContext` — Current project state
- [ ] Project cards with archive badge
- [ ] Member list with role badges (Admin / Member / Viewer)
- [ ] Role assignment dropdown (only visible to admins)

---

## Phase 3 — Boards (Kanban)

> **This is a major feature and worth significant marks for UI/UX.**

### 3.1 Database Schema

- **`Board`**
  - `id` (UUID)
  - `name` (String)
  - `projectId` (FK → Project)
  - `createdAt`, `updatedAt`
  - Relations: `columns → Column[]`

- **`Column`**
  - `id` (UUID)
  - `name` (String) — e.g., "To Do", "In Progress"
  - `boardId` (FK → Board)
  - `order` (Int) — for column ordering
  - `wipLimit` (Int, nullable) — max tasks allowed in this column
  - `createdAt`, `updatedAt`

### 3.2 Backend Tasks

**Routes** (`/api/projects/:projectId/boards`, `/api/boards`):

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/projects/:id/boards` | List boards in project | Yes (Member) |
| `POST` | `/api/projects/:id/boards` | Create board | Yes (Project Admin) |
| `GET` | `/api/boards/:id` | Get board with columns & tasks | Yes (Member) |
| `PATCH` | `/api/boards/:id` | Rename board | Yes (Project Admin) |
| `DELETE` | `/api/boards/:id` | Delete board | Yes (Project Admin) |
| `POST` | `/api/boards/:id/columns` | Add column | Yes (Project Admin) |
| `PATCH` | `/api/boards/:id/columns/:colId` | Rename/update WIP limit | Yes (Project Admin) |
| `DELETE` | `/api/boards/:id/columns/:colId` | Delete column | Yes (Project Admin) |
| `PATCH` | `/api/boards/:id/columns/reorder` | Reorder columns | Yes (Project Admin) |

**Implementation checklist:**
- [ ] Default columns created on board creation: `To Do`, `In Progress`, `Review`, `Done`
- [ ] WIP limit enforcement on task-move endpoint (return 422 if limit exceeded — **block, don't warn**)
- [ ] Column reorder stores `order` field in DB

### 3.3 Frontend Tasks

**Pages/Components:**
- `/projects/:id/boards/:boardId` — Main Kanban board view

**Implementation checklist:**
- [ ] Kanban board UI — horizontal scroll, columns side by side
- [ ] **Drag and drop using ONLY Native HTML Drag and Drop API** (zero external libraries)
  - `draggable="true"` on task cards
  - `onDragStart`, `onDragOver`, `onDrop`, `onDragEnd` handlers
  - Visual highlight of valid drop targets
  - Drop blocked visually when WIP limit exceeded
- [ ] Column header shows task count and WIP limit (e.g., `In Progress 3/5`)
- [ ] Add/rename/delete columns (Project Admin only — hide controls for other roles)
- [ ] Column reordering via drag and drop

---

## Phase 4 — Issues / Tasks

### 4.1 Database Schema

- **`Issue`**
  - `id` (UUID)
  - `title` (String)
  - `description` (String, nullable) — rich text (stored as HTML/Markdown)
  - `type` (Enum: `STORY`, `TASK`, `BUG`)
  - `status` (String) — matches a Column name on the board
  - `priority` (Enum: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
  - `projectId` (FK → Project)
  - `boardId` (FK → Board)
  - `columnId` (FK → Column)
  - `parentId` (FK → Issue, nullable) — for TASK/BUG linking to a STORY
  - `assigneeId` (FK → User, nullable)
  - `reporterId` (FK → User)
  - `dueDate` (DateTime, nullable)
  - `createdAt`, `updatedAt`, `resolvedAt` (nullable), `closedAt` (nullable)

### 4.2 Backend Tasks

**Routes** (`/api/issues`):

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/boards/:id/issues` | Get all issues on a board | Yes (Member) |
| `POST` | `/api/issues` | Create issue | Yes (Member) |
| `GET` | `/api/issues/:id` | Get issue details | Yes (Member) |
| `PATCH` | `/api/issues/:id` | Edit issue fields | Yes (Member) |
| `DELETE` | `/api/issues/:id` | Delete issue | Yes (Project Admin) |
| `PATCH` | `/api/issues/:id/move` | Move issue to different column | Yes (Member) |
| `GET` | `/api/issues/:id/children` | Get child tasks/bugs of a story | Yes (Member) |

**Implementation checklist:**
- [ ] `STORY` type is **not directly movable to columns** — its status is derived from children
- [ ] Enforce `parentId` — only `TASK` and `BUG` can have a parent, and it must be a `STORY`
- [ ] Story status logic: if all children are `Done`, Story auto-resolves (OR can be manually set, but must be consistent)
- [ ] WIP limit check on move (call column validation logic)
- [ ] `reporterId` auto-set to the logged-in user on create
- [ ] Filter issues by `type`, `priority`, `assigneeId`, `status`

### 4.3 Frontend Tasks

**Components:**
- Task card (compact, shown on board)
- Issue detail modal/page (full fields)
- Create issue form
- Issue type badges (Story / Task / Bug) with distinct colors
- Priority badges (Low / Medium / High / Critical) with color coding

**Implementation checklist:**
- [ ] Task card shows: title, priority badge, assignee avatar, due date, issue type icon
- [ ] Click card → opens full issue details panel (side drawer or separate page)
- [ ] Create issue form with all fields
- [ ] Assignee picker — searchable list of project members
- [ ] Parent issue selector (when creating TASK or BUG)
- [ ] Story card on board shows children count and aggregate status

---

## Phase 5 — Issue Lifecycle, Workflow & Audit Trail

### 5.1 Database Schema

- **`WorkflowTransition`**
  - `id` (UUID)
  - `boardId` (FK → Board)
  - `fromColumnId` (FK → Column)
  - `toColumnId` (FK → Column)
  - *(This defines which moves are valid on a given board)*

- **`AuditLog`**
  - `id` (UUID)
  - `issueId` (FK → Issue)
  - `userId` (FK → User) — who made the change
  - `eventType` (Enum: `STATUS_CHANGED`, `ASSIGNEE_CHANGED`, `COMMENT_ADDED`, `COMMENT_EDITED`, `COMMENT_DELETED`)
  - `oldValue` (String, nullable)
  - `newValue` (String, nullable)
  - `createdAt` (DateTime)

### 5.2 Backend Tasks

**Implementation checklist:**
- [ ] On board creation, generate default valid transitions: `To Do → In Progress`, `In Progress → Review`, `Review → Done`, etc.
- [ ] On every `PATCH /issues/:id/move` — check `WorkflowTransition` table for valid move **before** checking WIP limit
- [ ] Return `422 Unprocessable Entity` for invalid transitions (never silently allow)
- [ ] Write to `AuditLog` on every:
  - Status change (store old column name + new column name)
  - Assignee change (store old userId + new userId)
  - Comment added/edited/deleted (store commentId)
- [ ] Auto-set `resolvedAt` when task moves to `Done`, `closedAt` when archived/deleted

### 5.3 Frontend Tasks
- [ ] Show valid transitions only in status dropdown (filter based on allowed transitions)
- [ ] Show toast error when transition is blocked
- [ ] Timestamps on issue detail (`Created`, `Updated`, `Resolved`)

---

## Phase 6 — Comments & Collaboration

### 6.1 Database Schema

- **`Comment`**
  - `id` (UUID)
  - `issueId` (FK → Issue)
  - `authorId` (FK → User)
  - `content` (String) — rich text (HTML)
  - `createdAt`, `updatedAt`
  - `isEdited` (Boolean, default: false)

- **`Mention`**
  - `id` (UUID)
  - `commentId` (FK → Comment)
  - `mentionedUserId` (FK → User)
  - *(Parsed from @username tags in comment content at write time)*

### 6.2 Backend Tasks

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/issues/:id/comments` | Get all comments on issue | Yes (Member) |
| `POST` | `/api/issues/:id/comments` | Add comment | Yes (Member) |
| `PATCH` | `/api/comments/:id` | Edit own comment | Yes (author only) |
| `DELETE` | `/api/comments/:id` | Delete own comment | Yes (author / Project Admin) |

**Implementation checklist:**
- [ ] Parse `@username` mentions from comment content on save
  - Extract all `@word` patterns, resolve to user IDs, write to `Mention` table
  - Trigger notifications for mentioned users (Phase 7)
- [ ] Only comment author (or Project Admin) can delete
- [ ] Only comment author can edit — set `isEdited: true`
- [ ] Write `COMMENT_ADDED`, `COMMENT_EDITED`, `COMMENT_DELETED` to `AuditLog`

### 6.3 Frontend Tasks

**Components:**
- Activity timeline on issue detail — merged list of audit events + comments in chronological order
- Comment editor with rich text (bold, italic, lists — can use `contenteditable` or a simple textarea)
- `@username` autocomplete when typing `@` in comment box
- Edit/delete controls on own comments

---

## Phase 7 — Notifications

### 7.1 Database Schema

- **`Notification`**
  - `id` (UUID)
  - `recipientId` (FK → User)
  - `type` (Enum: `TASK_ASSIGNED`, `STATUS_CHANGED`, `COMMENT_ADDED`, `MENTIONED`)
  - `message` (String) — human-readable text
  - `issueId` (FK → Issue, nullable)
  - `isRead` (Boolean, default: false)
  - `createdAt` (DateTime)

### 7.2 Backend Tasks

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/notifications` | Get my notifications | Yes |
| `PATCH` | `/api/notifications/:id/read` | Mark notification as read | Yes |
| `PATCH` | `/api/notifications/read-all` | Mark all as read | Yes |

**Trigger notifications when:**
- [ ] Task assigned → notify new assignee (`TASK_ASSIGNED`)
- [ ] Task status changed → notify assignee (`STATUS_CHANGED`)
- [ ] Comment added on task → notify assignee + reporter (`COMMENT_ADDED`)
- [ ] User mentioned in comment → notify mentioned user (`MENTIONED`)

**Implementation checklist:**
- [ ] Polling is acceptable — `GET /notifications` called on an interval (e.g., every 30s)
- [ ] Notifications are persistent — stored in DB, not ephemeral
- [ ] Do NOT notify yourself (a user commenting on their own task should not self-notify)

### 7.3 Frontend Tasks

- [ ] Notification bell icon in navbar with unread count badge
- [ ] Notification dropdown/panel listing recent notifications
  - Each notification shows icon (type), message, relative timestamp (`2 min ago`)
  - Clicking a notification → navigate to the relevant issue
  - Shows unread state vs read state visually
- [ ] Mark individual / all as read button
- [ ] Poll the notifications endpoint every 30 seconds

---

## Phase 8 — Testing, Polish & Documentation

### 8.1 Backend Unit Tests (Mandatory)

Write tests in `backend/src/tests/` using **Jest + ts-jest**.

**Priority test coverage:**
- [ ] Auth: register, login, token refresh, logout
- [ ] Auth middleware: valid token, expired token, missing token
- [ ] Password hashing correctness
- [ ] WIP limit enforcement
- [ ] Workflow transition validation (valid move, invalid move)
- [ ] Story status consistency (children vs parent)
- [ ] RBAC middleware: project admin, viewer, non-member
- [ ] Comment: author-only edit/delete enforcement

### 8.2 Code Quality Checklist

- [ ] `strict: true` in backend `tsconfig.json` (already done)
- [ ] `strict: true` in frontend `tsconfig.app.json`
- [ ] Zero `any` types across all files
- [ ] ESLint passing with no errors (run `npm run lint`)
- [ ] Prettier formatting applied consistently
- [ ] All env vars in `.env`, never hardcoded
- [ ] Proper HTTP status codes everywhere:
  - `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `422 Unprocessable Entity`, `500 Internal Server Error`

### 8.3 UI/UX Polish

- [ ] Fully responsive layout (works on smaller screens too)
- [ ] Loading states on all async operations (spinners / skeleton loaders)
- [ ] Error states with helpful messages
- [ ] Empty states ("No issues yet — create one!")
- [ ] Toasts / snackbars for success and error feedback
- [ ] Accessible: focus states, `aria-label` on icon buttons, contrast ratios

### 8.4 Final Documentation

- [ ] `Readme.md` up to date with setup steps (already done)
- [ ] API documentation (either inline in README or a separate `API.md`)
- [ ] Code comments on complex logic (e.g., WIP limit check, JWT refresh logic)
- [ ] `report.pdf` — design decisions, architecture decisions, GitHub link

---

## Implementation Order (Recommended Sequence)

```
1.  Prisma schema (all models at once — easier than migrating one by one)
2.  Auth backend (register, login, refresh, logout)
3.  Auth middleware (JWT verify, role checks)
4.  Auth frontend (login page, register page, AuthContext)
5.  Projects backend (CRUD + members)
6.  Projects frontend (dashboard, detail page)
7.  Boards backend (CRUD + columns)
8.  Boards frontend (Kanban layout + drag and drop)
9.  Issues backend (CRUD + move)
10. Issues frontend (task cards + issue detail)
11. Workflow transitions backend (validation on move)
12. Audit trail backend (logging on every event)
13. Comments backend + frontend
14. Notifications backend + frontend
15. Unit tests
16. UI polish + responsive fixes
17. Documentation + report
```

---

## Key Constraints (Do NOT Forget)

> These will cost marks if violated.

- NO external drag-and-drop libraries — must use Native HTML Drag and Drop API
- NO Redux / Zustand / MobX — must use React Context + useReducer only
- NO `any` type in TypeScript — strictly typed throughout
- NO libraries not listed in the assignment spec
- WIP limit breaches must **block** the move, not just warn
- Invalid workflow transitions must **block** the move, not just warn
- Both team members must commit from their **own GitHub accounts**
- Backend unit tests are **mandatory and graded**
- Audit log entries are **mandatory** (even if the UI to display them is not)
