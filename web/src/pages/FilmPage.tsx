import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { FilmCard } from "../components/FilmCard";
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

export function FilmPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const film = (location.state as any)?.film;
  const { loggedIn, watchedIds, toggleWatched } = useAuth();

  const [similar, setSimilar] = useState<any[]>([]);
  const [similarPool, setSimilarPool] = useState<any[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
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
    fetchSimilar();
  }, [film?.id]);

  if (!film) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--term-mid)] font-mono text-sm">
        // film not found · <button onClick={() => navigate(-1)} className="underline ml-1">go back</button>
      </div>
    );
  }

  const tier = film.niche_score != null ? getNicheTier(film.niche_score) : null;
  const accentColor = tier?.color ?? "var(--term-bright)";
  const letterboxdUrl = `https://letterboxd.com/search/${encodeURIComponent(film.title)}/`;
  const imdbUrl = `https://www.imdb.com/find/?q=${encodeURIComponent(`${film.title} ${film.year ?? ""}`)}`;
  const rtUrl = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(film.title)}`;

  const shuffle = (arr: any[]) => [...arr].sort(() => Math.random() - 0.5);

  const fetchSimilar = async () => {
    if (loadingSimilar) return;
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
      onClick={() => navigate(-1)}
    >
      <div
        className="relative w-full max-w-5xl mx-auto px-4 py-6 my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* X button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-8 right-6 text-[var(--term-mid)] hover:text-[var(--term-bright)] text-xl leading-none z-10 transition-colors"
        >
          ✕
        </button>

        {/* Main card */}
        <div className="flex flex-col sm:flex-row gap-6 mb-8 border border-[var(--term-bright)] p-5 bg-[var(--term-panel)]"
          style={{ borderTopColor: accentColor, borderTopWidth: "3px" }}>

          {/* Poster */}
          <div className="sm:w-72 shrink-0">
            {film.poster_url ? (
              <img src={film.poster_url} alt={film.title}
                className="w-full object-cover border border-[var(--term-dark)]"
                style={{ maxHeight: "420px" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div className="w-full bg-black border border-[var(--term-dark)] flex items-center justify-center font-['VT323'] text-[var(--term-dark)] text-8xl"
                style={{ aspectRatio: "2/3" }}>?</div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-4">
            <div>
              <h1 className="text-[var(--term-bright)] font-['VT323'] text-5xl leading-tight tracking-wide mb-1">
                {film.title}
              </h1>
              <div className="flex items-center gap-3 flex-wrap text-sm font-mono text-[var(--term-mid)]">
                {film.year && <span>{film.year}</span>}
                {film.director && <span>{film.director}</span>}
                {tier && film.niche_score != null && (
                  <span className="text-[10px] px-1.5 py-px border" style={{ color: tier.color, borderColor: tier.color }}>
                    {tier.label} {film.niche_score}/10
                  </span>
                )}
              </div>
            </div>

            {/* Ratings */}
            {(film.imdb_rating != null || film.rt_score != null || film.lb_rating != null) && (
              <div className="flex gap-2 flex-wrap">
                {film.imdb_rating != null && (
                  <a href={imdbUrl} target="_blank" rel="noopener noreferrer"
                    className="flex flex-col items-center px-3 py-2 border border-[var(--term-dark)] hover:border-[var(--term-bright)] transition-colors min-w-[60px]">
                    <span className="text-[9px] font-mono text-[var(--term-dark)] uppercase">IMDb</span>
                    <span className="text-xl font-['VT323']" style={{ color: scoreColor(film.imdb_rating, 10) }}>{film.imdb_rating.toFixed(1)}</span>
                  </a>
                )}
                {film.rt_score != null && (
                  <a href={rtUrl} target="_blank" rel="noopener noreferrer"
                    className="flex flex-col items-center px-3 py-2 border border-[var(--term-dark)] hover:border-[var(--term-bright)] transition-colors min-w-[60px]">
                    <span className="text-[9px] font-mono text-[var(--term-dark)] uppercase">RT</span>
                    <span className="text-xl font-['VT323']" style={{ color: scoreColor(film.rt_score, 100) }}>{film.rt_score}%</span>
                  </a>
                )}
                {film.lb_rating != null && (
                  <a href={letterboxdUrl} target="_blank" rel="noopener noreferrer"
                    className="flex flex-col items-center px-3 py-2 border border-[var(--term-dark)] hover:border-[var(--term-bright)] transition-colors min-w-[60px]">
                    <span className="text-[9px] font-mono text-[var(--term-dark)] uppercase">Letterboxd</span>
                    <span className="text-xl font-['VT323']" style={{ color: scoreColor(film.lb_rating, 5) }}>{film.lb_rating.toFixed(1)}</span>
                  </a>
                )}
              </div>
            )}

            {/* AI reason */}
            {film.why_youll_like_it && (
              <p className="text-sm italic pl-3 border-l-2 leading-relaxed" style={{ color: accentColor, borderColor: accentColor }}>
                {film.why_youll_like_it}
              </p>
            )}

            {/* Synopsis */}
            {film.synopsis && (
              <div className="text-sm font-mono text-[var(--term-mid)] leading-relaxed">
                <span className="text-[var(--term-dark)]">SYNOPSIS  </span>{film.synopsis}
              </div>
            )}

            {/* Atmosphere */}
            {film.atmosphere && (
              <div className="text-sm font-mono text-[var(--term-mid)] leading-relaxed">
                <span className="text-[var(--term-dark)]">ATMOSPHERE  </span>{film.atmosphere}
              </div>
            )}

            {/* Genres */}
            {film.genres?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {film.genres.map((g: string) => (
                  <span key={g} className="text-[9px] font-mono px-1.5 py-px border border-[var(--term-dark)] text-[var(--term-dark)]">
                    {g.toLowerCase().replace(/ /g, "_")}
                  </span>
                ))}
              </div>
            )}

            {/* Streaming */}
            {film.streaming_platforms?.length > 0 && (
              <div className="text-xs font-mono">
                <span className="text-[var(--term-dark)]">STREAM  </span>
                <span className="text-[var(--term-bright)]">{film.streaming_platforms.join(" · ")}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 flex-wrap pt-1">
              <a href={letterboxdUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs font-mono px-2 py-1 border border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)] transition-colors">
                LETTERBOXD ↗
              </a>
              <a href={imdbUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs font-mono px-2 py-1 border border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)] transition-colors">
                IMDB ↗
              </a>
              {loggedIn && film && (
                <button
                  onClick={handleToggleWatched}
                  disabled={watchedPending}
                  title={watchedIds.has(film.id) ? "Remove from watch history" : "Mark as watched"}
                  className={`text-xs font-mono px-3 py-1 border transition-colors disabled:opacity-40 ${
                    watchedIds.has(film.id)
                      ? "border-[#4caf50] text-[#4caf50] hover:border-[#e53935] hover:text-[#e53935]"
                      : "border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)]"
                  }`}>
                  {watchedPending ? "…" : watchedIds.has(film.id) ? "WATCHED ✓" : "MARK WATCHED"}
                </button>
              )}
              <button
                onClick={added ? unsave : save}
                disabled={adding || removing}
                title={added ? "Click to remove from watchlist" : "Save to watchlist"}
                className={`text-xs font-mono px-3 py-1 border transition-colors disabled:opacity-40 ${
                  added
                    ? "border-[var(--term-mid)] text-[var(--term-mid)] hover:border-[#e53935] hover:text-[#e53935]"
                    : "border-[var(--term-bright)] text-[var(--term-bright)] hover:bg-[var(--term-bright-10)]"
                }`}>
                {removing ? "REMOVING…" : added ? "SAVED ✓" : adding ? "SAVING…" : "+ SAVE"}
              </button>
            </div>
          </div>
        </div>

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
