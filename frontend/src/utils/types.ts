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

// ─── Board & Related ────────────────────────────────────────────────────────────

export interface Column {
  id: number;
  name: string;
  order: number;
  wipLimit: number | null;
  boardID: number;
}

export interface WorkTransition {
  id: number;
  boardID: number;
  fromStatus: string;
  toStatus: string;
}

export interface Board {
  id: number;
  name: string;
  projectID: number;
  createdAt: string;
  updatedAt: string;
  columns?: Column[];
  transitions?: WorkTransition[];
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
  email: string;
  role: ProjectRole;
}

export interface ChangeRoleBody {
  role: ProjectRole;
}

export interface CreateBoardBody {
  name: string;
}

export interface CreateColumnBody {
  name: string;
  order?: number;
  wipLimit?: number;
}

export interface UpdateColumnBody {
  name?: string;
  order?: number;
  WipLimit?: number; // Matches the backend expected spelling
}

export interface ReorderColumnsBody {
  columns: { id: number; order: number }[];
}

export interface AddTransitionBody {
  fromStatus: string;
  toStatus: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  message?: string;
  data?: T;
  error?: string;
}
