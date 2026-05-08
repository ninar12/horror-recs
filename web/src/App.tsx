import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { SearchPage } from "./pages/Search";
import { WatchlistsPage } from "./pages/Watchlists";
import { AboutPage } from "./pages/About";

const THEMES = [
  { id: "amber", color: "#ffcc00" },
  { id: "green", color: "#39ff14" },
  { id: "red",   color: "#ff4444" },
  { id: "cyan",  color: "#00e5ff" },
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

  return (
    <nav className="border-b border-[var(--term-dark)] px-4 py-2 flex items-center gap-4 sticky top-0 bg-[var(--term-panel)] backdrop-blur z-10">
      <span className="text-[var(--term-bright)] font-['VT323'] text-2xl tracking-widest mr-2">&gt;_ REELSCREAM</span>
      <div className="h-4 w-px bg-[var(--term-dark)]" />
      <NavLink to="/" className={({ isActive }) => isActive ? active : inactive} end>
        [DISCOVER]
      </NavLink>
      <NavLink to="/watchlists" className={({ isActive }) => isActive ? active : inactive}>
        [WATCHLISTS]
      </NavLink>
      <NavLink to="/about" className={({ isActive }) => isActive ? active : inactive}>
        [ABOUT]
      </NavLink>

      <div className="ml-auto flex items-center gap-2">
        <span className="text-[var(--term-dark)] text-xs hidden sm:block mr-1">COLOR:</span>
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            title={t.id.toUpperCase()}
            className="w-4 h-4 rounded-full border transition-all"
            style={{
              backgroundColor: t.color,
              borderColor: theme === t.id ? t.color : "transparent",
              boxShadow: theme === t.id ? `0 0 6px ${t.color}` : "none",
              opacity: theme === t.id ? 1 : 0.4,
            }}
          />
        ))}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div
        className="h-screen flex flex-col text-[var(--term-bright)] overflow-hidden"
        style={{
          backgroundImage: "url('/backrooms.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <Nav />
        <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/watchlists" element={<WatchlistsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
