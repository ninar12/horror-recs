import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { SearchPage } from "./pages/Search";
import { WatchlistsPage } from "./pages/Watchlists";
import { AboutPage } from "./pages/About";
import { FilmPage } from "./pages/FilmPage";
import { ProfilePage } from "./pages/Profile";
import { AuthModal } from "./components/AuthModal";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
const THEMES = [
    { id: "amber", color: "#ffcc00" },
    { id: "green", color: "#39ff14" },
    { id: "red", color: "#ff4444" },
    { id: "cyan", color: "#00e5ff" },
    { id: "white", color: "#d0d0d0" },
];
function useTheme() {
    const [theme, setTheme] = useState(() => localStorage.getItem("term-theme") || "amber");
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("term-theme", theme);
    }, [theme]);
    return { theme, setTheme };
}
function Nav() {
    const { theme, setTheme } = useTheme();
    const { loggedIn, logout, user, setOpenAuthHandler } = useAuth();
    const [showAuth, setShowAuth] = useState(false);
    useEffect(() => { setOpenAuthHandler(() => setShowAuth(true)); }, []);
    const base = "text-sm transition-colors px-3 py-1 border";
    const active = `${base} border-[var(--term-bright)] text-[var(--term-bright)] bg-[var(--term-bright-5)]`;
    const inactive = `${base} border-transparent text-[var(--term-mid)] hover:text-[var(--term-bright)]`;
    return (_jsxs(_Fragment, { children: [_jsxs("nav", { className: "border-b border-[var(--term-dark)] px-4 py-2 flex items-center gap-2 sm:gap-4 sticky top-0 bg-[var(--term-panel)] backdrop-blur z-10", children: [_jsx("span", { className: "text-[var(--term-bright)] font-['VT323'] text-2xl tracking-widest mr-2", children: ">_ REELSCREAM" }), _jsx("div", { className: "h-4 w-px bg-[var(--term-dark)] hidden sm:block" }), _jsx(NavLink, { to: "/", className: ({ isActive }) => `hidden sm:block ${isActive ? active : inactive}`, end: true, children: "[DISCOVER]" }), _jsx(NavLink, { to: "/watchlists", className: ({ isActive }) => `hidden sm:block ${isActive ? active : inactive}`, children: "[WATCHLIST]" }), loggedIn && (_jsx(NavLink, { to: "/profile", className: ({ isActive }) => `hidden sm:block ${isActive ? active : inactive}`, children: "[PROFILE]" })), _jsx(NavLink, { to: "/about", className: ({ isActive }) => `hidden sm:block ${isActive ? active : inactive}`, children: "[ABOUT]" }), _jsxs("div", { className: "ml-auto flex items-center gap-2 sm:gap-3", children: [loggedIn ? (_jsxs("div", { className: "hidden sm:flex items-center gap-2", children: [_jsx("span", { className: "text-[var(--term-dark)] text-[10px] truncate max-w-[120px]", title: user?.email, children: user?.email }), _jsx("button", { onClick: logout, className: "text-xs border border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)] px-2 py-1 transition-colors", children: "[LOGOUT]" })] })) : (_jsx("button", { onClick: () => setShowAuth(true), className: "text-xs border border-[var(--term-bright)] text-[var(--term-bright)] hover:bg-[var(--term-bright-10)] px-2 py-1 transition-colors", children: "[LOGIN]" })), _jsx("div", { className: "h-4 w-px bg-[var(--term-dark)] hidden sm:block" }), _jsx("span", { className: "text-[var(--term-dark)] text-xs hidden sm:block", children: "COLOR:" }), THEMES.map((t) => (_jsx("button", { onClick: () => setTheme(t.id), title: t.id.toUpperCase(), className: "hidden sm:block w-4 h-4 rounded-full border transition-all", style: {
                                    backgroundColor: t.color,
                                    borderColor: theme === t.id ? t.color : "transparent",
                                    boxShadow: theme === t.id ? `0 0 6px ${t.color}` : "none",
                                    opacity: theme === t.id ? 1 : 0.4,
                                } }, t.id)))] })] }), showAuth && _jsx(AuthModal, { onClose: () => setShowAuth(false) })] }));
}
function AppShell() {
    return (_jsx(BrowserRouter, { children: _jsxs("div", { className: "h-screen flex flex-col text-[var(--term-bright)] overflow-hidden", style: {
                backgroundImage: "url('/backrooms.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
            }, children: [_jsx(Nav, {}), _jsx("div", { className: "flex-1 overflow-hidden pb-12 sm:pb-0", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(SearchPage, {}) }), _jsx(Route, { path: "/watchlists", element: _jsx(WatchlistsPage, {}) }), _jsx(Route, { path: "/profile", element: _jsx(ProfilePage, {}) }), _jsx(Route, { path: "/about", element: _jsx(AboutPage, {}) }), _jsx(Route, { path: "/film/:id", element: _jsx(FilmPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/" }) })] }) }), _jsx("nav", { className: "sm:hidden fixed bottom-0 inset-x-0 border-t border-[var(--term-dark)] bg-[var(--term-panel)] flex z-10", children: [
                        { to: "/", label: "DISCOVER" },
                        { to: "/watchlists", label: "WATCHLIST" },
                        { to: "/profile", label: "PROFILE" },
                    ].map(({ to, label }) => (_jsx(NavLink, { to: to, end: to === "/", className: ({ isActive }) => `flex-1 py-3 text-center text-[10px] font-mono transition-colors ${isActive ? "text-[var(--term-bright)]" : "text-[var(--term-dark)]"}`, children: label }, to))) })] }) }));
}
export default function App() {
    return (_jsx(AuthProvider, { children: _jsx(AppShell, {}) }));
}
