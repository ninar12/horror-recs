import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { FilmCard } from "../components/FilmCard";
import { useAuth } from "../contexts/AuthContext";
function scoreColor(val, max) {
    const pct = val / max;
    if (pct >= 0.70)
        return "#4caf50";
    if (pct >= 0.50)
        return "#f9a825";
    return "#e53935";
}
function getNicheTier(score) {
    if (score >= 8)
        return { label: "DEEP CUT", color: "#cc44ff" };
    if (score >= 6)
        return { label: "CULT PICK", color: "#4488ff" };
    if (score >= 4)
        return { label: "HIDDEN GEM", color: "var(--term-bright)" };
    return null;
}
const PLATFORMS_KEY = "reelscream_preferred_platforms";
export function FilmPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const film = location.state?.film;
    const { loggedIn, watchedIds, toggleWatched, openAuth } = useAuth();
    const preferredPlatforms = (() => {
        try {
            const s = localStorage.getItem(PLATFORMS_KEY);
            return s ? new Set(JSON.parse(s)) : new Set();
        }
        catch {
            return new Set();
        }
    })();
    const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
    const [similar, setSimilar] = useState([]);
    const [similarPool, setSimilarPool] = useState([]);
    const [loadingSimilar, setLoadingSimilar] = useState(true);
    const [adding, setAdding] = useState(false);
    const [added, setAdded] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [savedItemId, setSavedItemId] = useState(null);
    const [savedWatchlistId, setSavedWatchlistId] = useState(null);
    const [watchedPending, setWatchedPending] = useState(false);
    useEffect(() => {
        if (!film || !localStorage.getItem("token"))
            return;
        (async () => {
            try {
                const res = await api.watchlists.list();
                if (!res.data.length)
                    return;
                const detail = await api.watchlists.get(res.data[0].id);
                const found = (detail.data.items || []).find((item) => item.film_id === film.id);
                if (found) {
                    setAdded(true);
                    setSavedItemId(found.id);
                    setSavedWatchlistId(res.data[0].id);
                }
            }
            catch { }
        })();
    }, [film?.id]);
    // Auto-fetch similar on load
    useEffect(() => {
        if (!film)
            return;
        let cancelled = false;
        setLoadingSimilar(true);
        api.search.similar({
            film_id: film.id, title: film.title,
            synopsis: film.synopsis, genres: film.genres,
            atmosphere: film.atmosphere,
        }).then((res) => {
            if (cancelled)
                return;
            const pool = res.data.films || [];
            setSimilarPool(pool);
            setSimilar(shuffle(pool).slice(0, 8));
        }).finally(() => {
            if (!cancelled)
                setLoadingSimilar(false);
        });
        return () => { cancelled = true; };
    }, [film?.id]);
    if (!film) {
        return (_jsxs("div", { className: "flex items-center justify-center h-full text-[var(--term-mid)] font-mono text-sm", children: ["// film not found \u00B7 ", _jsx("button", { onClick: () => navigate("/"), className: "underline ml-1", children: "go back" })] }));
    }
    const tier = film.niche_score != null ? getNicheTier(film.niche_score) : null;
    const accentColor = tier?.color ?? "var(--term-bright)";
    const letterboxdUrl = `https://letterboxd.com/search/${encodeURIComponent(film.title)}/`;
    const imdbUrl = `https://www.imdb.com/find/?q=${encodeURIComponent(`${film.title} ${film.year ?? ""}`)}`;
    const rtUrl = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(film.title)}`;
    const reshuffleSimilar = () => {
        if (similarPool.length === 0)
            return;
        setSimilar(shuffle(similarPool).slice(0, 8));
    };
    const save = async () => {
        if (!localStorage.getItem("token"))
            return;
        setAdding(true);
        try {
            const res = await api.watchlists.list();
            const wlId = res.data.length > 0 ? res.data[0].id : (await api.watchlists.create("Watchlist")).data.id;
            const added_ = await api.watchlists.addFilm(wlId, {
                film_id: film.id, film_title: film.title, film_metadata: film,
            });
            setAdded(true);
            setSavedWatchlistId(wlId);
            if (added_.data?.id)
                setSavedItemId(added_.data.id);
        }
        finally {
            setAdding(false);
        }
    };
    const unsave = async () => {
        if (!savedWatchlistId || !savedItemId)
            return;
        setRemoving(true);
        try {
            await api.watchlists.removeFilm(savedWatchlistId, savedItemId);
            setAdded(false);
            setSavedItemId(null);
            setSavedWatchlistId(null);
        }
        finally {
            setRemoving(false);
        }
    };
    const handleToggleWatched = async () => {
        if (!loggedIn || !film)
            return;
        setWatchedPending(true);
        try {
            await toggleWatched({ id: film.id, title: film.title });
        }
        finally {
            setWatchedPending(false);
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto", onClick: () => navigate("/"), children: _jsxs("div", { className: "relative w-full max-w-5xl mx-auto px-4 py-6 my-4", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "mb-8 bg-[var(--term-panel)] border border-[var(--term-dark)] flex flex-col sm:flex-row", style: { borderTopColor: accentColor, borderTopWidth: "2px" }, children: [_jsx("div", { className: "sm:w-64 shrink-0 bg-black overflow-hidden self-start", children: film.poster_url ? (_jsx("img", { src: film.poster_url, alt: film.title, className: "w-full h-full object-cover object-top", onError: (e) => { e.target.style.display = "none"; } })) : (_jsx("div", { className: "w-full h-full min-h-48 flex items-center justify-center font-['VT323'] text-[var(--term-dark)] text-8xl", children: "?" })) }), _jsxs("div", { className: "flex-1 min-w-0 px-8 py-7 relative", children: [_jsx("button", { onClick: () => navigate("/"), className: "absolute top-4 right-4 text-[var(--term-mid)] hover:text-[var(--term-bright)] border border-[var(--term-dark)] hover:border-[var(--term-bright)] w-7 h-7 flex items-center justify-center transition-colors text-sm leading-none", children: "\u2715" }), _jsx("h1", { className: "font-['VT323'] text-6xl leading-none tracking-wide pr-10", style: { color: accentColor }, children: film.title }), _jsxs("div", { className: "flex items-center justify-between mt-2 flex-wrap gap-2", children: [_jsxs("div", { className: "flex items-center gap-2 font-mono text-sm text-[var(--term-mid)] flex-wrap", children: [film.year && _jsx("span", { children: film.year }), film.director && _jsxs(_Fragment, { children: [_jsx("span", { className: "text-[var(--term-dark)]", children: "/" }), _jsx("span", { children: film.director })] }), tier && film.niche_score != null && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-[var(--term-dark)]", children: "/" }), _jsxs("span", { style: { color: tier.color }, children: [tier.label, " \u00B7 ", film.niche_score, "/10"] })] }))] }), _jsxs("div", { className: "flex items-baseline gap-4 font-mono text-sm", children: [film.imdb_rating != null && (_jsxs("a", { href: imdbUrl, target: "_blank", rel: "noopener noreferrer", className: "hover:opacity-70 transition-opacity", children: [_jsx("span", { className: "text-[var(--term-dark)] text-xs mr-1", children: "IMDb" }), _jsx("span", { style: { color: scoreColor(film.imdb_rating, 10) }, children: film.imdb_rating.toFixed(1) })] })), film.rt_score != null && (_jsxs("a", { href: rtUrl, target: "_blank", rel: "noopener noreferrer", className: "hover:opacity-70 transition-opacity", children: [_jsx("span", { className: "text-[var(--term-dark)] text-xs mr-1", children: "RT" }), _jsxs("span", { style: { color: scoreColor(film.rt_score, 100) }, children: [film.rt_score, "%"] })] })), film.lb_rating != null && (_jsxs("a", { href: letterboxdUrl, target: "_blank", rel: "noopener noreferrer", className: "hover:opacity-70 transition-opacity", children: [_jsx("span", { className: "text-[var(--term-dark)] text-xs mr-1", children: "LB" }), _jsx("span", { style: { color: scoreColor(film.lb_rating, 5) }, children: film.lb_rating.toFixed(1) })] }))] })] }), film.why_youll_like_it && (_jsx("p", { className: "mt-5 text-lg italic leading-relaxed font-mono", style: { color: accentColor }, children: film.why_youll_like_it })), _jsx("div", { className: "border-t border-[var(--term-dark)] my-5" }), film.streaming_platforms?.length > 0 && (_jsxs("div", { className: "flex items-baseline gap-3 font-mono text-sm mb-3 flex-wrap", children: [_jsx("span", { className: "text-[9px] uppercase tracking-[0.2em] text-[var(--term-dark)] shrink-0", children: "WATCH" }), _jsx("span", { className: "text-[var(--term-mid)]", children: film.streaming_platforms.map((p, i) => {
                                                const hasPlatform = preferredPlatforms.size > 0 && preferredPlatforms.has(p);
                                                const notOwned = preferredPlatforms.size > 0 && !preferredPlatforms.has(p);
                                                return (_jsxs("span", { children: [i > 0 && _jsx("span", { className: "text-[var(--term-dark)] mx-1.5", children: "\u00B7" }), _jsx("span", { className: hasPlatform ? "font-bold" : notOwned ? "opacity-30" : "", style: hasPlatform ? { color: accentColor } : {}, children: p })] }, p));
                                            }) }), preferredPlatforms.size > 0 && !film.streaming_platforms.some((p) => preferredPlatforms.has(p)) && (_jsx(Link, { to: "/profile", className: "text-[9px] text-[var(--term-dark)] underline hover:text-[var(--term-mid)] transition-colors", children: "manage platforms" }))] })), film.keywords?.length > 0 && (_jsxs("div", { className: "flex items-baseline gap-3 font-mono text-sm mb-5 flex-wrap", children: [_jsx("span", { className: "text-[9px] uppercase tracking-[0.2em] text-[var(--term-dark)] shrink-0", children: "TAGS" }), _jsx("span", { className: "text-[var(--term-mid)]", children: film.keywords.slice(0, 5).map((k, i) => (_jsxs("span", { children: [i > 0 && _jsx("span", { className: "text-[var(--term-dark)]", children: ", " }), k.toLowerCase()] }, k))) })] })), _jsxs("div", { className: "flex items-center gap-4 flex-wrap", children: [!loggedIn ? (_jsx("button", { onClick: openAuth, className: "text-sm font-mono px-4 py-2 border border-[var(--term-dark)] text-[var(--term-mid)] hover:border-[var(--term-bright)] hover:text-[var(--term-bright)] transition-colors", children: "LOGIN TO SAVE" })) : (_jsx("button", { onClick: added ? unsave : save, disabled: adding || removing, className: `text-sm font-mono px-4 py-2 border transition-colors disabled:opacity-40 font-bold ${added
                                                ? "border-[var(--term-mid)] text-[var(--term-mid)] hover:border-[#e53935] hover:text-[#e53935]"
                                                : "bg-[var(--term-bright)] border-[var(--term-bright)] text-black hover:opacity-90"}`, children: removing ? "REMOVING…" : added ? "SAVED ✓" : adding ? "SAVING…" : "+ SAVE" })), loggedIn && film && (_jsx("button", { onClick: handleToggleWatched, disabled: watchedPending, className: `text-sm font-mono transition-colors disabled:opacity-40 underline underline-offset-2 ${watchedIds.has(film.id)
                                                ? "text-[#4caf50] hover:text-[#e53935]"
                                                : "text-[var(--term-mid)] hover:text-[var(--term-bright)]"}`, children: watchedPending ? "…" : watchedIds.has(film.id) ? "Watched ✓" : "Mark watched" })), _jsxs("div", { className: "ml-auto flex items-center gap-4", children: [_jsx("a", { href: letterboxdUrl, target: "_blank", rel: "noopener noreferrer", className: "text-sm font-mono text-[var(--term-mid)] hover:text-[var(--term-bright)] transition-colors", children: "Letterboxd \u2197" }), _jsx("a", { href: imdbUrl, target: "_blank", rel: "noopener noreferrer", className: "text-sm font-mono text-[var(--term-mid)] hover:text-[var(--term-bright)] transition-colors", children: "IMDb \u2197" })] })] }), (film.synopsis || film.atmosphere) && (_jsx("div", { className: "mt-5", children: _jsx(SummarySection, { synopsis: film.synopsis, atmosphere: film.atmosphere }) }))] })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("div", { className: "text-[var(--term-dark)] text-[10px] font-mono uppercase tracking-widest", children: "\u223F similar films" }), similar.length > 0 && (_jsx("button", { onClick: reshuffleSimilar, className: "text-[9px] font-mono text-[var(--term-dark)] hover:text-[var(--term-bright)] transition-colors px-2 py-1 border border-[var(--term-dark)] hover:border-[var(--term-bright)]", children: "\u21BA shuffle" }))] }), loadingSimilar ? (_jsx("div", { className: "text-[var(--term-mid)] text-sm font-mono", children: _jsx("span", { className: "cursor", children: "SCANNING" }) })) : (_jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3", children: similar.map((f, i) => (_jsx(FilmCard, { film: f, index: i }, f.id))) }))] })] }) }));
}
function SummarySection({ synopsis, atmosphere }) {
    const [open, setOpen] = useState(false);
    return (_jsxs("div", { className: "border-t border-[var(--term-dark)] pt-3", children: [_jsx("button", { onClick: () => setOpen((v) => !v), className: "flex items-center gap-2 text-[10px] font-mono text-[var(--term-dark)] uppercase tracking-widest hover:text-[var(--term-mid)] transition-colors w-full text-left", children: _jsxs("span", { children: [open ? "▲" : "▼", " SUMMARY"] }) }), open && (_jsxs("div", { className: "mt-2 space-y-3", children: [synopsis && (_jsx("p", { className: "text-sm font-mono text-[var(--term-mid)] leading-relaxed", children: synopsis })), atmosphere && (_jsxs("div", { className: "border-t border-[var(--term-dark)] pt-2", children: [_jsx("div", { className: "text-[9px] font-mono text-[var(--term-dark)] uppercase tracking-widest mb-1", children: "MOOD / VIBES" }), _jsx("p", { className: "text-xs font-mono text-[var(--term-mid)] leading-relaxed", children: atmosphere })] }))] }))] }));
}
