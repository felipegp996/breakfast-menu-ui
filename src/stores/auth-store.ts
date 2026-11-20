import { create } from "zustand";
import type { AuthSession } from "@/lib/api";

interface AuthState {
  session: AuthSession | null;
  hydrated: boolean;
  hydrateSession: () => void;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  hydrated: false,
  hydrateSession: () => {
    let session: AuthSession | null = null;
    try {
      const savedSession = sessionStorage.getItem("morning-table-session");
      session = savedSession ? (JSON.parse(savedSession) as AuthSession) : null;
    } catch {
      session = null;
    }
    set({ session, hydrated: true });
  },
  setSession: (session) => {
    sessionStorage.setItem("morning-table-session", JSON.stringify(session));
    set({ session, hydrated: true });
  },
  clearSession: () => {
    sessionStorage.removeItem("morning-table-session");
    set({ session: null, hydrated: true });
  },
}));