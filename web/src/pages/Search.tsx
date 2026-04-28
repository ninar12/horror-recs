import { useState, useRef } from "react";
import { api } from "../api";
import { FilmCard } from "../components/FilmCard";

const MOOD_PRESETS = [
  "genuinely terrifying, slow burn",
  "fun slasher night with friends",
  "psychological mindfuck",
  "supernatural atmospheric dread",
  "creature feature chaos",
  "80s nostalgia horror",
];

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"search" | "mood">("search");
  const [films, setFilms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [queryUsed, setQueryUsed] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const run = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setFilms([]);
    try {
      const res = mode === "search"
        ? await api.search.query(q)
        : await api.search.mood(q);
      setFilms(res.data.films || []);
      setQueryUsed(res.data.query_used || q);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run(query);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black text-white tracking-tight">REELSCREAM</h1>
        <p className="text-zinc-400 mt-2 text-sm">Find your next horror obsession</p>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("search")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "search" ? "bg-red-900 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          Search by type
        </button>
        <button
          onClick={() => setMode("mood")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "mood" ? "bg-red-900 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          I'm in the mood for...
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            mode === "search"
              ? 'e.g. "slow burn folk horror like Midsommar"'
              : 'e.g. "something that will genuinely disturb me"'
          }
          className="flex-1 bg-zinc-900 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-red-800"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-5 py-3 bg-red-900 hover:bg-red-800 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? "..." : "Find"}
        </button>
      </form>

      {mode === "mood" && (
        <div className="flex flex-wrap gap-2 mt-3">
          {MOOD_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => { setQuery(p); run(p); }}
              className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {queryUsed && mode === "mood" && (
        <p className="mt-4 text-xs text-zinc-500">
          Searching for: <span className="text-zinc-400 italic">{queryUsed}</span>
        </p>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {films.map((film) => (
          <FilmCard key={film.id} film={film} />
        ))}
        {!loading && films.length === 0 && query && (
          <p className="text-center text-zinc-600 py-10">No results. Try a different query.</p>
        )}
      </div>
    </div>
  );
}
