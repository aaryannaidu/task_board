import { fetchWithAuth } from "./fetchWithAuth";
import type { Notification } from "./types";

const BASE_URL = "/api/notifications";

export async function getNotifications(): Promise<Notification[]> {
  const res = await fetchWithAuth(BASE_URL, { method: "GET" });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(errorBody.error || "Failed to get notifications");
  }
  return res.json() as Promise<Notification[]>;
}

export async function markAsRead(notificationId: number): Promise<Notification> {
  const res = await fetchWithAuth(`${BASE_URL}/${notificationId}/read`, { method: "PATCH" });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(errorBody.error || "Failed to mark notification as read");
  }
  return res.json() as Promise<Notification>;
}

export async function markAllRead(): Promise<{ message: string }> {
  const res = await fetchWithAuth(`${BASE_URL}/read-all`, { method: "PATCH" });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(errorBody.error || "Failed to mark all notifications as read");
  }
  return res.json() as Promise<{ message: string }>;
}
