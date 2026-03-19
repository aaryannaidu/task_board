// ─── Enums ────────────────────────────────────────────────────────────────────

export type GlobalRole = "GLOBAL_ADMIN" | "MEMBER";
export type ProjectRole = "ADMIN" | "MEMBER" | "VIEWER";
export type IssueType = "STORY" | "TASK" | "BUG";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
  globalRole: GlobalRole;
}

// ─── Project Members ──────────────────────────────────────────────────────────

export interface ProjectMember {
  userID: number;
  projectID: number;
  role: ProjectRole;
  user: Pick<User, "id" | "name" | "email" | "avatarUrl">;
}

// ─── Board ────────────────────────────────────────────────────────────────────

export interface Board {
  id: number;
  name: string;
  projectID: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Project ──────────────────────────────────────────────────────────────────

export interface Project {
  id: number;
  name: string;
  description?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  projectMembers: ProjectMember[];
  boards?: Board[];
}

// ─── Request Bodies ───────────────────────────────────────────────────────────

export interface CreateProjectBody {
  name: string;
  description?: string;
}

export interface UpdateProjectBody {
  name?: string;
  description?: string;
}

export interface AddMemberBody {
  userID: number;
  role: ProjectRole;
}

export interface ChangeRoleBody {
  role: ProjectRole;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  message?: string;
  data?: T;
  error?: string;
}
