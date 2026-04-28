import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { SearchPage } from "./pages/Search";
import { WatchlistsPage } from "./pages/Watchlists";

function Nav() {
  const base = "px-4 py-2 rounded-lg text-sm font-medium transition-colors";
  const active = `${base} bg-red-950 text-red-300`;
  const inactive = `${base} text-zinc-400 hover:text-white`;

  return (
    <nav className="border-b border-zinc-800 px-4 py-3 flex items-center gap-2 sticky top-0 bg-black/80 backdrop-blur z-10">
      <span className="text-white font-black mr-4 text-sm tracking-widest">REELSCREAM</span>
      <NavLink to="/" className={({ isActive }) => isActive ? active : inactive} end>
        Discover
      </NavLink>
      <NavLink to="/watchlists" className={({ isActive }) => isActive ? active : inactive}>
        Watchlists
      </NavLink>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-black text-white">
        <Nav />
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/watchlists" element={<WatchlistsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
