import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";

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

  const [similar, setSimilar] = useState<any[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

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

  const fetchSimilar = async () => {
    setLoadingSimilar(true);
    try {
      const res = await api.search.similar({
        film_id: film.id, title: film.title,
        synopsis: film.synopsis, genres: film.genres,
        atmosphere: film.atmosphere,
      });
      setSimilar(res.data.films || []);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const save = async () => {
    if (!localStorage.getItem("token")) return;
    setAdding(true);
    try {
      const res = await api.watchlists.list();
      let id_: string;
      if (res.data.length > 0) {
        id_ = res.data[0].id;
      } else {
        const created = await api.watchlists.create("Watchlist");
        id_ = created.data.id;
      }
      await api.watchlists.addFilm(id_, {
        film_id: film.id,
        film_title: film.title,
        film_metadata: film,
      });
      setAdded(true);
    } finally {
      setAdding(false);
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
              {!loadingSimilar && similar.length === 0 && (
                <button onClick={fetchSimilar}
                  className="text-xs font-mono px-2 py-1 border border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)] transition-colors">
                  ∿ FIND SIMILAR
                </button>
              )}
              <button onClick={save} disabled={adding || added}
                className="text-xs font-mono px-3 py-1 border border-[var(--term-bright)] text-[var(--term-bright)] hover:bg-[var(--term-bright-10)] disabled:opacity-40 transition-colors">
                {added ? "SAVED ✓" : adding ? "SAVING…" : "+ SAVE"}
              </button>
            </div>
          </div>
        </div>

        {/* Similar films */}
        {(loadingSimilar || similar.length > 0) && (
          <div>
            <div className="text-[var(--term-dark)] text-[10px] font-mono uppercase tracking-widest mb-3">∿ similar films</div>
            {loadingSimilar ? (
              <div className="text-[var(--term-mid)] text-sm font-mono"><span className="cursor">SCANNING</span></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {similar.map((f) => (
                  <div key={f.id} className="cursor-pointer group"
                    onClick={() => navigate(`/film/${f.id}`, { state: { film: f } })}>
                    {f.poster_url ? (
                      <img src={f.poster_url} alt={f.title}
                        className="w-full object-cover border border-[var(--term-dark)] group-hover:border-[var(--term-bright)] transition-colors"
                        style={{ aspectRatio: "2/3" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="w-full bg-black border border-[var(--term-dark)] group-hover:border-[var(--term-bright)] flex items-center justify-center font-['VT323'] text-[var(--term-dark)] text-4xl transition-colors"
                        style={{ aspectRatio: "2/3" }}>?</div>
                    )}
                    <div className="text-[var(--term-bright)] font-['VT323'] text-lg mt-1 leading-tight line-clamp-2">{f.title}</div>
                    <div className="text-[var(--term-dark)] text-[9px] font-mono">{f.year}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
