import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { FilmCard, ExpandableText } from "../components/FilmCard";
import { useAuth } from "../contexts/AuthContext";

function scoreColor(val: number, max: number) {
  const pct = val / max;
  if (pct >= 0.70) return "#4caf50";
  if (pct >= 0.50) return "#f9a825";
  return "#e53935";
}

function getNicheTier(score: number) {
  if (score >= 8) return { label: "DEEP CUT", color: "#cc44ff" };
  if (score >= 6) return { label: "CULT PICK", color: "#4488ff" };
  if (score >= 4) return { label: "HIDDEN GEM", color: "var(--term-bright)" };
  return null;
}

const PLATFORMS_KEY = "reelscream_preferred_platforms";

export function FilmPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const film = (location.state as any)?.film;
  const { loggedIn, watchedIds, toggleWatched, openAuth } = useAuth();

  const preferredPlatforms: Set<string> = (() => {
    try {
      const s = localStorage.getItem(PLATFORMS_KEY);
      return s ? new Set(JSON.parse(s)) : new Set();
    } catch { return new Set(); }
  })();

  const shuffle = (arr: any[]) => [...arr].sort(() => Math.random() - 0.5);

  const [similar, setSimilar] = useState<any[]>([]);
  const [similarPool, setSimilarPool] = useState<any[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(true);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  const [savedWatchlistId, setSavedWatchlistId] = useState<string | null>(null);
  const [watchedPending, setWatchedPending] = useState(false);

  useEffect(() => {
    if (!film || !localStorage.getItem("token")) return;
    (async () => {
      try {
        const res = await api.watchlists.list();
        if (!res.data.length) return;
        const detail = await api.watchlists.get(res.data[0].id);
        const found = (detail.data.items || []).find((item: any) => item.film_id === film.id);
        if (found) {
          setAdded(true);
          setSavedItemId(found.id);
          setSavedWatchlistId(res.data[0].id);
        }
      } catch {}
    })();
  }, [film?.id]);

  // Auto-fetch similar on load
  useEffect(() => {
    if (!film) return;
    let cancelled = false;
    setLoadingSimilar(true);
    api.search.similar({
      film_id: film.id, title: film.title,
      synopsis: film.synopsis, genres: film.genres,
      atmosphere: film.atmosphere,
    }).then((res) => {
      if (cancelled) return;
      const pool = res.data.films || [];
      setSimilarPool(pool);
      setSimilar(shuffle(pool).slice(0, 8));
    }).finally(() => {
      if (!cancelled) setLoadingSimilar(false);
    });
    return () => { cancelled = true; };
  }, [film?.id]);

  if (!film) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--term-mid)] font-mono text-sm">
        // film not found · <button onClick={() => navigate("/")} className="underline ml-1">go back</button>
      </div>
    );
  }

  const tier = film.niche_score != null ? getNicheTier(film.niche_score) : null;
  const accentColor = tier?.color ?? "var(--term-bright)";
  const letterboxdUrl = `https://letterboxd.com/search/${encodeURIComponent(film.title)}/`;
  const imdbUrl = `https://www.imdb.com/find/?q=${encodeURIComponent(`${film.title} ${film.year ?? ""}`)}`;
  const rtUrl = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(film.title)}`;

  const fetchSimilar = async () => {
    setLoadingSimilar(true);
    try {
      const res = await api.search.similar({
        film_id: film.id, title: film.title,
        synopsis: film.synopsis, genres: film.genres,
        atmosphere: film.atmosphere,
      });
      const pool = res.data.films || [];
      setSimilarPool(pool);
      setSimilar(shuffle(pool).slice(0, 8));
    } finally {
      setLoadingSimilar(false);
    }
  };

  const reshuffleSimilar = () => {
    if (similarPool.length === 0) return;
    setSimilar(shuffle(similarPool).slice(0, 8));
  };

  const save = async () => {
    if (!localStorage.getItem("token")) return;
    setAdding(true);
    try {
      const res = await api.watchlists.list();
      const wlId = res.data.length > 0 ? res.data[0].id : (await api.watchlists.create("Watchlist")).data.id;
      const added_ = await api.watchlists.addFilm(wlId, {
        film_id: film.id, film_title: film.title, film_metadata: film,
      });
      setAdded(true);
      setSavedWatchlistId(wlId);
      if (added_.data?.id) setSavedItemId(added_.data.id);
    } finally {
      setAdding(false);
    }
  };

  const unsave = async () => {
    if (!savedWatchlistId || !savedItemId) return;
    setRemoving(true);
    try {
      await api.watchlists.removeFilm(savedWatchlistId, savedItemId);
      setAdded(false);
      setSavedItemId(null);
      setSavedWatchlistId(null);
    } finally {
      setRemoving(false);
    }
  };

  const handleToggleWatched = async () => {
    if (!loggedIn || !film) return;
    setWatchedPending(true);
    try {
      await toggleWatched({ id: film.id, title: film.title });
    } finally {
      setWatchedPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={() => navigate("/")}
    >
      <div
        className="relative w-full max-w-5xl mx-auto px-4 py-6 my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main card */}
        <div className="mb-8 bg-[var(--term-panel)] border border-[var(--term-dark)] flex flex-col sm:flex-row"
          style={{ borderTopColor: accentColor, borderTopWidth: "2px" }}>

          {/* Poster */}
          <div className="sm:w-64 shrink-0 bg-black overflow-hidden self-start">
            {film.poster_url ? (
              <img src={film.poster_url} alt={film.title}
                className="w-full h-full object-cover object-top"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div className="w-full h-full min-h-48 flex items-center justify-center font-['VT323'] text-[var(--term-dark)] text-8xl">?</div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 px-8 py-7 relative">

          {/* Close */}
          <button
            onClick={() => navigate("/")}
            className="absolute top-4 right-4 text-[var(--term-mid)] hover:text-[var(--term-bright)] border border-[var(--term-dark)] hover:border-[var(--term-bright)] w-7 h-7 flex items-center justify-center transition-colors text-sm leading-none"
          >
            ✕
          </button>

          {/* Title */}
          <h1 className="font-['VT323'] text-6xl leading-none tracking-wide pr-10" style={{ color: accentColor }}>
            {film.title}
          </h1>

          {/* Meta row: year / director / niche ············· IMDb X.X  LB X.X */}
          <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
            <div className="flex items-center gap-2 font-mono text-sm text-[var(--term-mid)] flex-wrap">
              {film.year && <span>{film.year}</span>}
              {film.director && <><span className="text-[var(--term-dark)]">/</span><span>{film.director}</span></>}
              {tier && film.niche_score != null && (
                <><span className="text-[var(--term-dark)]">/</span>
                <span style={{ color: tier.color }}>{tier.label} · {film.niche_score}/10</span></>
              )}
            </div>
            <div className="flex items-baseline gap-4 font-mono text-sm">
              {film.imdb_rating != null && (
                <a href={imdbUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">
                  <span className="text-[var(--term-dark)] text-xs mr-1">IMDb</span>
                  <span style={{ color: scoreColor(film.imdb_rating, 10) }}>{film.imdb_rating.toFixed(1)}</span>
                </a>
              )}
              {film.rt_score != null && (
                <a href={rtUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">
                  <span className="text-[var(--term-dark)] text-xs mr-1">RT</span>
                  <span style={{ color: scoreColor(film.rt_score, 100) }}>{film.rt_score}%</span>
                </a>
              )}
              {film.lb_rating != null && (
                <a href={letterboxdUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">
                  <span className="text-[var(--term-dark)] text-xs mr-1">LB</span>
                  <span style={{ color: scoreColor(film.lb_rating, 5) }}>{film.lb_rating.toFixed(1)}</span>
                </a>
              )}
            </div>
          </div>

          {/* Why it matches — hero text */}
          {film.why_youll_like_it && (
            <p className="mt-5 text-lg italic leading-relaxed font-mono" style={{ color: accentColor }}>
              {film.why_youll_like_it}
            </p>
          )}

          {/* Divider */}
          <div className="border-t border-[var(--term-dark)] my-5" />

          {/* Watch */}
          {film.streaming_platforms?.length > 0 && (
            <div className="flex items-baseline gap-3 font-mono text-sm mb-3 flex-wrap">
              <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--term-dark)] shrink-0">WATCH</span>
              <span className="text-[var(--term-mid)]">
                {film.streaming_platforms.map((p: string, i: number) => {
                  const hasPlatform = preferredPlatforms.size > 0 && preferredPlatforms.has(p);
                  const notOwned = preferredPlatforms.size > 0 && !preferredPlatforms.has(p);
                  return (
                    <span key={p}>
                      {i > 0 && <span className="text-[var(--term-dark)] mx-1.5">·</span>}
                      <span className={hasPlatform ? "font-bold" : notOwned ? "opacity-30" : ""} style={hasPlatform ? { color: accentColor } : {}}>
                        {p}
                      </span>
                    </span>
                  );
                })}
              </span>
              {preferredPlatforms.size > 0 && !film.streaming_platforms.some((p: string) => preferredPlatforms.has(p)) && (
                <Link to="/profile" className="text-[9px] text-[var(--term-dark)] underline hover:text-[var(--term-mid)] transition-colors">manage platforms</Link>
              )}
            </div>
          )}

          {/* Tags */}
          {film.keywords?.length > 0 && (
            <div className="flex items-baseline gap-3 font-mono text-sm mb-5 flex-wrap">
              <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--term-dark)] shrink-0">TAGS</span>
              <span className="text-[var(--term-mid)]">
                {film.keywords.slice(0, 5).map((k: string, i: number) => (
                  <span key={k}>{i > 0 && <span className="text-[var(--term-dark)]">, </span>}{k.toLowerCase()}</span>
                ))}
              </span>
            </div>
          )}

          {/* Actions row */}
          <div className="flex items-center gap-4 flex-wrap">
            {!loggedIn ? (
              <button onClick={openAuth}
                className="text-sm font-mono px-4 py-2 border border-[var(--term-dark)] text-[var(--term-mid)] hover:border-[var(--term-bright)] hover:text-[var(--term-bright)] transition-colors">
                LOGIN TO SAVE
              </button>
            ) : (
              <button onClick={added ? unsave : save} disabled={adding || removing}
                className={`text-sm font-mono px-4 py-2 border transition-colors disabled:opacity-40 font-bold ${
                  added
                    ? "border-[var(--term-mid)] text-[var(--term-mid)] hover:border-[#e53935] hover:text-[#e53935]"
                    : "bg-[var(--term-bright)] border-[var(--term-bright)] text-black hover:opacity-90"
                }`}>
                {removing ? "REMOVING…" : added ? "SAVED ✓" : adding ? "SAVING…" : "+ SAVE"}
              </button>
            )}
            {loggedIn && film && (
              <button onClick={handleToggleWatched} disabled={watchedPending}
                className={`text-sm font-mono transition-colors disabled:opacity-40 underline underline-offset-2 ${
                  watchedIds.has(film.id)
                    ? "text-[#4caf50] hover:text-[#e53935]"
                    : "text-[var(--term-mid)] hover:text-[var(--term-bright)]"
                }`}>
                {watchedPending ? "…" : watchedIds.has(film.id) ? "Watched ✓" : "Mark watched"}
              </button>
            )}
            <div className="ml-auto flex items-center gap-4">
              <a href={letterboxdUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm font-mono text-[var(--term-mid)] hover:text-[var(--term-bright)] transition-colors">
                Letterboxd ↗
              </a>
              <a href={imdbUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm font-mono text-[var(--term-mid)] hover:text-[var(--term-bright)] transition-colors">
                IMDb ↗
              </a>
            </div>
          </div>

          {/* ▼ Summary */}
          {(film.synopsis || film.atmosphere) && (
            <div className="mt-5">
              <SummarySection synopsis={film.synopsis} atmosphere={film.atmosphere} />
            </div>
          )}

          </div>{/* end content */}
        </div>{/* end main card */}

        {/* Similar films — always shown, auto-loaded */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[var(--term-dark)] text-[10px] font-mono uppercase tracking-widest">
              ∿ similar films
            </div>
            {similar.length > 0 && (
              <button
                onClick={reshuffleSimilar}
                className="text-[9px] font-mono text-[var(--term-dark)] hover:text-[var(--term-bright)] transition-colors px-2 py-1 border border-[var(--term-dark)] hover:border-[var(--term-bright)]"
              >
                ↺ shuffle
              </button>
            )}
          </div>
          {loadingSimilar ? (
            <div className="text-[var(--term-mid)] text-sm font-mono"><span className="cursor">SCANNING</span></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
              {similar.map((f, i) => (
                <FilmCard key={f.id} film={f} index={i} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function SummarySection({ synopsis, atmosphere }: { synopsis?: string; atmosphere?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-[var(--term-dark)] pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-[10px] font-mono text-[var(--term-dark)] uppercase tracking-widest hover:text-[var(--term-mid)] transition-colors w-full text-left"
      >
        <span>{open ? "▲" : "▼"} SUMMARY</span>
      </button>
      {open && (
        <div className="mt-2 space-y-3">
          {synopsis && (
            <p className="text-sm font-mono text-[var(--term-mid)] leading-relaxed">{synopsis}</p>
          )}
          {atmosphere && (
            <div className="border-t border-[var(--term-dark)] pt-2">
              <div className="text-[9px] font-mono text-[var(--term-dark)] uppercase tracking-widest mb-1">MOOD / VIBES</div>
              <p className="text-xs font-mono text-[var(--term-mid)] leading-relaxed">{atmosphere}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
