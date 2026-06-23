import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
    const [allFilms, setAllFilms] = useState(() => {
        try {
            const s = sessionStorage.getItem("search-films");
            return s ? JSON.parse(s) : [];
        }
        catch {
            return [];
        }
    });
    const seenIds = useRef((() => { try {
        const s = localStorage.getItem("seen-ids");
        return s ? new Set(JSON.parse(s)) : new Set();
    }
    catch {
        return new Set();
    } })());
    const persistSeen = () => {
        try {
            localStorage.setItem("seen-ids", JSON.stringify([...seenIds.current].slice(-200)));
        }
        catch { }
    };
    const [picksOpen, setPicksOpen] = useState(false);
    const [themesOpen, setThemesOpen] = useState(false);
    const [visiblePresets, setVisiblePresets] = useState(() => [...QUERIES].sort(() => Math.random() - 0.5).slice(0, 3));
    const rotatePresets = () => setVisiblePresets([...QUERIES].sort(() => Math.random() - 0.5).slice(0, 3));
    const [visibleCount, setVisibleCount] = useState(() => {
        try {
            return Number(sessionStorage.getItem("search-visible")) || PAGE_SIZE;
        }
        catch {
            return PAGE_SIZE;
        }
    });
    const [loading, setLoading] = useState(false);
    const [queryUsed, setQueryUsed] = useState(() => {
        try {
            return sessionStorage.getItem("search-query-used") || "";
        }
        catch {
            return "";
        }
    });
    const [nicheMin, setNicheMin] = useState(3);
    const [nicheEnabled, setNicheEnabled] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);
    useEffect(() => {
        try {
            sessionStorage.setItem("search-films", JSON.stringify(allFilms));
        }
        catch { }
    }, [allFilms]);
    useEffect(() => {
        try {
            sessionStorage.setItem("search-visible", String(visibleCount));
        }
        catch { }
    }, [visibleCount]);
    useEffect(() => {
        try {
            sessionStorage.setItem("search-query-used", queryUsed);
        }
        catch { }
    }, [queryUsed]);
    const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const run = async (q, imgFiles) => {
        const useImages = imgFiles ?? imageFiles;
        if (!useImages.length && !q.trim())
            return;
        setLoading(true);
        setAllFilms([]);
        setSimilarSection(null);
        rotatePresets();
        setVisibleCount(PAGE_SIZE);
        setSidebarOpen(false);
        const effectiveMin = nicheEnabled ? nicheMin : 1;
        try {
            let res;
            if (useImages.length) {
                res = await api.search.image(useImages, { niche_min: effectiveMin });
            }
            else {
                const exclude = [...seenIds.current].slice(-50).join(",");
                res = await api.search.query(q, { niche_min: effectiveMin, exclude });
            }
            const films = res.data.films || [];
            const deduped = films.filter((f) => !seenIds.current.has(f.id));
            deduped.forEach((f) => seenIds.current.add(f.id));
            persistSeen();
            setAllFilms(deduped);
            setQueryUsed(res.data.query_used || q);
            // If query looks like a title and top result matches, fetch similar films
            if (!useImages.length && deduped.length > 0 && q.trim().split(/\s+/).length <= 5) {
                const anchor = deduped[0];
                const nq = norm(q.trim());
                const nt = norm(anchor.title);
                if (nt.includes(nq) || nq.includes(nt)) {
                    api.search.similar({
                        film_id: anchor.id, title: anchor.title,
                        synopsis: anchor.synopsis, genres: anchor.genres, atmosphere: anchor.atmosphere,
                    }).then((simRes) => {
                        const simFilms = (simRes.data.films || []).filter((f) => f.id !== anchor.id && !seenIds.current.has(f.id));
                        simFilms.forEach((f) => seenIds.current.add(f.id));
                        persistSeen();
                        setSimilarSection({ title: anchor.title, films: simFilms });
                    }).catch(() => { });
                }
            }
        }
        finally {
            setLoading(false);
        }
    };
    const handleSubmit = (e) => { e.preventDefault(); run(query); };
    const handleRandom = () => {
        const q = QUERIES[Math.floor(Math.random() * QUERIES.length)];
        setQuery(q);
        run(q);
    };
    const addImageFiles = useCallback((incoming) => {
        const valid = incoming.filter((f) => f.type.startsWith("image/"));
        setImageFiles((prev) => {
            const combined = [...prev, ...valid].slice(0, 5);
            setImagePreviews(combined.map((f) => URL.createObjectURL(f)));
            return combined;
        });
    }, []);
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        addImageFiles(Array.from(e.dataTransfer.files));
    }, [addImageFiles]);
    const handleFileInput = (e) => {
        if (e.target.files)
            addImageFiles(Array.from(e.target.files));
        if (fileInputRef.current)
            fileInputRef.current.value = "";
    };
    const removeImage = (idx) => {
        URL.revokeObjectURL(imagePreviews[idx]);
        setImageFiles((prev) => prev.filter((_, i) => i !== idx));
        setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
    };
    const clearImages = () => {
        imagePreviews.forEach((p) => URL.revokeObjectURL(p));
        setImageFiles([]);
        setImagePreviews([]);
        if (fileInputRef.current)
            fileInputRef.current.value = "";
    };
    const [similarSection, setSimilarSection] = useState(null);
    const [sortBy, setSortBy] = useState("relevance");
    const sortedFilms = [...allFilms].sort((a, b) => {
        if (sortBy === "rating")
            return (b.consensus_score ?? b.imdb_rating ?? 0) - (a.consensus_score ?? a.imdb_rating ?? 0);
        if (sortBy === "niche")
            return (b.niche_score ?? 0) - (a.niche_score ?? 0);
        return 0;
    });
    const visibleFilms = sortedFilms.slice(0, visibleCount);
    const hasMore = visibleCount < allFilms.length;
    const sidebarContents = (_jsxs(_Fragment, { children: [_jsxs("div", { className: "hidden md:block p-5 border-b border-[var(--term-dark)]", children: [_jsx("div", { className: "text-[var(--term-bright)] font-['VT323'] text-5xl tracking-widest leading-none", children: "REELSCREAM" }), _jsx("div", { className: "text-[var(--term-mid)] text-[10px] mt-1", children: "// AI horror discovery" }), _jsx("div", { className: "text-[var(--term-mid)] text-[10px]", children: "// no escape." })] }), _jsxs("form", { onSubmit: handleSubmit, className: "p-4 border-b border-[var(--term-dark)]", onDrop: handleDrop, onDragOver: (e) => { e.preventDefault(); setDragOver(true); }, onDragLeave: () => setDragOver(false), children: [_jsx("div", { className: "text-[var(--term-dark)] text-[10px] mb-1.5 select-none", children: "root@reelscream:~$" }), imagePreviews.length > 0 && (_jsxs("div", { className: "mb-2", children: [_jsxs("div", { className: "flex gap-1.5 flex-wrap mb-1", children: [imagePreviews.map((src, i) => (_jsxs("div", { className: "relative w-16 h-16 shrink-0", children: [_jsx("img", { src: src, alt: "", className: "w-full h-full object-cover border border-[var(--term-dark)]" }), _jsx("button", { type: "button", onClick: () => removeImage(i), className: "absolute top-0.5 right-0.5 bg-black/90 text-[var(--term-mid)] hover:text-[var(--term-bright)] text-[10px] w-4 h-4 flex items-center justify-center leading-none", children: "\u2715" })] }, i))), imagePreviews.length < 5 && (_jsx("button", { type: "button", onClick: () => fileInputRef.current?.click(), className: "w-16 h-16 border border-dashed border-[var(--term-dark)] text-[var(--term-dark)] hover:border-[var(--term-bright)] hover:text-[var(--term-bright)] text-xl flex items-center justify-center transition-colors shrink-0", children: "+" }))] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "text-[9px] font-mono text-[var(--term-dark)]", children: [imagePreviews.length, "/5 images"] }), _jsx("button", { type: "button", onClick: clearImages, className: "text-[9px] font-mono text-[var(--term-dark)] hover:text-[#e53935] transition-colors", children: "clear all" })] })] })), _jsx("textarea", { ref: textareaRef, value: query, onChange: (e) => setQuery(e.target.value), onKeyDown: (e) => { if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            run(query);
                        } }, placeholder: imagePreviews.length ? "optional: add context..." : "describe a vibe, mood, film title, or drag photos here...", rows: 3, className: `w-full bg-black border text-[var(--term-bright)] px-2 py-2 text-sm placeholder:text-[var(--term-dark)] focus:outline-none resize-none transition-colors ${dragOver ? "border-[var(--term-bright)]" : "border-[var(--term-dark)] focus:border-[var(--term-bright)]"}` }), _jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", multiple: true, onChange: handleFileInput, className: "sr-only" }), _jsxs("div", { className: "flex gap-2 mt-2", children: [_jsx("button", { type: "submit", disabled: loading || (!query.trim() && !imageFiles.length), className: "flex-1 py-2.5 border border-[var(--term-bright)] text-[var(--term-bright)] hover:bg-[var(--term-bright-10)] text-sm disabled:opacity-30 transition-colors", children: loading ? _jsx("span", { className: "cursor", children: "SCANNING" }) : "[EXECUTE]" }), _jsx("button", { type: "button", onClick: () => fileInputRef.current?.click(), disabled: loading || imageFiles.length >= 5, className: "px-3 py-2.5 border border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)] text-sm disabled:opacity-30 transition-colors", title: "Attach images (max 5)", children: "IMG" }), _jsx("button", { type: "button", onClick: handleRandom, disabled: loading, className: "px-4 py-2.5 border border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)] text-sm disabled:opacity-30 transition-colors", title: "Shuffle", children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: [_jsx("polyline", { points: "1,4 5,4 11,12 15,12" }), _jsx("polyline", { points: "12,10 15,12 12,14" }), _jsx("polyline", { points: "15,4 11,4 5,12 1,12" }), _jsx("polyline", { points: "4,2 1,4 4,6" })] }) })] })] }), _jsxs("div", { className: "border-b border-[var(--term-dark)]", children: [_jsxs("button", { onClick: () => setPicksOpen((v) => !v), className: "w-full flex items-center justify-between px-4 py-2.5 text-[10px] uppercase tracking-widest text-[var(--term-dark)] hover:text-[var(--term-mid)] transition-colors", children: [_jsx("span", { children: "// quick picks" }), _jsx("span", { children: picksOpen ? "−" : "+" })] }), picksOpen && (_jsx("div", { className: "px-4 pb-3 flex flex-col gap-1", children: visiblePresets.map((p) => (_jsxs("button", { onClick: () => { setQuery(p); run(p); }, className: "text-left text-xs px-2 py-2 border border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)] transition-colors", children: ["> ", p] }, p))) }))] }), _jsxs("div", { className: "border-b border-[var(--term-dark)]", children: [_jsxs("button", { onClick: () => setThemesOpen((v) => !v), className: "w-full flex items-center justify-between px-4 py-2.5 text-[10px] uppercase tracking-widest text-[var(--term-dark)] hover:text-[var(--term-mid)] transition-colors", children: [_jsx("span", { children: "// themes" }), _jsx("span", { children: themesOpen ? "−" : "+" })] }), themesOpen && (_jsx("div", { className: "px-4 pb-3 flex flex-wrap gap-1.5", children: ["slasher", "folk horror", "supernatural", "body horror", "found footage", "giallo", "possession", "haunted house", "psychological", "zombie", "vampire", "werewolf", "cult", "cosmic", "gore", "j-horror", "new french extremity", "home invasion"].map((t) => (_jsx("button", { onClick: () => { setQuery(t); run(t); }, className: "text-[10px] px-2 py-1 border border-[var(--term-dark)] text-[var(--term-dark)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)] transition-colors capitalize", children: t }, t))) }))] }), _jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("span", { className: "text-[var(--term-dark)] text-[10px] uppercase tracking-widest", children: "// niche filter" }), _jsx("button", { onClick: () => setNicheEnabled((v) => !v), className: `text-[10px] font-mono px-2 py-px border transition-colors ${nicheEnabled ? "border-[var(--term-bright)] text-[var(--term-bright)] bg-[var(--term-bright-10)]" : "border-[var(--term-dark)] text-[var(--term-dark)]"}`, children: nicheEnabled ? "ON" : "OFF" })] }), _jsxs("div", { className: `transition-opacity ${nicheEnabled ? "opacity-100" : "opacity-30 pointer-events-none"}`, children: [_jsxs("div", { className: "text-[var(--term-dark)] text-[10px] mb-2", children: ["floor: ", _jsxs("span", { className: "text-[var(--term-bright)]", children: [nicheMin, "/10"] })] }), _jsx("input", { type: "range", min: 1, max: 9, value: nicheMin, onChange: (e) => setNicheMin(Number(e.target.value)), className: "w-full accent-[var(--term-bright)] h-1 cursor-pointer" }), _jsxs("div", { className: "flex justify-between text-[9px] text-[var(--term-dark)] mt-1", children: [_jsx("span", { children: "mainstream" }), _jsx("span", { children: "deep cut" })] })] }), _jsx("p", { className: `text-[10px] font-mono mt-2 leading-snug ${!nicheEnabled ? "text-[var(--term-dark)]" : nicheMin >= 8 ? "text-[#e53935]" : nicheMin >= 6 ? "text-[#f9a825]" : "text-[var(--term-dark)]"}`, children: !nicheEnabled ? "// niche filter off" : nicheMin >= 8 ? "// deep cuts only" : nicheMin >= 6 ? "// mainstream filtered" : nicheMin >= 4 ? "// hidden gems and above" : "// all films included" })] })] }));
    return (_jsxs("div", { className: "flex h-full overflow-hidden bg-black", children: [sidebarOpen && (_jsxs("div", { className: "fixed inset-0 z-40 md:hidden", onClick: () => setSidebarOpen(false), children: [_jsx("div", { className: "absolute inset-0 bg-black/60" }), _jsxs("aside", { className: "absolute left-0 top-0 h-full w-80 bg-[var(--term-panel)] border-r border-[var(--term-dark)] overflow-y-auto z-50", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-b border-[var(--term-dark)]", children: [_jsx("span", { className: "text-[var(--term-bright)] font-['VT323'] text-2xl tracking-widest", children: "REELSCREAM" }), _jsx("button", { onClick: () => setSidebarOpen(false), className: "text-[var(--term-mid)] hover:text-[var(--term-bright)] text-xl", children: "X" })] }), sidebarContents] })] })), _jsx("aside", { className: "hidden md:flex w-72 shrink-0 flex-col border-r border-[var(--term-dark)] bg-[var(--term-panel)] overflow-y-auto", children: sidebarContents }), _jsxs("main", { className: "flex-1 flex flex-col overflow-hidden bg-[var(--term-bright)]", children: [_jsxs("div", { className: "px-4 py-2.5 border-b border-black/20 flex items-center gap-3 shrink-0", children: [_jsx("button", { className: "md:hidden text-black/60 hover:text-black text-sm font-mono border border-black/20 px-2 py-1 shrink-0", onClick: () => setSidebarOpen(true), children: "MENU" }), _jsx("span", { className: "text-black/50 text-xs font-mono truncate", children: loading ? "scanning..." : allFilms.length > 0 ? `// ${allFilms.length} records found` : "// awaiting query" }), allFilms.length > 0 && (_jsx("div", { className: "ml-auto flex items-center gap-1 shrink-0", children: ["relevance", "rating", "niche"].map((opt) => (_jsx("button", { onClick: () => setSortBy(opt), className: `text-[10px] font-mono px-2 py-px border transition-colors ${sortBy === opt ? "border-black/40 text-black/70 bg-black/10" : "border-black/20 text-black/30 hover:text-black/60"}`, children: opt }, opt))) }))] }), _jsxs("div", { className: "flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4", children: [!loading && allFilms.length === 0 && !queryUsed && (_jsxs("div", { className: "flex flex-col items-center justify-center h-full text-center select-none", children: [_jsx("div", { className: "font-['VT323'] text-[100px] sm:text-[120px] leading-none text-black/10", children: "?" }), _jsx("div", { className: "text-black/30 text-sm mt-2 font-mono", children: "describe a vibe, paste a title, or drop an image" })] })), !loading && allFilms.length === 0 && queryUsed && (_jsx("div", { className: "text-center text-black/50 py-16 text-sm font-mono border border-black/20", children: "// NO RECORDS FOUND" })), loading && (_jsx("div", { className: "text-center text-black/50 py-16 text-sm font-mono border border-black/20", children: _jsx("span", { className: "cursor", children: "SCANNING DATABASE" }) })), !loading && visibleFilms.length > 0 && (_jsxs("div", { children: [_jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3", children: visibleFilms.map((film, i) => (_jsx(FilmCard, { film: film, index: i }, film.id))) }), hasMore && (_jsxs("button", { onClick: () => setVisibleCount((c) => c + PAGE_SIZE), className: "w-full mt-4 py-3 border border-black/20 hover:border-black/60 text-black/40 hover:text-black text-sm font-mono transition-colors", children: ["LOAD MORE (", allFilms.length - visibleCount, " remaining)"] })), similarSection && similarSection.films.length > 0 && (_jsxs("div", { className: "mt-6", children: [_jsxs("div", { className: "text-[10px] font-mono text-black/30 mb-3 pt-4 border-t border-black/20 uppercase tracking-widest", children: ["// similar to: ", similarSection.title] }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3", children: similarSection.films.map((film) => (_jsx(FilmCard, { film: film }, film.id))) })] }))] }))] })] })] }));
}
