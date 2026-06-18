import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";

interface Film {
  id: string;
  title: string;
  year: number;
  director?: string;
  genres?: string[];
  synopsis?: string;
  atmosphere?: string;
  imdb_rating?: number;
  rt_score?: number;
  lb_rating?: number;
  consensus_score?: number;
  niche_score?: number;
  why_youll_like_it?: string;
  streaming_platforms?: string[];
  poster_url?: string;
}

interface Props {
  film: Film;
  watchlistId?: string;
  onAdded?: () => void;
  onFindSimilar?: (film: Film) => void;
  index?: number;
}

function getNicheTier(score: number) {
  if (score >= 8) return { label: "DEEP CUT",  color: "#cc44ff" };
  if (score >= 6) return { label: "CULT PICK",  color: "#4488ff" };
  if (score >= 4) return { label: "HIDDEN GEM", color: "var(--term-bright)" };
  return null;
}

function scoreColor(val: number, max: number) {
  const pct = val / max;
  if (pct >= 0.70) return "#4caf50";
  if (pct >= 0.50) return "#f9a825";
  return "#e53935";
}

interface RatingBadgeProps {
  label: string;
  value: string;
  color: string;
  href: string;
}
function RatingBadge({ label, value, color, href }: RatingBadgeProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-0.5 px-3 py-2 border border-[var(--term-dark)] hover:border-[var(--term-bright)] transition-colors min-w-[60px]"
    >
      <span className="text-[9px] font-mono text-[var(--term-dark)] uppercase tracking-widest leading-none">
        {label}
      </span>
      <span className="text-xl font-['VT323'] leading-none" style={{ color }}>
        {value}
      </span>
    </a>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function FilmModal({
  film,
  watchlistId,
  onAdded,
  onFindSimilar,
  onClose,
}: {
  film: Film;
  watchlistId?: string;
  onAdded?: () => void;
  onFindSimilar?: (film: Film) => void;
  onClose: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded]   = useState(false);
  const [removing, setRemoving] = useState(false);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  const [savedWatchlistId, setSavedWatchlistId] = useState<string | null>(null);
  const [similarFilms, setSimilarFilms] = useState<Film[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  const tier        = film.niche_score != null ? getNicheTier(film.niche_score) : null;
  const accentColor = tier?.color ?? "var(--term-bright)";

  const fetchSimilar = async () => {
    if (loadingSimilar || similarFilms.length > 0) return;
    setLoadingSimilar(true);
    try {
      const res = await api.search.similar({
        film_id: film.id, title: film.title,
        synopsis: film.synopsis, genres: film.genres,
        atmosphere: film.atmosphere,
      });
      setSimilarFilms(res.data.films || []);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const letterboxdUrl = `https://letterboxd.com/search/${encodeURIComponent(film.title)}/`;
  const imdbUrl       = `https://www.imdb.com/find/?q=${encodeURIComponent(`${film.title} ${film.year ?? ""}`)}`;
  const rtUrl         = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(film.title)}`;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Check if film is already saved
  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    (async () => {
      try {
        const res = await api.watchlists.list();
        const lists = res.data;
        if (!lists.length) return;
        const detail = await api.watchlists.get(lists[0].id);
        const items: any[] = detail.data.items || [];
        const found = items.find((item) => item.film_id === film.id);
        if (found) {
          setAdded(true);
          setSavedItemId(found.id);
          setSavedWatchlistId(lists[0].id);
        }
      } catch {}
    })();
  }, [film.id]);

  const handleRemove = async () => {
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

  const handleAdd = async (targetId?: string) => {
    const id = targetId ?? watchlistId;
    if (!id) return;
    setAdding(true);
    const res = await api.watchlists.addFilm(id, {
      film_id: film.id,
      film_title: film.title,
      film_metadata: film,
    });
    setAdded(true);
    setAdding(false);
    setSavedWatchlistId(id);
    if (res.data?.id) setSavedItemId(res.data.id);
    onAdded?.();
  };

  const openWatchlistPicker = async () => {
    if (!localStorage.getItem("token")) return;
    if (watchlistId) { handleAdd(); return; }
    setAdding(true);
    try {
      const res = await api.watchlists.list();
      let lists = res.data;
      let id: string;
      if (lists.length > 0) {
        id = lists[0].id;
      } else {
        const created = await api.watchlists.create("Watchlist");
        id = created.data.id;
      }
      await handleAdd(id);
    } finally {
      setAdding(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-6xl max-h-[95vh] overflow-y-auto bg-[var(--term-panel)] border border-[var(--term-bright)] flex flex-col sm:flex-row"
        style={{ borderTopColor: accentColor, borderTopWidth: "3px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poster column */}
        <div className="sm:w-80 shrink-0 bg-black">
          {film.poster_url ? (
            <img
              src={film.poster_url}
              alt={film.title}
              className="w-full h-full object-cover"
              style={{ maxHeight: "480px" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-full h-48 flex items-center justify-center text-[var(--term-dark)] font-['VT323'] text-6xl">
              ?
            </div>
          )}
        </div>

        {/* Details column */}
        <div className="flex-1 p-5 space-y-4 min-w-0">

          {/* Header */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[var(--term-bright)] font-['VT323'] text-4xl leading-tight tracking-wide">
                {film.title}
              </h2>
              <button
                onClick={onClose}
                className="text-[var(--term-dark)] hover:text-[var(--term-bright)] text-xl leading-none shrink-0 mt-1"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {film.year && (
                <span className="text-sm font-mono text-[var(--term-mid)]">{film.year}</span>
              )}
              {film.director && (
                <span className="text-sm font-mono text-[var(--term-mid)]">{film.director}</span>
              )}
              {tier && film.niche_score != null && (
                <span
                  className="text-[10px] font-mono px-1.5 py-px border"
                  style={{ color: tier.color, borderColor: tier.color }}
                >
                  {tier.label} {film.niche_score}/10
                </span>
              )}
            </div>
          </div>

          {/* Ratings */}
          {(film.imdb_rating != null || film.rt_score != null || film.lb_rating != null) && (
            <div className="flex gap-2 flex-wrap">
              {film.imdb_rating != null && (
                <RatingBadge
                  label="IMDb"
                  value={film.imdb_rating.toFixed(1)}
                  color={scoreColor(film.imdb_rating, 10)}
                  href={imdbUrl}
                />
              )}
              {film.rt_score != null && (
                <RatingBadge
                  label="RT"
                  value={`${film.rt_score}%`}
                  color={scoreColor(film.rt_score, 100)}
                  href={rtUrl}
                />
              )}
              {film.lb_rating != null && (
                <RatingBadge
                  label="Letterboxd"
                  value={film.lb_rating.toFixed(1)}
                  color={scoreColor(film.lb_rating, 5)}
                  href={letterboxdUrl}
                />
              )}
              {film.consensus_score != null && (
                <div className="flex flex-col items-center gap-0.5 px-3 py-2 border border-[var(--term-bright)] min-w-[60px]">
                  <span className="text-[9px] font-mono text-[var(--term-dark)] uppercase tracking-widest leading-none">
                    consensus
                  </span>
                  <span
                    className="text-xl font-['VT323'] leading-none"
                    style={{ color: scoreColor(film.consensus_score, 10) }}
                  >
                    {film.consensus_score.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* AI reason */}
          {film.why_youll_like_it && (
            <p
              className="text-sm leading-relaxed pl-3 border-l-2 italic"
              style={{ color: accentColor, borderColor: accentColor }}
            >
              {film.why_youll_like_it}
            </p>
          )}

          {/* Synopsis */}
          {film.synopsis && (
            <div className="text-xs font-mono text-[var(--term-mid)] leading-relaxed">
              <span className="text-[var(--term-dark)]">SYNOPSIS  </span>
              {film.synopsis}
            </div>
          )}

          {/* Atmosphere */}
          {film.atmosphere && (
            <div className="text-xs font-mono text-[var(--term-mid)] leading-relaxed">
              <span className="text-[var(--term-dark)]">ATMOSPHERE  </span>
              {film.atmosphere}
            </div>
          )}

          {/* Genres */}
          {film.genres?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {film.genres.map((g) => (
                <span key={g} className="text-[9px] font-mono px-1.5 py-px border border-[var(--term-dark)] text-[var(--term-dark)]">
                  {g.toLowerCase().replace(/ /g, "_")}
                </span>
              ))}
            </div>
          ) : null}

          {/* Streaming */}
          {film.streaming_platforms?.length ? (
            <div className="text-xs font-mono">
              <span className="text-[var(--term-dark)]">STREAM  </span>
              <span className="text-[var(--term-bright)]">
                {film.streaming_platforms.join(" · ")}
              </span>
            </div>
          ) : null}

          {/* Footer: links + save */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <a href={letterboxdUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs font-mono px-2 py-1 border border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)] transition-colors">
              LETTERBOXD ↗
            </a>
            <a href={imdbUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs font-mono px-2 py-1 border border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)] transition-colors">
              IMDB ↗
            </a>
            <button
              onClick={fetchSimilar}
              disabled={loadingSimilar || similarFilms.length > 0}
              className="text-xs font-mono px-2 py-1 border border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)] disabled:opacity-40 transition-colors"
            >
              {loadingSimilar ? "SCANNING…" : similarFilms.length > 0 ? "SIMILAR ✓" : "∿ FIND SIMILAR"}
            </button>
            <button
              onClick={added ? handleRemove : openWatchlistPicker}
              disabled={adding || removing}
              title={added ? "Click to remove from watchlist" : "Save to watchlist"}
              className={`ml-auto text-xs font-mono px-3 py-1 border transition-colors disabled:opacity-40 ${
                added
                  ? "border-[var(--term-mid)] text-[var(--term-mid)] hover:border-[#e53935] hover:text-[#e53935]"
                  : "border-[var(--term-bright)] text-[var(--term-bright)] hover:bg-[var(--term-bright-10)]"
              }`}
            >
              {removing ? "REMOVING…" : added ? "SAVED ✓" : adding ? "SAVING…" : "+ SAVE"}
            </button>
          </div>

          {/* Similar films strip */}
          {(loadingSimilar || similarFilms.length > 0) && (
            <div className="border-t border-[var(--term-dark)] pt-3 mt-2">
              <div className="text-[9px] font-mono text-[var(--term-dark)] mb-2 uppercase tracking-widest">∿ similar films</div>
              {loadingSimilar ? (
                <div className="text-[var(--term-mid)] text-xs font-mono"><span className="cursor">SCANNING</span></div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {similarFilms.map((f) => (
                    <div key={f.id} className="shrink-0 w-40 cursor-pointer" onClick={() => { onFindSimilar?.(f); }}>
                      {f.poster_url ? (
                        <img src={f.poster_url} alt={f.title}
                          className="w-full object-cover border border-[var(--term-dark)] hover:border-[var(--term-bright)] transition-colors"
                          style={{ aspectRatio: "2/3" }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-full bg-black border border-[var(--term-dark)] flex items-center justify-center text-[var(--term-dark)] text-2xl font-['VT323']" style={{ aspectRatio: "2/3" }}>?</div>
                      )}
                      <div className="text-[9px] font-['VT323'] text-[var(--term-bright)] mt-1 leading-tight line-clamp-2">{f.title}</div>
                      <div className="text-[8px] font-mono text-[var(--term-dark)]">{f.year}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Card (grid tile) ──────────────────────────────────────────────────────────

export function FilmCard({ film, watchlistId, onAdded, onFindSimilar, index }: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { watchedIds } = useAuth();
  const isWatched = watchedIds.has(film.id);

  const idx         = index !== undefined ? String(index + 1).padStart(2, "0") : "--";
  const tier        = film.niche_score != null ? getNicheTier(film.niche_score) : null;
  const accentColor = tier?.color ?? "var(--term-dark)";
  const imdbUrl     = `https://www.imdb.com/find/?q=${encodeURIComponent(`${film.title} ${film.year ?? ""}`)}`;

  const consensusVal   = film.consensus_score ?? film.imdb_rating ?? null;
  const consensusStr   = consensusVal != null ? consensusVal.toFixed(1) : null;
  const consensusColor = consensusVal != null ? scoreColor(consensusVal, 10) : "var(--term-mid)";

  return (
    <>
      <div
        className="group relative flex flex-col bg-[var(--term-panel)] border border-[var(--term-dark)] hover:border-[var(--term-bright)] transition-colors cursor-pointer"
        style={{ borderTopColor: accentColor, borderTopWidth: "2px" }}
        onClick={() => navigate(`/film/${film.id}`, { state: { film } })}
      >
        {/* Poster */}
        <div className="relative w-full bg-black overflow-hidden" style={{ aspectRatio: "2/3" }}>
          {film.poster_url ? (
            <img
              src={film.poster_url}
              alt={film.title}
              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--term-dark)] font-['VT323'] text-5xl">?</div>
          )}

          {/* Index */}
          <span className="absolute top-2 left-2 text-[11px] font-mono bg-black/70 text-[var(--term-mid)] px-1.5 py-px leading-none">
            {idx}
          </span>

          {/* Niche badge */}
          {tier && film.niche_score != null && (
            <span
              className="absolute top-2 right-2 text-[10px] font-mono px-1.5 py-px leading-none"
              style={{ color: tier.color, backgroundColor: "rgba(0,0,0,0.80)", border: `1px solid ${tier.color}` }}
            >
              {tier.label} {film.niche_score}/10
            </span>
          )}

          {/* Watched indicator */}
          {isWatched && (
            <span className="absolute bottom-2 left-2 text-[10px] font-mono px-1.5 py-px bg-black/80 border border-[#4caf50] text-[#4caf50] leading-none">
              WATCHED ✓
            </span>
          )}

          {/* Find Similar — always visible at bottom of poster */}
          {onFindSimilar && (
            <button
              onClick={(e) => { e.stopPropagation(); onFindSimilar(film); }}
              className="absolute bottom-0 inset-x-0 py-1.5 text-[10px] font-mono tracking-widest bg-black/70 text-[var(--term-bright)] hover:bg-black transition-colors"
            >
              ∿ FIND SIMILAR
            </button>
          )}
        </div>

        {/* Info strip */}
        <div className="px-3 pt-2.5 pb-3 flex-1 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[var(--term-bright)] font-['VT323'] text-3xl leading-tight tracking-wide line-clamp-2 flex-1 min-w-0">
              {film.title}
            </p>
            {consensusStr && (
              <span className="font-['VT323'] text-2xl leading-tight shrink-0 mt-0.5" style={{ color: consensusColor }}>
                {consensusStr}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {film.year && <span className="text-[var(--term-mid)]">{film.year}</span>}
            {film.year && film.director && <span className="text-[var(--term-dark)]">·</span>}
            {film.director && (
              <span className="text-[var(--term-dark)] truncate">{film.director}</span>
            )}
          </div>
          {tier && film.niche_score != null && (
            <span className="text-[10px] font-mono w-fit px-1.5 py-px border leading-none"
                  style={{ color: tier.color, borderColor: tier.color }}>
              {tier.label}
            </span>
          )}
          <div className="mt-auto pt-2">
            <a
              href={imdbUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] font-mono text-[var(--term-dark)] hover:text-[var(--term-bright)] transition-colors px-1.5 py-px border border-[var(--term-dark)] hover:border-[var(--term-bright)]"
            >
              IMDb ↗
            </a>
          </div>
        </div>
      </div>

      {open && (
        <FilmModal
          film={film}
          watchlistId={watchlistId}
          onAdded={onAdded}
          onFindSimilar={onFindSimilar}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
