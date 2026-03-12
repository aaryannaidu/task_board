import React, { createContext, useContext, useReducer, useEffect } from "react";

const backendUrl = "http://localhost:3000";

// Types based on the backend schema from project.md
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  globalRole: "GLOBAL_ADMIN" | "MEMBER";
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

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start loading as true to check for an existing session
};

const AuthContext = createContext<{
  state: AuthState;
  dispatch: React.Dispatch<AuthAction>;
} | null>(null);

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN":
      return { ...state, user: action.payload, isAuthenticated: true, isLoading: false };
    case "LOGOUT":
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
    // TODO: Verify the existing access token/session with the backend
    // fetch('/api/users/me')
    //   .then(user => dispatch({ type: "LOGIN", payload: user }))
    //   .catch(() => dispatch({ type: "LOGOUT" }))
    //   .finally(() => dispatch({ type: "SET_LOADING", payload: false }));
    dispatch({ type: "SET_LOADING", payload: false }); // Placeholder
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
