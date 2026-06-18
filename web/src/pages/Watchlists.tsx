import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { FilmCard } from "../components/FilmCard";
import { useAuth } from "../contexts/AuthContext";

function getNicheTier(score: number) {
  if (score >= 8) return { label: "DEEP CUT",  color: "#cc44ff" };
  if (score >= 6) return { label: "CULT PICK",  color: "#4488ff" };
  if (score >= 4) return { label: "HIDDEN GEM", color: "var(--term-bright)" };
  return null;
}

export function WatchlistsPage() {
  const { loggedIn } = useAuth();
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState<any | null>(null);
  const [randomFilm, setRandomFilm] = useState<any | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!loggedIn) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await api.watchlists.list();
      const lists = res.data;
      if (lists.length === 0) {
        setWatchlist(null);
      } else {
        const detail = await api.watchlists.get(lists[0].id);
        setWatchlist(detail.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [loggedIn]);

  const spinRandom = async () => {
    if (!watchlist) return;
    setSpinning(true);
    setRandomFilm(null);
    const res = await api.random.fromWatchlist(watchlist.id);
    const f = res.data.film;
    if (f) setRandomFilm({ id: f.film_id, ...f.film_metadata, title: f.film_title });
    setSpinning(false);

  };

  const removeItem = async (itemId: string) => {
    if (!watchlist) return;
    await api.watchlists.removeFilm(watchlist.id, itemId);
    load();
  };

  return (
    <div className="h-full overflow-y-auto">
    <div className="max-w-3xl mx-auto px-4 py-10">

      <div className="terminal-panel mb-8 border border-[var(--term-dark)] bg-[var(--term-panel)] p-5">
        <div className="text-[var(--term-bright)] font-['VT323'] text-5xl tracking-widest leading-none mb-1">
          WATCHLIST
        </div>
        <div className="text-[var(--term-mid)] text-xs">// your saved horror films</div>
      </div>

      {loading && (
        <div className="text-center text-[var(--term-mid)] py-10 text-sm">
          <span className="cursor">LOADING</span>
        </div>
      )}

      {!loading && !loggedIn && (
        <div className="text-center text-[var(--term-mid)] py-12 text-sm border border-[var(--term-dark)] bg-[var(--term-panel)] space-y-3">
          <div>// login to save films to your watchlist</div>
          <div className="text-[var(--term-dark)] text-xs">click [LOGIN] in the top-right to get started</div>
        </div>
      )}

      {!loading && loggedIn && !watchlist && (
        <div className="text-center text-[var(--term-mid)] py-10 text-sm border border-[var(--term-dark)] bg-[var(--term-panel)]">
          // nothing saved yet · open any film and hit + SAVE
        </div>
      )}

      {!loading && loggedIn && watchlist && (
        <>
          <div className="flex items-center justify-between mb-4 border-b border-[var(--term-dark)] pb-3">
            <span className="text-[var(--term-mid)] text-sm">
              // {watchlist.items?.length ?? 0} films saved
            </span>
            <button
              onClick={spinRandom}
              disabled={spinning || !watchlist.items?.length}
              className="px-4 py-2 border border-[var(--term-dark)] hover:border-[#cc2200] text-[var(--term-mid)] hover:text-[#cc2200] text-sm transition-colors disabled:opacity-30"
            >
              {spinning ? <span className="cursor">[RANDOMIZING]</span> : "[RANDOM PICK]"}
            </button>
          </div>

          {randomFilm && (() => {
            const tier = randomFilm.niche_score != null ? getNicheTier(randomFilm.niche_score) : null;
            return (
              <div className="mb-5 border border-[#cc2200] bg-[rgba(30,0,0,0.5)]">
                <div className="px-3 py-1 text-[9px] font-mono text-[#cc2200] border-b border-[#cc2200] tracking-[0.2em] uppercase">
                  // random pick
                </div>
                <div className="flex items-center gap-3 p-3">
                  {randomFilm.poster_url ? (
                    <img
                      src={randomFilm.poster_url}
                      alt={randomFilm.title}
                      className="w-12 object-cover border border-[#cc2200]/40 shrink-0"
                      style={{ aspectRatio: "2/3" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-12 shrink-0 bg-black/60 border border-[#cc2200]/40 flex items-center justify-center text-[#cc2200] font-['VT323'] text-2xl" style={{ aspectRatio: "2/3" }}>?</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[var(--term-bright)] font-['VT323'] text-2xl leading-tight truncate">
                      {randomFilm.title}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {randomFilm.year && <span className="text-[10px] font-mono text-[var(--term-mid)]">{randomFilm.year}</span>}
                      {tier && (
                        <span className="text-[8px] font-mono px-1 py-px border" style={{ color: tier.color, borderColor: tier.color }}>
                          {tier.label}
                        </span>
                      )}
                    </div>
                    {randomFilm.director && (
                      <div className="text-[9px] font-mono text-[var(--term-dark)] mt-0.5 truncate">{randomFilm.director}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => navigate(`/film/${randomFilm.id}`, { state: { film: randomFilm } })}
                      className="text-[10px] font-mono px-2 py-1 border border-[#cc2200] text-[#cc2200] hover:bg-[#cc2200] hover:text-black transition-colors"
                    >
                      VIEW →
                    </button>
                    <button
                      onClick={() => setRandomFilm(null)}
                      className="text-[10px] font-mono text-[var(--term-dark)] hover:text-[var(--term-bright)] transition-colors px-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {watchlist.items?.map((item: any, i: number) => (
              <div key={item.id} className="relative group">
                <FilmCard
                  film={{ id: item.film_id, ...item.film_metadata, title: item.film_title }}
                  index={i}
                />
                <button
                  onClick={() => removeItem(item.id)}
                  className="absolute top-1 left-1 bg-black/80 text-[#cc2200] text-[9px] font-mono px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                >
                  remove
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
    </div>
  );
}
