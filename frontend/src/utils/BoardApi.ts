import { fetchWithAuth } from "./fetchWithAuth";
import type {
  Board,
  Column,
  WorkTransition,
  CreateBoardBody,
  CreateColumnBody,
  UpdateColumnBody,
  ReorderColumnsBody,
  AddTransitionBody,
} from "./types";

const getBase = (projectId: number) => `/api/projects/${projectId}/boards`;

// ─── GET /api/projects/:projectId/boards ─────────────────────────────────────

export async function getBoards(projectId: number): Promise<Board[]> {
  const res = await fetchWithAuth(getBase(projectId), { method: "GET" });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string, message?: string };
    throw new Error(body.error ?? body.message ?? `Failed to load boards (${res.status})`);
  }

  return res.json() as Promise<Board[]>;
}

// ─── POST /api/projects/:projectId/boards ────────────────────────────────────

export async function createBoard(projectId: number, body: CreateBoardBody): Promise<Board> {
  const res = await fetchWithAuth(getBase(projectId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string, message?: string };
    throw new Error(data.error ?? data.message ?? `Failed to create board (${res.status})`);
  }

  return res.json() as Promise<Board>;
}

// ─── DELETE /api/projects/:projectId/boards/:boardId ─────────────────────────

export async function deleteBoard(projectId: number, boardId: number): Promise<{ message: string }> {
  const res = await fetchWithAuth(`${getBase(projectId)}/${boardId}`, { method: "DELETE" });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string, message?: string };
    throw new Error(data.error ?? data.message ?? `Failed to delete board (${res.status})`);
  }

  return res.json() as Promise<{ message: string }>;
}

// ─── POST /api/projects/:projectId/boards/:boardId/columns ──────────────────

export async function createColumn(projectId: number, boardId: number, body: CreateColumnBody): Promise<Column> {
  const res = await fetchWithAuth(`${getBase(projectId)}/${boardId}/columns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string, message?: string };
    throw new Error(data.error ?? data.message ?? `Failed to create column (${res.status})`);
  }

  return res.json() as Promise<Column>;
}

// ─── PATCH /api/projects/:projectId/boards/:boardId/columns/:columnId ────────

export async function updateColumn(projectId: number, boardId: number, columnId: number, body: UpdateColumnBody): Promise<Column> {
  const res = await fetchWithAuth(`${getBase(projectId)}/${boardId}/columns/${columnId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string, message?: string };
    throw new Error(data.error ?? data.message ?? `Failed to update column (${res.status})`);
  }

  return res.json() as Promise<Column>;
}

// ─── PATCH /api/projects/:projectId/boards/:boardId/columns/reorder ─────────

export async function reorderColumns(projectId: number, boardId: number, body: ReorderColumnsBody): Promise<{ message: string }> {
  const res = await fetchWithAuth(`${getBase(projectId)}/${boardId}/columns/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string, message?: string };
    throw new Error(data.error ?? data.message ?? `Failed to reorder columns (${res.status})`);
  }

  return res.json() as Promise<{ message: string }>;
}

// ─── DELETE /api/projects/:projectId/boards/:boardId/columns/:columnId ───────

export async function deleteColumn(projectId: number, boardId: number, columnId: number): Promise<{ message: string }> {
  const res = await fetchWithAuth(`${getBase(projectId)}/${boardId}/columns/${columnId}`, { method: "DELETE" });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string, message?: string };
    throw new Error(data.error ?? data.message ?? `Failed to delete column (${res.status})`);
  }

  return res.json() as Promise<{ message: string }>;
}

// ─── POST /api/projects/:projectId/boards/:boardId/transitions ───────────────

export async function addTransition(projectId: number, boardId: number, body: AddTransitionBody): Promise<WorkTransition> {
  const res = await fetchWithAuth(`${getBase(projectId)}/${boardId}/transitions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string, message?: string };
    throw new Error(data.error ?? data.message ?? `Failed to add transition (${res.status})`);
  }

  return res.json() as Promise<WorkTransition>;
}

// ─── DELETE /api/projects/:projectId/boards/:boardId/transitions/:transitionId 

export async function removeTransition(projectId: number, boardId: number, transitionId: number): Promise<{ message: string }> {
  const res = await fetchWithAuth(`${getBase(projectId)}/${boardId}/transitions/${transitionId}`, { method: "DELETE" });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string, message?: string };
    throw new Error(data.error ?? data.message ?? `Failed to remove transition (${res.status})`);
  }

  return res.json() as Promise<{ message: string }>;
}
