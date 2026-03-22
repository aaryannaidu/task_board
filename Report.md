# Task Board — Project Report

**COP290: Design Practices in Computer Science**  
**Project Name:** Task Board  
**GitHub Repository:** [https://github.com/aaryannaidu/task_board](https://github.com/aaryannaidu/task_board)
**Team:** Naman Kumar, U. Aaryan Naidu

---

## 1. Introduction

**Task Board** is a professional-grade project management and issue-tracking application inspired by modern agile workflows like Kanban. It provides a centralized platform for teams to collaborate, track progress, and manage tasks through a highly intuitive and responsive interface.

The application allows users to create multiple projects, organize work into customizable boards with dynamic columns, and manage the full lifecycle of tasks (Stories, Tasks, and Bugs). Key features include:
- **Kanban Boards**: Visual task management with native drag-and-drop.
- **Workflow Transitions**: Enforced state changes for data integrity.
- **WIP Limits**: Strict Work-In-Progress limits to prevent bottlenecks.
- **Real-time Collaboration**: Rich-text comments with `@mentions`.
- **Notifications**: A persistent notification system for mentions and assignments.
- **Security**: Robust JWT-based authentication with secure HTTP-only cookies.

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Vanilla CSS |
| State Management | React Context + useReducer |
| Drag and Drop | Native HTML5 Drag and Drop API |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT (Access + Refresh Tokens), bcrypt |
| Testing | Jest, ts-jest, supertest |

---

## 3. Database Design

The database schema is designed using Prisma to enforce strong relationships and data integrity.

### 3.1 Data Models & Purpose

| Model | Purpose | Key Fields |
| :--- | :--- | :--- |
| **User** | Manages credentials, profiles, and global roles. | `id`, `email`, `name`, `passwordHash`, `globalRole` |
| **RefreshToken** | Manages long-lived auth sessions securely. | `id`, `token`, `userID`, `expiresAt` |
| **Project** | The top-level container for boards and members. | `id`, `name`, `description`, `archived` |
| **ProjectMember** | Tracks users assigned to projects with permissions. | `userID`, `projectID`, `role` (Admin/Member/Viewer) |
| **Board** | Groups columns and defines workflow rules. | `id`, `name`, `projectID` |
| **Column** | Represents a stage in the workflow (e.g., "To Do"). | `id`, `name`, `order`, `wipLimit` |
| **Task** | The core unit of work (Story, Task, or Bug). | `id`, `title`, `type`, `priority`, `status`, `columnID` |
| **Comment** | Enables team discussion on specific tasks. | `id`, `content`, `taskID`, `authorID` |
| **WorkTransition** | Defines which status changes are allowed. | `boardID`, `fromStatus`, `toStatus` |
| **AuditLog** | Records a history of all changes made to a task. | `taskID`, `actorId`, `eventtype`, `oldValue`, `newValue` |
| **Notification** | Persistent alerts for user actions (mentions, etc). | `userID`, `message`, `type`, `read`, `taskID` |

---

### 3.2 Key Design Decisions

**Role based access control** is implemented at two levels. Global roles (ADMIN/MEMBER) control who can create projects. Project roles (ADMIN/MEMBER/VIEWER) control what each member can do within a project.

**Cascade deletes** are used throughout. Deleting a project removes all its boards, columns, tasks, comments, audit logs, and notifications automatically.

**Indexes** are placed on frequently queried columns — `columnID`, `assigneeID`, and `reporterID` in the Task model — for query performance.

**Self-referential relation** on Task allows Stories to have child Tasks and Bugs using `parentID`.

---

## 4. Backend Architecture

### 4.1 Project Structure
```
backend/src/
├── auth/           ← auth routes
├── controllers/    ← request handlers
├── middleware/     ← authenticate, errorHandler
├── routes/         ← all route definitions
├── utils/          ← prisma, jwt, password helpers
├── types/          ← TypeScript interfaces
└── tests/          ← Jest unit tests
```

### 4.2 Authentication

Authentication uses dual JWT tokens stored in HTTP-only cookies.

- **Access token** — expires in 15 minutes, sent with every request
- **Refresh token** — expires in 7 days, stored in database, used to issue new access tokens

HTTP-only cookies prevent JavaScript from reading the tokens, protecting against XSS attacks. On logout, the refresh token is deleted from the database and both cookies are cleared.

### 4.3 Middleware

Two middleware files handle cross-cutting concerns:

**authenticate.ts** — runs before every protected route. Reads the access token cookie, verifies the JWT signature, and attaches the user payload to `req.user`. Returns 401 if token is missing or invalid.

**errorHandler.ts** — registered last in Express. Catches any unhandled errors and returns clean JSON instead of HTML crash pages.

### 4.4 Key Business Logic

**WIP Limits** — Before creating or moving a task into a column, the backend counts existing tasks in that column. If the count equals or exceeds the `wipLimit`, the request is rejected with 400.

**Workflow Transitions** — Before moving a task, the backend checks the `WorkTransition` table for a row matching `boardID + fromStatus + toStatus`. If no row exists, the move is blocked with 400.

**STORY rule** — Tasks of type STORY cannot be moved between columns. This is enforced in `moveTask` before any other checks.

**Audit logging** — Every status change and assignee change creates an immutable row in `AuditLog` with the old value, new value, actor, and timestamp.

**Notifications** — Four events trigger notifications: task assigned, status changed, comment added, @mention in comment.

---


## 5. Frontend Architecture

### 5.1 Pages

| Page | Description |
|------|-------------|
| Login | JWT authentication form |
| Register | New account creation |
| Projects | List of all user projects |
| Project Detail | Boards and members overview |
| Board / Kanban | Columns and task cards with drag and drop |
| Task Detail | Full task view with comments and audit trail |
| Profile | Avatar upload and name update |
| Notifications | Notification list with mark as read |

### 5.2 State Management

Global state is managed using React Context combined with useReducer — no Redux or Zustand. The context stores authenticated user info, current project, and board state. All state updates go through typed reducer actions.

### 5.3 Drag and Drop

Task movement is implemented using the native HTML5 Drag and Drop API without any external libraries. The `draggable` attribute, `onDragStart`, `onDragOver`, and `onDrop` event handlers manage the interaction. When a card is dropped on a column, the frontend calls `POST /tasks/:id/move` which enforces all backend rules before updating.

### 5.4 API Communication

All HTTP requests use the native `fetch()` API with `credentials: 'include'` to automatically send cookies. No Axios is used. A central utility handles request building and error parsing.

---

## 6. Testing

Backend unit tests are written with Jest and supertest. Three test files cover critical business logic.

### 6.1 Test Coverage

**auth.test.ts**
- Register creates user successfully
- Register returns 400 if email already taken
- Register returns 400 if fields missing
- Login succeeds with correct credentials
- Login returns 401 with wrong password
- Login returns 401 with wrong email
- Logout clears cookies

**task.test.ts**
- Create task successfully
- Returns 400 if title missing
- Blocks task creation when WIP limit reached
- Blocks moving a STORY task
- Blocks move if transition not in WorkTransition table
- Allows move when valid transition exists

**project.test.ts**
- Global Admin can create project
- Member cannot create project — returns 403
- Returns 400 if project name missing
- Returns list of projects for logged in user
- Returns 401 if not logged in
- Admin can add member by email
- Cannot add same member twice — returns 400
- Member cannot add members — returns 403
- Cannot remove last admin — returns 400
- Admin can remove a regular member
- Admin can update project name
- Member cannot update project — returns 403
- Admin can archive project
- Admin can unarchive project

### 6.2 Test Results
```
Test Suites: 3 passed, 3 total
Tests:       29 passed, 0 failed
```

## 7. Assignment Requirements Checklist

| Requirement | Status |
|-------------|--------|
| TypeScript strict mode | ✅ |
| No Redux or Zustand | ✅ React Context + useReducer |
| No Axios | ✅ Native fetch() |
| No external drag and drop | ✅ Native HTML5 API |
| JWT in HTTP-only cookies | ✅ |
| WIP limits block moves | ✅ |
| Workflow transitions enforced | ✅ |
| STORY cannot be moved | ✅ |
| Audit trail for status/assignee changes | ✅ |
| Notifications persistent in DB | ✅ |
| @mention in comments | ✅ |
| Avatar upload | ✅ multer |
| Backend unit tests mandatory | ✅ Jest |
| Both teammates have GitHub commits | ✅ |
| README with setup instructions | ✅ |

---
## 8. Challenges and Solutions

**Prisma 7 compatibility** — The starter repo had Prisma 7 installed which changed how database URLs are configured. We resolved this by downgrading to Prisma 6 which uses the standard `schema.prisma` datasource URL configuration.

**WorkTransition setup** — Transitions must be created manually after boards are created. We added default transition creation in the board controller so users do not have to set them up manually via API.

**TypeScript strict mode** — With `strict: true` and `noUnusedLocals`, many common patterns required explicit typing. We used typed interfaces for all request bodies, typed the Express Request object globally using `express.d.ts`, and avoided `any` throughout.

**Cookie based auth in tests** — Supertest does not automatically handle cookies between requests like a browser does. We solved this by extracting the `set-cookie` header after login and passing it explicitly in subsequent test requests.

---

## 9. Team Contributions

| Member | Contributions |Github username |
|--------|--------------|-----------------|
| **Naman Kumar** | Backend Infrastructure, Database Schema & Relations, API Routes, Unit Testing | [@naman944](https://github.com/naman944) |
| **U.Aaryan Naidu** | Frontend UI/UX, Component Architecture, Drag & Drop Logic, Global State Management | [@aaryannaidu](https://github.com/aaryannaidu) |

---

## 10. Conclusion

Task Board successfully implements all mandatory assignment requirements including strict TypeScript, WIP limits, workflow transitions, audit trails, notifications, and comprehensive unit tests. The application demonstrates clean separation of concerns between frontend and backend, professional REST API design, and adherence to assignment constraints throughout.




---
