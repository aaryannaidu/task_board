# Task Board — COP290 Assignment 2

A Jira-inspired project management and issue-tracking application built with **React + Vite** (frontend), **Express.js** (backend), **PostgreSQL** (database), and **Prisma** (ORM). Written entirely in **TypeScript**.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Database Setup (PostgreSQL)](#database-setup-postgresql)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Running the Full Project](#running-the-full-project)
- [Running Tests](#running-tests)
- [Tech Stack](#tech-stack)

---

## Project Structure

```
project_manager/
├── frontend/               # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route-level page components
│   │   ├── context/        # React Context + useReducer (state management)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # Shared TypeScript types/interfaces
│   │   └── utils/          # Helper functions
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                # Express.js + TypeScript
│   ├── src/
│   │   ├── routes/         # Express route definitions
│   │   ├── controllers/    # Request handler logic
│   │   ├── middleware/      # Auth, error handling, etc.
│   │   ├── services/       # Business logic layer
│   │   ├── utils/          # Utility functions (JWT, hashing, etc.)
│   │   ├── types/          # Shared TypeScript types/interfaces
│   │   └── tests/          # Unit tests (Jest)
│   ├── prisma/
│   │   └── schema.prisma   # Prisma database schema
│   ├── .env                # Environment variables (DO NOT commit)
│   ├── tsconfig.json
│   └── package.json
│
├── .gitignore              # Root-level gitignore
└── Reademe.md              # This file
```

---

## Prerequisites

Make sure you have the following installed on your machine:

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | v18+ | https://nodejs.org |
| **npm** | v9+ | Comes with Node.js |
| **PostgreSQL** | v15+ | https://www.postgresql.org/download/ |
| **TypeScript** | v5+ | `npm install -g typescript` |

To verify:
```bash
node -v
npm -v
psql --version
```

---

## Environment Variables

The backend uses a `.env` file. **This file is never committed to Git.**

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. You'll find a pre-generated `.env` file from Prisma init. Update it with your actual PostgreSQL credentials:
   ```env
   # backend/.env

   # PostgreSQL connection string
   DATABASE_URL="postgresql://<USER>:<PASSWORD>@localhost:5432/<DB_NAME>?schema=public"

   # JWT secrets
   JWT_ACCESS_SECRET="your-access-token-secret-here"
   JWT_REFRESH_SECRET="your-refresh-token-secret-here"

   # Token expiry
   JWT_ACCESS_EXPIRES_IN="15m"
   JWT_REFRESH_EXPIRES_IN="7d"

   # Server port
   PORT=3000
   ```

   Replace `<USER>`, `<PASSWORD>`, and `<DB_NAME>` with your actual PostgreSQL details.

---

## Database Setup (PostgreSQL)

### 1. Create the PostgreSQL Database

Log into your PostgreSQL shell and create the database:

```bash
psql -U postgres
```

Inside the psql shell:
```sql
CREATE USER taskboard_user WITH PASSWORD 'yourpassword';
CREATE DATABASE taskboard_db OWNER taskboard_user;
GRANT ALL PRIVILEGES ON DATABASE taskboard_db TO taskboard_user;
\q
```

Then update your `DATABASE_URL` in `backend/.env` to match:
```
DATABASE_URL="postgresql://taskboard_user:yourpassword@localhost:5432/taskboard_db?schema=public"
```

### 2. Run Prisma Migrations

Once the schema is defined (in `backend/prisma/schema.prisma`), apply migrations:

```bash
cd backend
npx prisma migrate dev --name init
```

This will:
- Create all tables in your PostgreSQL database
- Generate the Prisma Client

### 3. (Optional) Open Prisma Studio

Prisma Studio is a GUI to view and edit your database directly:
```bash
npx prisma studio
```

---

## Backend Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Install dependencies (if not already done)
npm install

# 3. Generate Prisma Client (must do this after any schema change)
npx prisma generate

# 4. Start the development server (auto-restarts on file changes)
npm run dev
```

The backend will be running at: **http://localhost:3000**

### Available Backend Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot-reload (nodemon + ts-node) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run the compiled production build |
| `npm run test` | Run Jest unit tests with coverage |
| `npm run lint` | Lint source files with ESLint |

---

## Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies (if not already done)
npm install

# 3. Start the development server
npm run dev
```

The frontend will be running at: **http://localhost:5173**

### Available Frontend Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Build for production (outputs to `dist/`) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Lint with ESLint |

> **Note:** The frontend proxies API requests to the backend. Make sure the backend is running before using the app.

---

## Running the Full Project

Open **two separate terminal windows**:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Then visit **http://localhost:5173** in your browser.

---

## Running Tests

Backend unit tests are **mandatory** and use Jest:

```bash
cd backend
npm run test
```

Coverage reports will be generated in `backend/coverage/`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, TypeScript, React Router, CSS Modules |
| **State Management** | React Context + useReducer (built-in — no Redux) |
| **Drag & Drop** | Native HTML Drag and Drop API (no external libraries) |
| **Backend** | Express.js, TypeScript |
| **Authentication** | JWT (access + refresh tokens), bcrypt |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Testing** | Jest + ts-jest |
| **Code Style** | ESLint, Prettier (Google TypeScript Style Guide) |

---

## Notes

- Both team members must commit from their **own GitHub accounts**
- Do **not** use any libraries outside those listed in the assignment spec
- All TypeScript must use `strict: true` — no `any` types allowed
