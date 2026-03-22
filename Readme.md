# Task Board — COP290 Assignment 2

A Jira-inspired project management and issue-tracking application built with React + Vite (frontend), Express.js (backend), PostgreSQL (database), and Prisma (ORM). Written entirely in TypeScript.

---

## Team

| Name | Role | GitHub |
|------|------|--------|
| Naman Kumar | Backend | @naman944 |
| U.Aaryan Naidu | Frontend | @aaryannaidu |

---

## Prerequisites

Before running this project make sure you have the following installed:

| Tool | Version | How to install |
|------|---------|----------------|
| Node.js | v18+ | https://nodejs.org |
| npm | v9+ | Comes with Node.js |
| PostgreSQL | v15+ | https://www.postgresql.org/download |
| Git | Latest | https://git-scm.com |

### Verify your installations

Run these commands 

node -v        # should show v18.x.x or higher
npm -v         # should show v9.x.x or higher
psql --version # should show PostgreSQL 15.x or higher
git --version  # should show git version 2.x.x


## Environment Variables
The backend needs a `.env` file to store secrets. This file is never committed to Git.

### Step 1 — Create the file
```bash
cd backend
touch .env
```
### Step 2 - Fill it 
copy .env.example
and fill its Requirement

### Step 3 — Generate JWT secrets
Run this command twice to get JWT Token
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

> **Warning:** Running tests will clear your database. 
> Do not run tests if you have important data you want to keep.
## Database Setup

### Step 1 — Start PostgreSQL

On Mac:
```bash
brew services start postgresql@15
```

On Linux:
```bash
sudo service postgresql start
```

On Windows: Open pgAdmin or start from Services.

### Step 2 — Create the database
```bash
psql -U postgres
```

Inside the psql shell run these commands one by one:
```sql
CREATE USER taskboard_user WITH PASSWORD 'taskboard123';
CREATE DATABASE taskboard_db OWNER taskboard_user;
GRANT ALL PRIVILEGES ON DATABASE taskboard_db TO taskboard_user;
\q
```

### Step 3 — Run migrations

This creates all the tables in your database:
```bash
cd backend
npx prisma migrate dev --name init
```

You should see:
```
Your database is now in sync with your schema
```

### Step 4 — Generate Prisma client
```bash
npx prisma generate
```
if it show error Run
```bash
npx prisma reset
```
### Step 5 - To open Database

```bash
npx prisma studio # this open the Database in browser
```



## Backend Setup
```bash
cd backend
npm install
npx prisma generate
npm run dev # start the server 
```

You should see:
```
Server running on http://localhost:3000
```

### Backend scripts

| Command | What it does |
|---------|-------------|
| `npm test` | Run all unit tests |   
| `npm run dev` | Start server with auto-restart on file changes |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run start` | Run the compiled production build | 




## Frontend Setup
```bash
cd frontend
npm install
npm run dev # start the server
```

You should see:
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser.

### Frontend scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |


## Running the Full Project

You need two terminal windows open at the same time.

**Terminal 1 — start backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — start frontend:**
```bash
cd frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.

Make sure the backend is running BEFORE opening the frontend — otherwise API calls will fail.



## How to Use

### First time setup

1. Open http://localhost:5173
2. Click **Register** and create your account
3. Open a new terminal and run Prisma Studio to make yourself admin:
```bash
   cd backend
   npx prisma studio
```
4. In Prisma Studio go to the **User** table
5. Find your user and change `globalRole` from `MEMBER` to `ADMIN`
6. Save and go back to the app
7. Login with that account , if you loged - then re-login .

### Creating your first project

1. Click **Create Project** on the projects page
2. Give it a name and click create
3. Click on the project to open it
4. Click **Create Board** to add a board
5. Inside the board click **Add Column** to add columns like:
   - To Do
   - In Progress
   - Review
   - Done

### Setting up workflow transitions

Transitions define which column moves are allowed. Without them tasks cannot be moved.

1. After creating columns, use the API to add transitions:
```
   POST /api/projects/:projectId/boards/:boardId/transitions
   Body: { "fromStatus": "To Do", "toStatus": "In Progress" }
```
2. Repeat for each allowed move

### Creating tasks

1. Click **+ Create** inside any column
2. For making Story click on **Create Story** make a story parent 
3. Fill in title, type (TASK/BUG), priority
4. Optionally assign to a team member
5. Select Story Optionally Not nesscessory 
5. Click create


### Moving tasks

1. Drag a task card from one column to another
2. The move will be blocked if:
   - The task is a STORY type
   - The target column is full (WIP limit reached)
   - The transition is not allowed

### Adding team members

1. Go to the project page
2. Click **+ Add Member**
3. Enter their email address
4. Choose their role (ADMIN/MEMBER/VIEWER)

### Comments and mentions

1. Open any task to see the task detail page
2. Type in the comment box
3. Use `@username` to mention a teammate
4. They will receive a notification

### Notifications

1. Click the bell icon in the top right
2. See all your notifications
3. Click to mark as read

### Uploading your avatar

