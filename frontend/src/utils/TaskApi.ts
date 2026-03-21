import { fetchWithAuth } from "./fetchWithAuth";
import type {
  Task,
  CreateTaskBody,
  UpdateTaskBody,
  MoveTaskBody
} from "./types";

const getBase = (projectId: number) => `/api/projects/${projectId}/tasks`;

// ─── GET /api/projects/:projectId/tasks ──────────────────────────────────────

export async function getTasks(projectId: number): Promise<Task[]> {
  const res = await fetchWithAuth(getBase(projectId), { method: "GET" });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string, message?: string };
    throw new Error(body.error ?? body.message ?? `Failed to load tasks (${res.status})`);
  }

  return res.json() as Promise<Task[]>;
}

// ─── POST /api/projects/:projectId/tasks ─────────────────────────────────────

export async function createTask(projectId: number, body: CreateTaskBody): Promise<{ task: Task }> {
  const res = await fetchWithAuth(getBase(projectId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string, message?: string };
    throw new Error(data.error ?? data.message ?? `Failed to create task (${res.status})`);
  }

  return res.json() as Promise<{ task: Task }>;
}

// ─── GET /api/projects/:projectId/tasks/:taskId ──────────────────────────────

export async function getTaskById(projectId: number, taskId: number): Promise<Task> {
  const res = await fetchWithAuth(`${getBase(projectId)}/${taskId}`, { method: "GET" });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string, message?: string };
    throw new Error(data.error ?? data.message ?? `Failed to load task (${res.status})`);
  }

  return res.json() as Promise<Task>;
}

// ─── PATCH /api/projects/:projectId/tasks/:taskId ────────────────────────────

export async function updateTask(projectId: number, taskId: number, body: UpdateTaskBody): Promise<Task> {
  const res = await fetchWithAuth(`${getBase(projectId)}/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string, message?: string };
    throw new Error(data.error ?? data.message ?? `Failed to update task (${res.status})`);
  }

  return res.json() as Promise<Task>;
}

// ─── POST /api/projects/:projectId/tasks/:taskId/move ────────────────────────

export async function moveTask(projectId: number, taskId: number, body: MoveTaskBody): Promise<Task> {
  const res = await fetchWithAuth(`${getBase(projectId)}/${taskId}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string, message?: string };
    throw new Error(data.error ?? data.message ?? `Failed to move task (${res.status})`);
  }

  return res.json() as Promise<Task>;
}

// ─── DELETE /api/projects/:projectId/tasks/:taskId ───────────────────────────

export async function deleteTask(projectId: number, taskId: number): Promise<{ message: string }> {
  const res = await fetchWithAuth(`${getBase(projectId)}/${taskId}`, { method: "DELETE" });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string, message?: string };
    throw new Error(data.error ?? data.message ?? `Failed to delete task (${res.status})`);
  }

  return res.json() as Promise<{ message: string }>;
}
