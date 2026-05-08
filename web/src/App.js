import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { SearchPage } from "./pages/Search";
import { WatchlistsPage } from "./pages/Watchlists";
import { AboutPage } from "./pages/About";
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
    const base = "text-sm transition-colors px-3 py-1 border";
    const active = `${base} border-[var(--term-bright)] text-[var(--term-bright)] bg-[var(--term-bright-5)]`;
    const inactive = `${base} border-transparent text-[var(--term-mid)] hover:text-[var(--term-bright)]`;
    return (_jsxs("nav", { className: "border-b border-[var(--term-dark)] px-4 py-2 flex items-center gap-4 sticky top-0 bg-[var(--term-panel)] backdrop-blur z-10", children: [_jsx("span", { className: "text-[var(--term-bright)] font-['VT323'] text-2xl tracking-widest mr-2", children: ">_ REELSCREAM" }), _jsx("div", { className: "h-4 w-px bg-[var(--term-dark)]" }), _jsx(NavLink, { to: "/", className: ({ isActive }) => isActive ? active : inactive, end: true, children: "[DISCOVER]" }), _jsx(NavLink, { to: "/watchlists", className: ({ isActive }) => isActive ? active : inactive, children: "[WATCHLISTS]" }), _jsx(NavLink, { to: "/about", className: ({ isActive }) => isActive ? active : inactive, children: "[ABOUT]" }), _jsxs("div", { className: "ml-auto flex items-center gap-2", children: [_jsx("span", { className: "text-[var(--term-dark)] text-xs hidden sm:block mr-1", children: "COLOR:" }), THEMES.map((t) => (_jsx("button", { onClick: () => setTheme(t.id), title: t.id.toUpperCase(), className: "w-4 h-4 rounded-full border transition-all", style: {
                            backgroundColor: t.color,
                            borderColor: theme === t.id ? t.color : "transparent",
                            boxShadow: theme === t.id ? `0 0 6px ${t.color}` : "none",
                            opacity: theme === t.id ? 1 : 0.4,
                        } }, t.id)))] })] }));
}
export default function App() {
    return (_jsx(BrowserRouter, { children: _jsxs("div", { className: "h-screen flex flex-col text-[var(--term-bright)] overflow-hidden", style: {
                backgroundImage: "url('/backrooms.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
            }, children: [_jsx(Nav, {}), _jsx("div", { className: "flex-1 overflow-hidden", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(SearchPage, {}) }), _jsx(Route, { path: "/watchlists", element: _jsx(WatchlistsPage, {}) }), _jsx(Route, { path: "/about", element: _jsx(AboutPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/" }) })] }) })] }) }));
}
