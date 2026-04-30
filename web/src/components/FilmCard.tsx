import { useState } from "react";
import { api } from "../api";

interface Film {
  id: string;
  title: string;
  year: number;
  director?: string;
  genres?: string[];
  synopsis?: string;
  atmosphere?: string;
  imdb_rating?: number;
  niche_score?: number;
  why_youll_like_it?: string;
  streaming_platforms?: string[];
}

interface Props {
  film: Film;
  watchlistId?: string;
  onAdded?: () => void;
}

function NicheBadge({ score }: { score: number }) {
  if (score <= 3) return null;
  const label = score >= 8 ? "Deep cut" : score >= 6 ? "Cult pick" : "Hidden gem";
  const color =
    score >= 8
      ? "bg-purple-950 text-purple-300 border-purple-800"
      : score >= 6
      ? "bg-indigo-950 text-indigo-300 border-indigo-800"
      : "bg-zinc-800 text-zinc-400 border-zinc-700";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${color}`}>
      {label} · {score}/10
    </span>
  );
}

export function FilmCard({ film, watchlistId, onAdded }: Props) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAdd = async () => {
    if (!watchlistId) return;
    setAdding(true);
    await api.watchlists.addFilm(watchlistId, {
      film_id: film.id,
      film_title: film.title,
      film_metadata: film,
    });
    setAdded(true);
    setAdding(false);
    onAdded?.();
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-red-900 transition-colors">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-bold text-lg leading-tight">{film.title}</h3>
            {film.niche_score != null && <NicheBadge score={film.niche_score} />}
          </div>
          <p className="text-zinc-400 text-sm mt-0.5">
            {film.year}{film.director ? ` · ${film.director}` : ""}
            {film.imdb_rating ? ` · ★ ${film.imdb_rating}` : ""}
          </p>
        </div>
        {watchlistId && (
          <button
            onClick={handleAdd}
            disabled={adding || added}
            className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-red-900 hover:bg-red-800 text-white disabled:opacity-50 transition-colors"
          >
            {added ? "Added" : adding ? "..." : "+ Watchlist"}
          </button>
        )}
      </div>

      {film.genres?.length ? (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {film.genres.map((g) => (
            <span key={g} className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded-full">
              {g}
            </span>
          ))}
        </div>
      ) : null}

      {film.why_youll_like_it && (
        <p className="mt-3 text-sm text-red-300 italic">"{film.why_youll_like_it}"</p>
      )}

      {film.synopsis && (
        <p className="mt-2 text-sm text-zinc-400 line-clamp-3">{film.synopsis}</p>
      )}

      {film.streaming_platforms?.length ? (
        <p className="mt-3 text-xs text-zinc-500">
          Watch on: {film.streaming_platforms.join(", ")}
        </p>
      ) : null}
    </div>
  );
}
