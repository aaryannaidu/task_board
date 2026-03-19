/**
 * fetchWithAuth — a thin wrapper around fetch that automatically handles
 * expired access tokens (HTTP 401).
 *
 * Flow:
 *  1. Make the original request (browser sends access_token cookie automatically)
 *  2. If the response is 401, call POST /api/auth/refresh to get a new access token
 *  3. If the refresh succeeds, retry the original request once
 *  4. If the refresh also fails (refresh token expired/revoked) → throw so the
 *     caller (or AuthContext) can redirect to /login
 */

let isRefreshing = false;
// Queue of resolve/reject callbacks to drain after a refresh completes
type PendingCallback = { resolve: () => void; reject: (e: Error) => void };
const pendingQueue: PendingCallback[] = [];

function processQueue(error: Error | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  pendingQueue.length = 0;
}

async function refreshAccessToken(): Promise<void> {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Session expired. Please log in again.");
  }
}

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, { credentials: "include", ...init });

  // Happy path – no token problem
  if (response.status !== 401) return response;

  // Already refreshing in another concurrent call → queue this one
  if (isRefreshing) {
    await new Promise<void>((resolve, reject) => {
      pendingQueue.push({ resolve, reject });
    });
    // Retry original request after refresh succeeded
    return fetch(input, { credentials: "include", ...init });
  }

  // This call will do the refresh
  isRefreshing = true;
  try {
    await refreshAccessToken();
    processQueue(null);
    // Retry the original request with the new access token
    return fetch(input, { credentials: "include", ...init });
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Session expired");
    processQueue(error);
    throw error;
  } finally {
    isRefreshing = false;
  }
}
