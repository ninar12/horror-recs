/**
 * Global auth context — wraps the whole app so any component can read user state
 * without prop-drilling or re-checking localStorage.
 *
 * Provides:
 *   user     — { id, email, created_at } or null
 *   loggedIn — boolean shorthand
 *   login()  — store token + load user profile
 *   logout() — clear token + reset state
 *   watchedIds — Set<string> of film IDs the user has marked watched
 *   toggleWatched() — add/remove a film from history
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { api } from "../api";

interface User {
  id: string;
  email: string;
  created_at: string | null;
}

interface AuthContextValue {
  user: User | null;
  loggedIn: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  watchedIds: Set<string>;
  toggleWatched: (film: { id: string; title: string }) => Promise<void>;
  historyLoaded: boolean;
  openAuth: () => void;
  setOpenAuthHandler: (fn: () => void) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const openAuthRef = useRef<() => void>(() => {});
  const setOpenAuthHandler = useCallback((fn: () => void) => { openAuthRef.current = fn; }, []);
  const openAuth = useCallback(() => openAuthRef.current(), []);

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.auth.me();
      setUser(res.data);
    } catch {
      // token invalid / expired
      localStorage.removeItem("token");
      setUser(null);
    }
  }, []);

  const loadWatchedIds = useCallback(async () => {
    try {
      const res = await api.history.ids();
      setWatchedIds(new Set(res.data as string[]));
    } catch {
      // not logged in or network error — silent fail
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  // On mount, rehydrate from localStorage
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      loadProfile();
      loadWatchedIds();
    } else {
      setHistoryLoaded(true);
    }
  }, [loadProfile, loadWatchedIds]);

  const login = useCallback(async (token: string) => {
    localStorage.setItem("token", token);
    await loadProfile();
    await loadWatchedIds();
  }, [loadProfile, loadWatchedIds]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
    setWatchedIds(new Set());
    setHistoryLoaded(true);
  }, []);

  const toggleWatched = useCallback(async (film: { id: string; title: string }) => {
    if (!user) return;
    if (watchedIds.has(film.id)) {
      // remove
      try {
        await api.history.remove(film.id);
        setWatchedIds((prev) => {
          const next = new Set(prev);
          next.delete(film.id);
          return next;
        });
      } catch {
        /* silent */
      }
    } else {
      // add
      try {
        await api.history.log({ film_id: film.id, film_title: film.title });
        setWatchedIds((prev) => new Set(prev).add(film.id));
      } catch {
        /* silent */
      }
    }
  }, [user, watchedIds]);

  return (
    <AuthContext.Provider
      value={{ user, loggedIn: !!user, login, logout, watchedIds, toggleWatched, historyLoaded, openAuth, setOpenAuthHandler }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
