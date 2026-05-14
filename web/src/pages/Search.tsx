import { useState, useRef, useCallback, useEffect } from "react";
import { api } from "../api";
import { FilmCard } from "../components/FilmCard";

const PAGE_SIZE = 12;

const QUERIES = [
  "genuinely terrifying, slow burn",
  "fun slasher night with friends",
  "psychological mindfuck",
  "supernatural atmospheric dread",
  "creature feature chaos",
  "80s nostalgia horror",
  "deeply obscure folk horror rituals",
  "surreal body horror nightmare",
  "forgotten 70s occult horror",
  "experimental extreme slow cinema",
  "obscure eastern european gothic",
  "lost vhs found footage paranoia",
  "cosmic horror unknowable entity",
  "rural isolation psychological collapse",
  "giallo italian mystery murder",
  "new french extremity transgressive",
  "silent supernatural haunting melancholy",
  "j-horror cursed object possession",
  'femcel horror tragic loneliness',
  'home invasion tense claustrophobia',
  'cult horror mind control manipulation',
  'zombie outbreak societal collapse',
  'vampire gothic romance horror',
  'werewolf primal transformation horror',
  'korean horror twisted family secrets',
  '2000s teen horror high school',
  'indie horror experimental narrative',
  'influencer horror social media obsession',
 'lgbtq+ horror identity and transformation',
 'lost middle aged white man horror midlife crisis',
 'cannibalism horror taboo and survival',
];

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [allFilms, setAllFilms] = useState<any[]>(() => {
    try { const s = sessionStorage.getItem("search-films"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const seenIds = useRef<Set<string>>(
    (() => { try { const s = localStorage.getItem("seen-ids"); return s ? new Set<string>(JSON.parse(s)) : new Set<string>(); } catch { return new Set<string>(); } })()
  );

  const persistSeen = () => {
    try {
      localStorage.setItem("seen-ids", JSON.stringify([...seenIds.current].slice(-200)));
    } catch {}
  };

  const [picksOpen, setPicksOpen] = useState(false);
  const [themesOpen, setThemesOpen] = useState(false);
  const [visiblePresets, setVisiblePresets] = useState(() => [...QUERIES].sort(() => Math.random() - 0.5).slice(0, 3));

  const rotatePresets = () => setVisiblePresets([...QUERIES].sort(() => Math.random() - 0.5).slice(0, 3));
  const [visibleCount, setVisibleCount] = useState(() => {
    try { return Number(sessionStorage.getItem("search-visible")) || PAGE_SIZE; } catch { return PAGE_SIZE; }
  });
  const [loading, setLoading] = useState(false);
  const [queryUsed, setQueryUsed] = useState(() => {
    try { return sessionStorage.getItem("search-query-used") || ""; } catch { return ""; }
  });
  const [nicheMin, setNicheMin] = useState(3);
  const [nicheEnabled, setNicheEnabled] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try { sessionStorage.setItem("search-films", JSON.stringify(allFilms)); } catch {}
  }, [allFilms]);

  useEffect(() => {
    try { sessionStorage.setItem("search-visible", String(visibleCount)); } catch {}
  }, [visibleCount]);

  useEffect(() => {
    try { sessionStorage.setItem("search-query-used", queryUsed); } catch {}
  }, [queryUsed]);

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  const run = async (q: string, imgFile?: File) => {
    const useImage = imgFile ?? imageFile;
    if (!useImage && !q.trim()) return;
    setLoading(true);
    setAllFilms([]);
    setSimilarSection(null);
    rotatePresets();
    setVisibleCount(PAGE_SIZE);
    setSidebarOpen(false);
    const effectiveMin = nicheEnabled ? nicheMin : 1;
    try {
      let res;
      if (useImage) {
        res = await api.search.image(useImage, { niche_min: effectiveMin });
      } else {
        const exclude = [...seenIds.current].slice(-50).join(",");
        res = await api.search.query(q, { niche_min: effectiveMin, exclude });
      }
      const films: any[] = res.data.films || [];
      const deduped = films.filter((f) => !seenIds.current.has(f.id));
      deduped.forEach((f) => seenIds.current.add(f.id));
      persistSeen();
      setAllFilms(deduped);
      setQueryUsed(res.data.query_used || q);

      // If query looks like a title and top result matches, fetch similar films
      if (!useImage && deduped.length > 0 && q.trim().split(/\s+/).length <= 5) {
        const anchor = deduped[0];
        const nq = norm(q.trim());
        const nt = norm(anchor.title);
        if (nt.includes(nq) || nq.includes(nt)) {
          api.search.similar({
            film_id: anchor.id, title: anchor.title,
            synopsis: anchor.synopsis, genres: anchor.genres, atmosphere: anchor.atmosphere,
          }).then((simRes) => {
            const simFilms = (simRes.data.films || []).filter(
              (f: any) => f.id !== anchor.id && !seenIds.current.has(f.id)
            );
            simFilms.forEach((f: any) => seenIds.current.add(f.id));
            persistSeen();
            setSimilarSection({ title: anchor.title, films: simFilms });
          }).catch(() => {});
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); run(query); };

  const handleRandom = () => {
    const q = QUERIES[Math.floor(Math.random() * QUERIES.length)];
    setQuery(q);
    run(q);
  };

  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  }, [handleImageFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const [similarSection, setSimilarSection] = useState<{ title: string; films: any[] } | null>(null);

  const visibleFilms = allFilms.slice(0, visibleCount);
  const hasMore = visibleCount < allFilms.length;

  const sidebarContents = (
    <>
      <div className="hidden md:block p-5 border-b border-[var(--term-dark)]">
        <div className="text-[var(--term-bright)] font-['VT323'] text-5xl tracking-widest leading-none">REELSCREAM</div>
        <div className="text-[var(--term-mid)] text-[10px] mt-1">// AI horror discovery</div>
        <div className="text-[var(--term-mid)] text-[10px]">// no escape.</div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-b border-[var(--term-dark)]"
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}>
        <div className="text-[var(--term-dark)] text-[10px] mb-1.5 select-none">root@reelscream:~$</div>
        {imagePreview && (
          <div className="relative mb-2">
            <img src={imagePreview} alt="attached" className="w-full h-28 object-cover border border-[var(--term-bright)]" />
            <button type="button" onClick={clearImage}
              className="absolute top-1 right-1 bg-black/80 text-[var(--term-bright)] text-xs px-1.5 py-0.5 font-mono hover:bg-black">
              X
            </button>
          </div>
        )}
        <textarea ref={textareaRef} value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(query); } }}
          placeholder={imagePreview ? "optional: add context for the image..." : "describe a vibe, mood, film title, or drag a photo here..."}
          rows={3}
          className={`w-full bg-black border text-[var(--term-bright)] px-2 py-2 text-sm placeholder:text-[var(--term-dark)] focus:outline-none resize-none transition-colors ${dragOver ? "border-[var(--term-bright)]" : "border-[var(--term-dark)] focus:border-[var(--term-bright)]"}`}
        />
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} className="sr-only" />
        <div className="flex gap-2 mt-2">
          <button type="submit" disabled={loading || (!query.trim() && !imageFile)}
            className="flex-1 py-2.5 border border-[var(--term-bright)] text-[var(--term-bright)] hover:bg-[var(--term-bright-10)] text-sm disabled:opacity-30 transition-colors">
            {loading ? <span className="cursor">SCANNING</span> : "[EXECUTE]"}
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading}
            className="px-3 py-2.5 border border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)] text-sm disabled:opacity-30 transition-colors"
            title="Attach image">
            IMG
          </button>
          <button type="button" onClick={handleRandom} disabled={loading}
            className="px-4 py-2.5 border border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)] text-sm disabled:opacity-30 transition-colors"
            title="Shuffle">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="1,4 5,4 11,12 15,12" /><polyline points="12,10 15,12 12,14" />
              <polyline points="15,4 11,4 5,12 1,12" /><polyline points="4,2 1,4 4,6" />
            </svg>
          </button>
        </div>
      </form>

      <div className="border-b border-[var(--term-dark)]">
        <button onClick={() => setPicksOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] uppercase tracking-widest text-[var(--term-dark)] hover:text-[var(--term-mid)] transition-colors">
          <span>// quick picks</span>
          <span>{picksOpen ? "−" : "+"}</span>
        </button>
        {picksOpen && (
          <div className="px-4 pb-3 flex flex-col gap-1">
            {visiblePresets.map((p) => (
              <button key={p} onClick={() => { setQuery(p); run(p); }}
                className="text-left text-xs px-2 py-2 border border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)] transition-colors">
                &gt; {p}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-b border-[var(--term-dark)]">
        <button onClick={() => setThemesOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] uppercase tracking-widest text-[var(--term-dark)] hover:text-[var(--term-mid)] transition-colors">
          <span>// themes</span>
          <span>{themesOpen ? "−" : "+"}</span>
        </button>
        {themesOpen && (
          <div className="px-4 pb-3 flex flex-wrap gap-1.5">
            {["slasher","folk horror","supernatural","body horror","found footage","giallo","possession","haunted house","psychological","zombie","vampire","werewolf","cult","cosmic","gore","j-horror","new french extremity","home invasion"].map((t) => (
              <button key={t} onClick={() => { setQuery(t); run(t); }}
                className="text-[10px] px-2 py-1 border border-[var(--term-dark)] text-[var(--term-dark)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)] transition-colors capitalize">
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[var(--term-dark)] text-[10px] uppercase tracking-widest">// niche filter</span>
          <button onClick={() => setNicheEnabled((v) => !v)}
            className={`text-[10px] font-mono px-2 py-px border transition-colors ${nicheEnabled ? "border-[var(--term-bright)] text-[var(--term-bright)] bg-[var(--term-bright-10)]" : "border-[var(--term-dark)] text-[var(--term-dark)]"}`}>
            {nicheEnabled ? "ON" : "OFF"}
          </button>
        </div>
        <div className={`transition-opacity ${nicheEnabled ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
          <div className="text-[var(--term-dark)] text-[10px] mb-2">floor: <span className="text-[var(--term-bright)]">{nicheMin}/10</span></div>
          <input type="range" min={1} max={9} value={nicheMin} onChange={(e) => setNicheMin(Number(e.target.value))}
            className="w-full accent-[var(--term-bright)] h-1 cursor-pointer" />
          <div className="flex justify-between text-[9px] text-[var(--term-dark)] mt-1"><span>mainstream</span><span>deep cut</span></div>
        </div>
        <p className={`text-[10px] font-mono mt-2 leading-snug ${!nicheEnabled ? "text-[var(--term-dark)]" : nicheMin >= 8 ? "text-[#e53935]" : nicheMin >= 6 ? "text-[#f9a825]" : "text-[var(--term-dark)]"}`}>
          {!nicheEnabled ? "// niche filter off" : nicheMin >= 8 ? "// deep cuts only" : nicheMin >= 6 ? "// mainstream filtered" : nicheMin >= 4 ? "// hidden gems and above" : "// all films included"}
        </p>
      </div>
    </>
  );

  return (
    <div className="flex h-full overflow-hidden bg-black">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <aside className="absolute left-0 top-0 h-full w-80 bg-[var(--term-panel)] border-r border-[var(--term-dark)] overflow-y-auto z-50"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--term-dark)]">
              <span className="text-[var(--term-bright)] font-['VT323'] text-2xl tracking-widest">REELSCREAM</span>
              <button onClick={() => setSidebarOpen(false)} className="text-[var(--term-mid)] hover:text-[var(--term-bright)] text-xl">X</button>
            </div>
            {sidebarContents}
          </aside>
        </div>
      )}
      <aside className="hidden md:flex w-72 shrink-0 flex-col border-r border-[var(--term-dark)] bg-[var(--term-panel)] overflow-y-auto">
        {sidebarContents}
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden bg-[var(--term-bright)]">
        <div className="px-4 py-2.5 border-b border-black/20 flex items-center gap-3 shrink-0">
          <button className="md:hidden text-black/60 hover:text-black text-sm font-mono border border-black/20 px-2 py-1 shrink-0" onClick={() => setSidebarOpen(true)}>
            MENU
          </button>
          <span className="text-black/50 text-xs font-mono truncate">
            {loading ? "scanning..." : allFilms.length > 0 ? `// ${allFilms.length} records found` : "// awaiting query"}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">
          {!loading && allFilms.length === 0 && !queryUsed && (
            <div className="flex flex-col items-center justify-center h-full text-center select-none">
              <div className="font-['VT323'] text-[100px] sm:text-[120px] leading-none text-black/10">?</div>
              <div className="text-black/30 text-sm mt-2 font-mono">describe a vibe, paste a title, or drop an image</div>
            </div>
          )}
          {!loading && allFilms.length === 0 && queryUsed && (
            <div className="text-center text-black/50 py-16 text-sm font-mono border border-black/20">// NO RECORDS FOUND</div>
          )}
          {loading && (
            <div className="text-center text-black/50 py-16 text-sm font-mono border border-black/20">
              <span className="cursor">SCANNING DATABASE</span>
            </div>
          )}
          {!loading && visibleFilms.length > 0 && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3">
                {visibleFilms.map((film, i) => (
                  <FilmCard key={film.id} film={film} index={i} />
                ))}
              </div>
              {hasMore && (
                <button onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="w-full mt-4 py-3 border border-black/20 hover:border-black/60 text-black/40 hover:text-black text-sm font-mono transition-colors">
                  LOAD MORE ({allFilms.length - visibleCount} remaining)
                </button>
              )}
              {similarSection && similarSection.films.length > 0 && (
                <div className="mt-6">
                  <div className="text-[10px] font-mono text-black/30 mb-3 pt-4 border-t border-black/20 uppercase tracking-widest">
                    // similar to: {similarSection.title}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3">
                    {similarSection.films.map((film) => (
                      <FilmCard key={film.id} film={film} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