1. Go to Profile Settings
2. Click on your avatar
3. Upload a JPG or PNG image (max 5MB)


## Running Tests

### Install test dependencies

Before running tests make sure these are installed:
```bash
cd backend
npm install --save-dev jest ts-jest @types/jest supertest @types/supertest
```

### Run all tests
```bash
cd backend
npm test
```

### Run a specific test file
```bash
npm test auth      # only auth tests
npm test task      # only task tests
npm test project   # only project tests
```

### What is tested

| File | What it covers |
|------|---------------|
| `auth.test.ts` | Register, login, logout |
| `task.test.ts` | Create task, WIP limit, STORY rule, transitions |
| `project.test.ts` | Create project, add members, archive, permissions |

### Expected output
```
Test Suites: 3 passed, 3 total
Tests:       29 passed
```

> **Warning:** Running tests will clear your database.
> Do not run tests if you have important data you want to keep.


## API Documentation

All protected routes require a valid JWT access token stored in an HTTP-only cookie.
Login first to get the cookie, then all subsequent requests will be authenticated automatically.

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register | Register new user | No |
| POST | /api/auth/login | Login | No |
| POST | /api/auth/logout | Logout | No |
| POST | /api/auth/refresh | Refresh access token | No |
| GET | /api/auth/me | Get current logged in user | Yes |

### Projects
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/projects | Get all projects for logged in user | Yes |
| POST | /api/projects | Create project (Global Admin only) | Yes |
| GET | /api/projects/:id | Get project details | Yes |
| PATCH | /api/projects/:id | Update project name/description | Yes |
| PATCH | /api/projects/:id/archive | Toggle archive/unarchive | Yes |
| GET | /api/projects/:id/members | Get all project members | Yes |
| POST | /api/projects/:id/members | Add member by email | Yes |
| PATCH | /api/projects/:id/members/:userid | Change member role | Yes |
| DELETE | /api/projects/:id/members/:userid | Remove member | Yes |

### Boards
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/projects/:projectid/boards | Get all boards in project | Yes |
| POST | /api/projects/:projectid/boards | Create board | Yes |
| PATCH | /api/projects/:projecjid/boards/:boardid | Update board name | Yes |
| DELETE | /api/projects/:projectid/boards/:boardid | Delete board | Yes |

### Columns
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/projects/:projectid/boards/:boardid/columns | Create column | Yes |
| PATCH | /api/projects/:projectid/boards/:boardid/columns/reorder | Reorder columns | Yes |
| PATCH | /api/projects/:projectid/boards/:boardid/columns/:columnid | Update column | Yes |
| DELETE | /api/projects/:projectid/boards/:boardid/columns/:columnid | Delete column | Yes |

### Workflow Transitions
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/projects/:projectid/boards/:boardid/transitions | Add allowed transition | Yes |
| DELETE | /api/projects/:projectid/boards/:boardid/transitions/:transitionid | Remove transition | Yes |

### Tasks
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/projects/:projectid/tasks | Get all tasks in project | Yes |
| POST | /api/projects/:projectid/tasks | Create task | Yes |
| GET | /api/projects/:projectid/tasks/:taskid | Get task by ID | Yes |
| PATCH | /api/projects/:projectid/tasks/:taskid | Update task | Yes |
| POST | /api/projects/:projectid/tasks/:taskid/move | Move task to another column | Yes |
| DELETE | /api/projects/:projectid/tasks/:taskid | Delete task | Yes |

### Comments
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/projects/:projectid/tasks/:taskid/comments | Get all comments on task | Yes |
| POST | /api/projects/:projectid/tasks/:taskid/comments | Create comment (supports @mentions) | Yes |
| PATCH | /api/projects/:projectid/tasks/:taskid/comments/:commentid | Update own comment | Yes |
| DELETE | /api/projects/:projectid/tasks/:taskid/comments/:commentid | Delete own comment | Yes |

### Notifications
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/notifications | Get all notifications for logged in user | Yes |
| PATCH | /api/notifications/read-all | Mark all notifications as read | Yes |
| PATCH | /api/notifications/:notificationid/read | Mark one notification as read | Yes |

### Users
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| PATCH | /api/users/me | Update own name | Yes |
| GET | /api/users | List all users (Admin only) | Yes |
| GET | /api/users/:id | Get user by ID (Admin only) | Yes |

### Request Body Examples

**Register:**
```json
{
  "name": "Naman Kumar",
  "email": "naman@example.com",
  "password": "password123"
}
```

**Create Project:**
```json
{
  "name": "My Project",
  "description": "Optional description"
}
```

**Create Task:**
```json
{
  "title": "Fix login bug",
  "columnId": 1,
  "type": "BUG",
  "priority": "HIGH",
  "assigneeId": 2,
  "parentId": 5,
  "dueDate": "2026-04-01"
}
```

**Move Task:**
```json
{
  "columnId": 3
}
```

**Add Transition:**
```json
{
  "fromStatus": "To Do",
  "toStatus": "In Progress"
}
```

**Add Member:**
```json
{
  "email": "teammate@example.com",
  "role": "MEMBER"
}
```

