# Task Board — Project Report

**COP290: Design Practices in Computer Science**  
**Project Name:** Task Board  
**GitHub Repository:** [https://github.com/aaryannaidu/task_board](https://github.com/aaryannaidu/task_board)

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

| Layer          | Technology                                      |
| -------------- | ----------------------------------------------- |
| **Frontend**   | React 18, Vite, TypeScript, Vanilla CSS         |
| **Backend**    | Node.js, Express.js, TypeScript                 |
| **Database**   | PostgreSQL                                      |
| **ORM**        | Prisma                                          |
| **Auth**       | JWT (Access + Refresh Tokens), Bcrypt, Cookies  |
| **Testing**    | Jest, ts-jest                                   |

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

## 4. API Documentation

All API endpoints require authentication via JWT stored in an `httpOnly` cookie, with the exception of `/auth/login`, `/auth/register`, and `/auth/refresh`.

### 4.1 Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Registers a new user account. | No |
| `POST` | `/api/auth/login` | Authenticates user and sets session cookies. | No |
| `POST` | `/api/auth/logout` | Clears authentication cookies. | No |
| `POST` | `/api/auth/refresh` | Generates a new access token using a refresh token. | No |
| `GET` | `/api/auth/me` | Retrieves the profile of the logged-in user. | **Yes** |

### 4.2 Users (`/api/users`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `PATCH`| `/api/users/me` | Updates the logged-in user's profile info. | **Yes** |
| `GET`  | `/api/users` | Lists all users. | **Yes** (Admin) |
| `GET`  | `/api/users/:id` | Detailed view of a specific user. | **Yes** (Admin) |

### 4.3 Projects (`/api/projects`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET`  | `/api/projects` | Lists all projects the user is a member of. | **Yes** |
| `POST` | `/api/projects` | Creates a new project. | **Yes** (Admin) |
| `GET`  | `/api/projects/:id` | Returns project details. | **Yes** |
| `PATCH`| `/api/projects/:id` | Updates project metadata. | **Yes** |
| `PATCH`| `/api/projects/:id/archive` | Toggles project archive status. | **Yes** |
| `GET`  | `/api/projects/:id/members` | Retrieves project member list. | **Yes** |
| `POST` | `/api/projects/:id/members` | Adds a user to the project. | **Yes** |
| `PATCH`| `/api/projects/:id/members/:userid` | Promotes/demotes a member's role. | **Yes** |
| `DELETE`| `/api/projects/:id/members/:userid` | Removes a member from the project. | **Yes** |

### 4.4 Boards & Columns (`/api/projects/:projectid/boards`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET`  | `/boards` | Lists all boards in the project. | **Yes** |
| `POST` | `/boards` | Creates a new board. | **Yes** |
| `PATCH`| `/boards/:boardid` | Updates the board details. | **Yes** |
| `DELETE`| `/boards/:boardid` | Removes the board and its contents. | **Yes** |
| `POST` | `/boards/:boardid/columns` | Adds a custom column to a board. | **Yes** |
| `PATCH`| `/boards/:boardid/columns/reorder` | Updates the display order of columns. | **Yes** |
| `PATCH`| `/boards/:boardid/columns/:columnid` | Updates column names or WIP limits. | **Yes** |
| `DELETE`| `/boards/:boardid/columns/:columnid` | Deletes a column. | **Yes** |
| `POST` | `/boards/:boardid/transitions` | Configures allowed sequential status moves. | **Yes** |
| `DELETE`| `/boards/:boardid/transitions/:transitionid`| Deletes a workflow transition rule. | **Yes** |

### 4.5 Tasks (`/api/projects/:projectid/tasks`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET`  | `/` | Fetches all tasks within the current project. | **Yes** |
| `POST` | `/` | Creates a new Task, Bug, or Story. | **Yes** |
| `GET`  | `/:taskid` | Returns details, comments, and audit logs. | **Yes** |
| `PATCH`| `/:taskid` | Updates task fields. | **Yes** |
| `POST` | `/:taskid/move` | Moves a task to a new column. | **Yes** |
| `DELETE`| `/:taskid` | Removes a task. | **Yes** |

### 4.6 Comments (`/api/projects/:projectid/tasks/:taskId/comments`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET`  | `/` | Lists all comments for a specific task. | **Yes** |
| `POST` | `/` | Creates a new comment (triggers `@mentions`). | **Yes** |
| `PATCH`| `/:commentid` | Edits an existing comment. | **Yes** |
| `DELETE`| `/:commentid` | Deletes a comment. | **Yes** |

### 4.7 Notifications (`/api/notifications`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET`  | `/` | Returns unread notifications for the user. | **Yes** |
| `PATCH`| `/read-all` | Marks all notifications as read. | **Yes** |
| `PATCH`| `/:notificationid/read` | Marks a specific notification as read. | **Yes** |

---

## 5. Key Architecture & Design Decisions

### 5.1 Native Drag & Drop Implementation
A strict constraint of the project was to avoid external drag-and-drop libraries. We implemented moving tasks across the Kanban board seamlessly utilizing the **native HTML5 Drag and Drop API** (`draggable`, `onDragStart`, `onDragOver`, `onDrop`). This significantly lowers bundle size and prevents bloated dependencies. 

### 5.2 State Management
We strictly avoided state management libraries like Redux, Zustand, or MobX. Instead, global application state (like user authentication and board state) is managed purely through **React Context API combined with `useReducer`**. This maintains centralized logic while adhering to raw React principles.

### 5.3 Enforced Workflow Integrity (WIP & Transitions)
The backend does **not** rely on the frontend to enforce rules. Instead, moving a task via `PATCH .../move` strictly evaluates two core backend conditions:
1. **Valid Workflow Transition**: The `WorkTransition` table is verified to ensure the requested `fromStatus` to `toStatus` shift is legally allowed on that board. An invalid move is outright blocked—not just warned.
2. **Work-In-Progress (WIP) Limits**: The API immediately queries column population counts. If the target column has reached its explicitly defined `wipLimit`, the API responds with an unprocessable entity error and the move is rejected.

### 5.4 Comprehensive Audit Trails
Every significant lifecycle change in a task—ranging from column transfers and re-assignments to priority shifts—generates an immutable entry in the `AuditLog` table. This creates a highly transparent chronological history mapped directly to user actions, providing enterprise-level visibility over the task lifecycle.

### 5.5 Authentication Security Architecture
Sessions completely decouple from generic client-side `localStorage`. Instead, authentication is managed using dual **JWT Tokens** (`AccessToken` + `RefreshToken`). These are immediately issued out into heavily restricted, secure `httpOnly` cookies—drastically limiting risk exposure from direct Cross-Site Scripting (XSS) attack vectors.

---

## 6. Development Team

| Participant | Contributions | GitHub |
| :--- | :--- | :--- |
| **Naman Kumar** | Backend Infrastructure, Database Schema & Relations, API Routes, Unit Testing | [@naman944](https://github.com/naman944) |
| **U.Aaryan Naidu** | Frontend UI/UX, Component Architecture, Drag & Drop Logic, Global State Management | [@aaryannaidu](https://github.com/aaryannaidu) |

---
