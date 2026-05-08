import { useState, useRef } from "react";
import { api } from "../api";
import { FilmCard } from "../components/FilmCard";

const PAGE_SIZE = 12;

const MOOD_PRESETS = [
  "genuinely terrifying, slow burn",
  "fun slasher night with friends",
  "psychological mindfuck",
  "supernatural atmospheric dread",
  "creature feature chaos",
  "80s nostalgia horror",
];

const RANDOM_QUERIES = [
  "deeply obscure folk horror rituals",
  "surreal body horror nightmare",
  "forgotten 70s occult horror",
  "experimental extreme slow cinema horror",
  "obscure eastern european gothic horror",
  "lost vhs found footage dread",
  "cosmic horror unknowable entity",
  "rural isolation psychological breakdown",
];

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"search" | "mood">("search");
  const [allFilms, setAllFilms] = useState<any[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [queryUsed, setQueryUsed] = useState("");
  const [nicheMin, setNicheMin] = useState(3);
  const [nicheEnabled, setNicheEnabled] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const run = async (q: string, runMode = mode, nMin = nicheMin, nEnabled = nicheEnabled) => {
    if (!q.trim()) return;
    setLoading(true);
    setAllFilms([]);
    setVisibleCount(PAGE_SIZE);
    setSidebarOpen(false); // close sidebar on mobile after search
    const effectiveMin = nEnabled ? nMin : 1;
    try {
      const res = runMode === "search"
        ? await api.search.query(q, { niche_min: effectiveMin })
        : await api.search.mood(q, { niche_min: effectiveMin });
      setAllFilms(res.data.films || []);
      setQueryUsed(res.data.query_used || q);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run(query);
  };

  const handleRandom = () => {
    const q = RANDOM_QUERIES[Math.floor(Math.random() * RANDOM_QUERIES.length)];
    setQuery(q);
    setMode("search");
    run(q, "search");
  };

  const visibleFilms = allFilms.slice(0, visibleCount);
  const hasMore = visibleCount < allFilms.length;

  // ── Sidebar contents (shared between mobile overlay + desktop panel) ──────
  const sidebarContents = (
    <>
      {/* Logo — desktop only (mobile has nav bar) */}
      <div className="hidden md:block p-5 border-b border-[var(--term-dark)]">
        <div className="text-[var(--term-bright)] font-['VT323'] text-5xl tracking-widest leading-none">
          REELSCREAM
        </div>
        <div className="text-[var(--term-mid)] text-[10px] mt-1">// AI horror discovery · v1.0</div>
        <div className="text-[var(--term-mid)] text-[10px]">// no escape.</div>
      </div>

      {/* Mode toggle */}
      <div className="flex border-b border-[var(--term-dark)]">
        <button
          onClick={() => setMode("search")}
          className={`flex-1 py-3 text-sm transition-colors border-r border-[var(--term-dark)] ${
            mode === "search"
              ? "bg-[var(--term-bright-10)] text-[var(--term-bright)]"
              : "text-[var(--term-mid)] hover:text-[var(--term-bright)]"
          }`}
        >
          {mode === "search" ? "▶ " : "  "}SEARCH
        </button>
        <button
          onClick={() => setMode("mood")}
          className={`flex-1 py-3 text-sm transition-colors ${
            mode === "mood"
              ? "bg-[var(--term-bright-10)] text-[var(--term-bright)]"
              : "text-[var(--term-mid)] hover:text-[var(--term-bright)]"
          }`}
        >
          {mode === "mood" ? "▶ " : "  "}MOOD
        </button>
      </div>

      {/* Query input */}
      <form onSubmit={handleSubmit} className="p-4 border-b border-[var(--term-dark)]">
        <div className="text-[var(--term-dark)] text-[10px] mb-1.5 select-none">
          root@reelscream:~$
        </div>
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              run(query);
            }
          }}
          placeholder={
            mode === "search"
              ? "slow burn folk horror like Midsommar..."
              : "something that will genuinely disturb me..."
          }
          rows={3}
          className="w-full bg-black border border-[var(--term-dark)] text-[var(--term-bright)] px-2 py-2 text-sm placeholder:text-[var(--term-dark)] focus:outline-none focus:border-[var(--term-bright)] resize-none"
        />
        <div className="flex gap-2 mt-2">
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="flex-1 py-2.5 border border-[var(--term-bright)] text-[var(--term-bright)] hover:bg-[var(--term-bright-10)] text-sm disabled:opacity-30 transition-colors"
          >
            {loading ? <span className="cursor">SCANNING</span> : "[EXECUTE]"}
          </button>
          <button
            type="button"
            onClick={handleRandom}
            disabled={loading}
            className="px-4 py-2.5 border border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)] text-sm disabled:opacity-30 transition-colors"
            title="Shuffle — pick something for me"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter" strokeLinecap="square">
              {/* top arrow: left → right, steps down */}
              <polyline points="1,4 5,4 11,12 15,12" />
              <polyline points="12,10 15,12 12,14" />
              {/* bottom arrow: right → left, steps up */}
              <polyline points="15,4 11,4 5,12 1,12" />
              <polyline points="4,2 1,4 4,6" />
            </svg>
          </button>
        </div>
      </form>

      {/* Mood presets */}
      {mode === "mood" && (
        <div className="p-4 border-b border-[var(--term-dark)]">
          <div className="text-[var(--term-dark)] text-[10px] mb-2 uppercase tracking-widest">// mood presets</div>
          <div className="flex flex-col gap-1">
            {MOOD_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => { setQuery(p); run(p, "mood"); }}
                className="text-left text-xs px-2 py-2 border border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)] transition-colors"
              >
                &gt; {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Niche filter */}
      <div className="p-4">
        {/* Toggle row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[var(--term-dark)] text-[10px] uppercase tracking-widest">
            // niche filter
          </span>
          <button
            onClick={() => setNicheEnabled((v) => !v)}
            className={`text-[10px] font-mono px-2 py-px border transition-colors ${
              nicheEnabled
                ? "border-[var(--term-bright)] text-[var(--term-bright)] bg-[var(--term-bright-10)]"
                : "border-[var(--term-dark)] text-[var(--term-dark)]"
            }`}
          >
            {nicheEnabled ? "ON" : "OFF"}
          </button>
        </div>

        {/* Slider — dimmed when disabled */}
        <div className={`transition-opacity ${nicheEnabled ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
          <div className="text-[var(--term-dark)] text-[10px] mb-2">
            floor: <span className="text-[var(--term-bright)]">{nicheMin}/10</span>
          </div>
          <input
            type="range"
            min={1}
            max={9}
            value={nicheMin}
            onChange={(e) => setNicheMin(Number(e.target.value))}
            className="w-full accent-[var(--term-bright)] h-1 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-[var(--term-dark)] mt-1">
            <span>mainstream</span>
            <span>deep cut</span>
          </div>
        </div>

        {/* Hint */}
        <p className={`text-[10px] font-mono mt-2 leading-snug transition-colors ${
          !nicheEnabled
            ? "text-[var(--term-dark)]"
            : nicheMin >= 8
            ? "text-[#e53935]"
            : nicheMin >= 6
            ? "text-[#f9a825]"
            : "text-[var(--term-dark)]"
        }`}>
          {!nicheEnabled
            ? "// niche filter off — all films included"
            : nicheMin >= 8
            ? "// deep cuts only — expect very few results"
            : nicheMin >= 6
            ? "// mainstream filtered out — fewer results"
            : nicheMin >= 4
            ? "// hidden gems and above"
            : "// all films included"}
        </p>
      </div>
    </>
  );

  return (
    <div className="flex h-full overflow-hidden bg-black">

      {/* ── MOBILE SIDEBAR OVERLAY ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" />
          {/* Drawer */}
          <aside
            className="absolute left-0 top-0 h-full w-80 bg-[var(--term-panel)] border-r border-[var(--term-dark)] overflow-y-auto z-50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close row */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--term-dark)]">
              <span className="text-[var(--term-bright)] font-['VT323'] text-2xl tracking-widest">REELSCREAM</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-[var(--term-mid)] hover:text-[var(--term-bright)] text-xl leading-none"
              >
                ✕
              </button>
            </div>
            {sidebarContents}
          </aside>
        </div>
      )}

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex w-72 shrink-0 flex-col border-r border-[var(--term-dark)] bg-[var(--term-panel)] overflow-y-auto">
        {sidebarContents}
      </aside>

      {/* ── RIGHT PANEL ── */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[var(--term-bright)]">

        {/* Top bar */}
        <div className="px-4 py-2.5 border-b border-black/20 flex items-center gap-3 shrink-0">
          {/* Mobile menu button */}
          <button
            className="md:hidden text-black/60 hover:text-black text-sm font-mono border border-black/20 px-2 py-1 shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            ☰ SEARCH
          </button>

          {/* Status */}
          <span className="text-black/50 text-xs font-mono truncate">
            {loading
              ? "scanning..."
              : allFilms.length > 0
              ? `// ${allFilms.length} records found`
              : "// awaiting query"}
          </span>

          {queryUsed && mode === "mood" && !loading && (
            <span className="text-[10px] text-black/40 font-mono hidden sm:block truncate">
              → <span className="text-black/60">"{queryUsed}"</span>
            </span>
          )}
        </div>

        {/* Scrollable results */}
        <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">

          {/* Empty state */}
          {!loading && allFilms.length === 0 && !queryUsed && (
            <div className="flex flex-col items-center justify-center h-full text-center select-none">
              <div className="font-['VT323'] text-[100px] sm:text-[120px] leading-none text-black/10">?</div>
              <div className="text-black/30 text-sm mt-2 font-mono">enter a query to begin</div>
            </div>
          )}

          {/* No results */}
          {!loading && allFilms.length === 0 && queryUsed && (
            <div className="text-center text-black/50 py-16 text-sm font-mono border border-black/20">
              // NO RECORDS FOUND
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center text-black/50 py-16 text-sm font-mono border border-black/20">
              <span className="cursor">SCANNING DATABASE</span>
            </div>
          )}

          {/* Grid — 2 → 3 → 4 → 5 → 6 columns */}
          {!loading && visibleFilms.length > 0 && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 items-start">
                {visibleFilms.map((film, i) => (
                  <FilmCard key={film.id} film={film} index={i} />
                ))}
              </div>

              {hasMore && (
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="w-full mt-4 py-3 border border-black/20 hover:border-black/60 text-black/40 hover:text-black text-sm font-mono transition-colors"
                >
                  &gt; LOAD MORE ({allFilms.length - visibleCount} remaining)
                </button>
              )}
            </div>
          )}

        </div>
      </main>

    </div>
  );
}
