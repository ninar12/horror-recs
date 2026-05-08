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
    <div className="max-w-3xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="terminal-panel mb-8 border border-[var(--term-dark)] bg-[var(--term-panel)] p-5">
        <div className="text-[var(--term-bright)] font-['VT323'] text-5xl tracking-widest leading-none mb-1">
          WATCHLISTS
        </div>
        <div className="text-[var(--term-mid)] text-xs">// your personal horror archives</div>
      </div>

      {/* Create new */}
      <div className="flex border border-[var(--term-dark)] bg-[var(--term-panel)] mb-6">
        <span className="px-3 py-3 text-[var(--term-bright)] text-sm select-none border-r border-[var(--term-dark)]">
          mkdir
        </span>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createList()}
          placeholder="new_list_name"
          className="flex-1 bg-transparent text-[var(--term-bright)] px-3 py-3 text-sm placeholder:text-[var(--term-dark)] focus:outline-none"
        />
        <button
          onClick={createList}
          className="px-4 py-3 border-l border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] text-sm transition-colors"
        >
          [CREATE]
        </button>
      </div>

      {/* Directory listing */}
      <div className="flex flex-col gap-1 mb-8">
        {watchlists.length === 0 && (
          <div className="text-[var(--term-mid)] text-xs py-4 text-center border border-[var(--term-dark)] bg-[var(--term-panel-light)]">
            // no archives found · create one above
          </div>
        )}
        {watchlists.map((wl) => (
          <button
            key={wl.id}
            onClick={() => loadSelected(wl.id)}
            className={`text-left px-4 py-2.5 border transition-colors text-sm ${
              selected?.id === wl.id
                ? "border-[var(--term-bright)] bg-[var(--term-bright-10)] text-[var(--term-bright)]"
                : "border-[var(--term-dark)] bg-[var(--term-panel-light)] text-[var(--term-mid)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)]"
            }`}
          >
            <span className="text-[var(--term-dark)] mr-2">{selected?.id === wl.id ? ">" : " "}</span>
            drwxr-xr-x{" "}
            <span className="text-[var(--term-bright)]">{wl.name}/</span>
            <span className="text-[var(--term-dark)] ml-3 text-xs">{wl.item_count} records</span>
          </button>
        ))}
      </div>

      {selected && (
        <>
          <div className="flex items-center justify-between mb-4 border-b border-[var(--term-dark)] pb-3">
            <div>
              <span className="text-[var(--term-bright)] font-['VT323'] text-3xl">{selected.name}/</span>
              <span className="text-[var(--term-mid)] text-xs ml-3">
                // {selected.items?.length ?? 0} records
              </span>
            </div>
            <button
              onClick={spinRandom}
              disabled={spinning || !selected.items?.length}
              className="px-4 py-2 border border-[var(--term-dark)] hover:border-[#cc2200] text-[var(--term-mid)] hover:text-[#cc2200] text-sm transition-colors disabled:opacity-30"
            >
              {spinning ? <span className="cursor">[RANDOMIZING]</span> : "[RANDOM_PICK]"}
            </button>
          </div>

          {randomFilm && (
            <div className="mb-6 border border-[#cc2200]">
              <div className="px-4 py-2 text-xs text-[#cc2200] border-b border-[#cc2200] bg-[rgba(30,0,0,0.60)]">
                // SELECTED: random pick from {selected.name}
              </div>
              <FilmCard film={randomFilm} />
            </div>
          )}

          <div className="flex flex-col gap-2">
            {selected.items?.map((item: any, i: number) => (
              <FilmCard
                key={item.id}
                film={{ id: item.film_id, ...item.film_metadata, title: item.film_title }}
                index={i}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
