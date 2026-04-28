import { useState, useEffect } from "react";
import { api } from "../api";
import { FilmCard } from "../components/FilmCard";

export function WatchlistsPage() {
  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [newName, setNewName] = useState("");
  const [randomFilm, setRandomFilm] = useState<any | null>(null);
  const [spinning, setSpinning] = useState(false);

  const loadWatchlists = async () => {
    const res = await api.watchlists.list();
    setWatchlists(res.data);
  };

  const loadSelected = async (id: string) => {
    const res = await api.watchlists.get(id);
    setSelected(res.data);
  };

  useEffect(() => { loadWatchlists(); }, []);

  const createList = async () => {
    if (!newName.trim()) return;
    await api.watchlists.create(newName.trim());
    setNewName("");
    loadWatchlists();
  };

  const spinRandom = async () => {
    if (!selected) return;
    setSpinning(true);
    setRandomFilm(null);
    const res = await api.random.fromWatchlist(selected.id);
    setRandomFilm(res.data.film);
    setSpinning(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h2 className="text-2xl font-black text-white mb-6">My Watchlists</h2>

      <div className="flex gap-2 mb-6">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createList()}
          placeholder="New list name..."
          className="flex-1 bg-zinc-900 border border-zinc-700 text-white rounded-xl px-4 py-2.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-red-800"
        />
        <button
          onClick={createList}
          className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm"
        >
          Create
        </button>
      </div>

      <div className="flex flex-col gap-2 mb-8">
        {watchlists.map((wl) => (
          <button
            key={wl.id}
            onClick={() => loadSelected(wl.id)}
            className={`text-left px-4 py-3 rounded-xl border transition-colors ${
              selected?.id === wl.id
                ? "bg-red-950 border-red-900 text-white"
                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700"
            }`}
          >
            <span className="font-medium">{wl.name}</span>
            <span className="text-xs text-zinc-500 ml-2">{wl.item_count} films</span>
          </button>
        ))}
      </div>

      {selected && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">{selected.name}</h3>
            <button
              onClick={spinRandom}
              disabled={spinning || !selected.items?.length}
              className="px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {spinning ? "Picking..." : "🎲 Random pick"}
            </button>
          </div>

          {randomFilm && (
            <div className="mb-6 p-1 rounded-xl bg-gradient-to-r from-red-900 to-zinc-900">
              <FilmCard film={randomFilm} />
            </div>
          )}

          <div className="flex flex-col gap-3">
            {selected.items?.map((item: any) => (
              <FilmCard key={item.id} film={{ id: item.film_id, ...item.film_metadata, title: item.film_title }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
