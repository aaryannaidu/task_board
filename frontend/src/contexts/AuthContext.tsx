import React, { createContext, useContext, useReducer, useEffect } from "react";

// Types based on the backend schema from project.md
export interface User {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
  globalRole: "ADMIN" | "MEMBER";
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: "LOGIN"; payload: User }
  | { type: "LOGOUT" }
  | { type: "UPDATE_PROFILE"; payload: Partial<User> }
  | { type: "SET_LOADING"; payload: boolean };

// Synchronously pre-populate from localStorage so the header renders
// immediately on page load / refresh, before the /api/auth/me round-trip.
function getInitialState(): AuthState {
  try {
    const stored = localStorage.getItem("user");
    if (stored) {
      const user = JSON.parse(stored) as User;
      return { user, isAuthenticated: true, isLoading: true };
    }
  } catch {
    // ignore malformed data
  }
  return { user: null, isAuthenticated: false, isLoading: true };
}

const initialState: AuthState = getInitialState();

const AuthContext = createContext<{
  state: AuthState;
  dispatch: React.Dispatch<AuthAction>;
} | null>(null);

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN":
      localStorage.setItem("user", JSON.stringify(action.payload));
      return { ...state, user: action.payload, isAuthenticated: true, isLoading: false };
    case "LOGOUT":
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      return { ...state, user: null, isAuthenticated: false, isLoading: false };
    case "UPDATE_PROFILE":
      return state.user
        ? { ...state, user: { ...state.user, ...action.payload } }
        : state;
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Try to restore session using the existing access token cookie.
    // If the access token is expired, the /api/auth/me call returns 401.
    // We then attempt a silent refresh via /api/auth/refresh (which uses the
    // refresh token cookie) and retry /api/auth/me once.
    async function restoreSession() {
      try {
        let res = await fetch("/api/auth/me", { credentials: "include" });

        if (res.status === 401) {
          // Access token expired — try to silently refresh it
          const refreshRes = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include",
          });

          if (!refreshRes.ok) {
            // Refresh token also expired/revoked — user must log in again
            dispatch({ type: "LOGOUT" });
            return;
          }

          // Retry /me with the fresh access token
          res = await fetch("/api/auth/me", { credentials: "include" });
        }

        if (res.ok) {
          const user = await res.json() as User;
          dispatch({ type: "LOGIN", payload: user });
        } else {
          dispatch({ type: "LOGOUT" });
        }
      } catch {
        dispatch({ type: "LOGOUT" });
      }
    }

    void restoreSession();
  }, []);

  return (
    <AuthContext.Provider value={{ state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
