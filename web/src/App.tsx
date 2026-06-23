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
  const { loggedIn, logout, user, setOpenAuthHandler } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  useEffect(() => { setOpenAuthHandler(() => setShowAuth(true)); }, []);

  const base = "text-sm transition-colors px-3 py-1 border";
  const active = `${base} border-[var(--term-bright)] text-[var(--term-bright)] bg-[var(--term-bright-5)]`;
  const inactive = `${base} border-transparent text-[var(--term-mid)] hover:text-[var(--term-bright)]`;

  return (
    <>
      <nav className="border-b border-[var(--term-dark)] px-4 py-2 flex items-center gap-2 sm:gap-4 sticky top-0 bg-[var(--term-panel)] backdrop-blur z-10">
        <span className="text-[var(--term-bright)] font-['VT323'] text-2xl tracking-widest mr-2">&gt;_ REELSCREAM</span>
        <div className="h-4 w-px bg-[var(--term-dark)] hidden sm:block" />
        <NavLink to="/" className={({ isActive }) => `hidden sm:block ${isActive ? active : inactive}`} end>
          [DISCOVER]
        </NavLink>
        <NavLink to="/watchlists" className={({ isActive }) => `hidden sm:block ${isActive ? active : inactive}`}>
          [WATCHLIST]
        </NavLink>
        {loggedIn && (
          <NavLink to="/profile" className={({ isActive }) => `hidden sm:block ${isActive ? active : inactive}`}>
            [PROFILE]
          </NavLink>
        )}
        <NavLink to="/about" className={({ isActive }) => `hidden sm:block ${isActive ? active : inactive}`}>
          [ABOUT]
        </NavLink>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {/* Auth */}
          {loggedIn ? (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[var(--term-dark)] text-[10px] truncate max-w-[120px]" title={user?.email}>
                {user?.email}
              </span>
              <button
                onClick={logout}
                className="text-xs border border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)] px-2 py-1 transition-colors"
              >
                [LOGOUT]
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="text-xs border border-[var(--term-bright)] text-[var(--term-bright)] hover:bg-[var(--term-bright-10)] px-2 py-1 transition-colors"
            >
              [LOGIN]
            </button>
          )}

          <div className="h-4 w-px bg-[var(--term-dark)] hidden sm:block" />

          {/* Color swatches */}
          <span className="text-[var(--term-dark)] text-xs hidden sm:block">COLOR:</span>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              title={t.id.toUpperCase()}
              className="hidden sm:block w-4 h-4 rounded-full border transition-all"
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

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}

function AppShell() {
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
        <div className="flex-1 overflow-hidden pb-12 sm:pb-0">
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/watchlists" element={<WatchlistsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/film/:id" element={<FilmPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>

        {/* Mobile bottom nav */}
        <nav className="sm:hidden fixed bottom-0 inset-x-0 border-t border-[var(--term-dark)] bg-[var(--term-panel)] flex z-10">
          {[
            { to: "/", label: "DISCOVER" },
            { to: "/watchlists", label: "WATCHLIST" },
            { to: "/profile", label: "PROFILE" },
          ].map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === "/"}
              className={({ isActive }) =>
                `flex-1 py-3 text-center text-[10px] font-mono transition-colors ${isActive ? "text-[var(--term-bright)]" : "text-[var(--term-dark)]"}`
              }>
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
