import { jsx as _jsx } from "react/jsx-runtime";
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
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { api } from "../api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [watchedIds, setWatchedIds] = useState(new Set());
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const openAuthRef = useRef(() => { });
    const setOpenAuthHandler = useCallback((fn) => { openAuthRef.current = fn; }, []);
    const openAuth = useCallback(() => openAuthRef.current(), []);
    const loadProfile = useCallback(async () => {
        try {
            const res = await api.auth.me();
            setUser(res.data);
        }
        catch {
            // token invalid / expired
            localStorage.removeItem("token");
            setUser(null);
        }
    }, []);
    const loadWatchedIds = useCallback(async () => {
        try {
            const res = await api.history.ids();
            setWatchedIds(new Set(res.data));
        }
        catch {
            // not logged in or network error — silent fail
        }
        finally {
            setHistoryLoaded(true);
        }
    }, []);
    // On mount, rehydrate from localStorage
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            loadProfile();
            loadWatchedIds();
        }
        else {
            setHistoryLoaded(true);
        }
    }, [loadProfile, loadWatchedIds]);
    const login = useCallback(async (token) => {
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
    const toggleWatched = useCallback(async (film) => {
        if (!user)
            return;
        if (watchedIds.has(film.id)) {
            // remove
            try {
                await api.history.remove(film.id);
                setWatchedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(film.id);
                    return next;
                });
            }
            catch {
                /* silent */
            }
        }
        else {
            // add
            try {
                await api.history.log({ film_id: film.id, film_title: film.title });
                setWatchedIds((prev) => new Set(prev).add(film.id));
            }
            catch {
                /* silent */
            }
        }
    }, [user, watchedIds]);
    return (_jsx(AuthContext.Provider, { value: { user, loggedIn: !!user, login, logout, watchedIds, toggleWatched, historyLoaded, openAuth, setOpenAuthHandler }, children: children }));
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
}
