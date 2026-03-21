import { fetchWithAuth } from "./fetchWithAuth";
import type { Comment } from "./types";

const getBase = (projectId: number, taskId: number) => `/api/projects/${projectId}/tasks/${taskId}/comments`;

export async function getComments(projectId: number, taskId: number): Promise<Comment[]> {
  const res = await fetchWithAuth(getBase(projectId, taskId), { method: "GET" });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(errorBody.error || "Failed to get comments");
  }
  const data = await res.json();
  return data.comments as Comment[];
}

export async function createComment(projectId: number, taskId: number, content: string): Promise<Comment> {
  const res = await fetchWithAuth(getBase(projectId, taskId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(errorBody.error || "Failed to create comment");
  }
  return res.json() as Promise<Comment>;
}

export async function updateComment(projectId: number, taskId: number, commentId: number, content: string): Promise<Comment> {
  const res = await fetchWithAuth(`${getBase(projectId, taskId)}/${commentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(errorBody.error || "Failed to update comment");
  }
  return res.json() as Promise<Comment>;
}

export async function deleteComment(projectId: number, taskId: number, commentId: number): Promise<{ message: string }> {
  const res = await fetchWithAuth(`${getBase(projectId, taskId)}/${commentId}`, { method: "DELETE" });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(errorBody.error || "Failed to delete comment");
  }
  return res.json() as Promise<{ message: string }>;
}
