import { fetchWithAuth } from "./fetchWithAuth";
import type {
  Project,
  ProjectMember,
  CreateProjectBody,
  UpdateProjectBody,
  AddMemberBody,
  ChangeRoleBody,
} from "./types";

// All requests use relative paths so they go through the Vite proxy
// (/api → http://localhost:3000). This keeps them same-origin so the
// httpOnly auth cookie is attached by the browser automatically.
const BASE = "/api/projects";

// ─── GET /api/projects ────────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  const res = await fetchWithAuth(BASE, { method: "GET" });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `Failed to load projects (${res.status})`);
  }

  return res.json() as Promise<Project[]>;
}

// ─── POST /api/projects ───────────────────────────────────────────────────────

export async function createProject(body: CreateProjectBody): Promise<Project> {
  const res = await fetchWithAuth(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(data.message ?? `Failed to create project (${res.status})`);
  }

  return res.json() as Promise<Project>;
}

// ─── GET /api/projects/:id ────────────────────────────────────────────────────

export async function getProjectDetails(id: number): Promise<Project> {
  const res = await fetchWithAuth(`${BASE}/${id}`, { method: "GET" });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(data.message ?? `Project not found (${res.status})`);
  }

  return res.json() as Promise<Project>;
}

// ─── PATCH /api/projects/:id ──────────────────────────────────────────────────

export async function updateProject(id: number, body: UpdateProjectBody): Promise<Project> {
  const res = await fetchWithAuth(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(data.message ?? `Failed to update project (${res.status})`);
  }

  return res.json() as Promise<Project>;
}

// ─── PATCH /api/projects/:id/archive ─────────────────────────────────────────

export async function archiveProject(id: number): Promise<{ message: string; project: Project }> {
  const res = await fetchWithAuth(`${BASE}/${id}/archive`, { method: "PATCH" });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(data.message ?? `Failed to archive project (${res.status})`);
  }

  return res.json() as Promise<{ message: string; project: Project }>;
}

// ─── GET /api/projects/:id/members ───────────────────────────────────────────

export async function getProjectMembers(id: number): Promise<ProjectMember[]> {
  const res = await fetchWithAuth(`${BASE}/${id}/members`, { method: "GET" });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(data.message ?? `Failed to load members (${res.status})`);
  }

  return res.json() as Promise<ProjectMember[]>;
}

// ─── POST /api/projects/:id/members ──────────────────────────────────────────

export async function addMember(id: number, body: AddMemberBody): Promise<{ message: string }> {
  const res = await fetchWithAuth(`${BASE}/${id}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(data.message ?? `Failed to add member (${res.status})`);
  }

  return res.json() as Promise<{ message: string }>;
}

// ─── PATCH /api/projects/:id/members/:userId ─────────────────────────────────

export async function changeMemberRole(
  projectId: number,
  userId: number,
  body: ChangeRoleBody,
): Promise<{ message: string }> {
  const res = await fetchWithAuth(`${BASE}/${projectId}/members/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(data.message ?? `Failed to change role (${res.status})`);
  }

  return res.json() as Promise<{ message: string }>;
}

// ─── DELETE /api/projects/:id/members/:userId ─────────────────────────────────

export async function removeMember(
  projectId: number,
  userId: number,
): Promise<{ message: string }> {
  const res = await fetchWithAuth(`${BASE}/${projectId}/members/${userId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(data.message ?? `Failed to remove member (${res.status})`);
  }

  return res.json() as Promise<{ message: string }>;
}
