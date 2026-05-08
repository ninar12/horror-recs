import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "../api";
function getNicheTier(score) {
    if (score >= 8)
        return { label: "DEEP CUT", color: "#cc44ff" };
    if (score >= 6)
        return { label: "CULT PICK", color: "#4488ff" };
    if (score >= 4)
        return { label: "HIDDEN GEM", color: "var(--term-bright)" };
    return null;
}
function scoreColor(val, max) {
    const pct = val / max;
    if (pct >= 0.70)
        return "#4caf50";
    if (pct >= 0.50)
        return "#f9a825";
    return "#e53935";
}
function RatingBadge({ label, value, color, href }) {
    return (_jsxs("a", { href: href, target: "_blank", rel: "noopener noreferrer", className: "flex flex-col items-center gap-0.5 px-3 py-2 border border-[var(--term-dark)] hover:border-[var(--term-bright)] transition-colors min-w-[60px]", children: [_jsx("span", { className: "text-[9px] font-mono text-[var(--term-dark)] uppercase tracking-widest leading-none", children: label }), _jsx("span", { className: "text-xl font-['VT323'] leading-none", style: { color }, children: value })] }));
}
// ── Modal ─────────────────────────────────────────────────────────────────────
function FilmModal({ film, watchlistId, onAdded, onClose, }) {
    const [adding, setAdding] = useState(false);
    const [added, setAdded] = useState(false);
    const tier = film.niche_score != null ? getNicheTier(film.niche_score) : null;
    const accentColor = tier?.color ?? "var(--term-bright)";
    const letterboxdUrl = `https://letterboxd.com/search/${encodeURIComponent(film.title)}/`;
    const imdbUrl = `https://www.imdb.com/find/?q=${encodeURIComponent(`${film.title} ${film.year ?? ""}`)}`;
    const rtUrl = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(film.title)}`;
    // Close on Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape")
            onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);
    // Prevent body scroll while open
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);
    const handleAdd = async () => {
        if (!watchlistId)
            return;
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
    return createPortal(_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8", onClick: onClose, children: [_jsx("div", { className: "absolute inset-0 bg-black/80 backdrop-blur-sm" }), _jsxs("div", { className: "relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[var(--term-panel)] border border-[var(--term-bright)] flex flex-col sm:flex-row", style: { borderTopColor: accentColor, borderTopWidth: "3px" }, onClick: (e) => e.stopPropagation(), children: [_jsx("div", { className: "sm:w-48 shrink-0 bg-black", children: film.poster_url ? (_jsx("img", { src: film.poster_url, alt: film.title, className: "w-full h-full object-cover", style: { maxHeight: "320px" }, onError: (e) => { e.target.style.display = "none"; } })) : (_jsx("div", { className: "w-full h-48 flex items-center justify-center text-[var(--term-dark)] font-['VT323'] text-6xl", children: "?" })) }), _jsxs("div", { className: "flex-1 p-5 space-y-4 min-w-0", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsx("h2", { className: "text-[var(--term-bright)] font-['VT323'] text-4xl leading-tight tracking-wide", children: film.title }), _jsx("button", { onClick: onClose, className: "text-[var(--term-dark)] hover:text-[var(--term-bright)] text-xl leading-none shrink-0 mt-1", children: "\u2715" })] }), _jsxs("div", { className: "flex items-center gap-3 mt-1 flex-wrap", children: [film.year && (_jsx("span", { className: "text-sm font-mono text-[var(--term-mid)]", children: film.year })), film.director && (_jsx("span", { className: "text-sm font-mono text-[var(--term-mid)]", children: film.director })), tier && film.niche_score != null && (_jsxs("span", { className: "text-[10px] font-mono px-1.5 py-px border", style: { color: tier.color, borderColor: tier.color }, children: [tier.label, " ", film.niche_score, "/10"] }))] })] }), (film.imdb_rating != null || film.rt_score != null || film.lb_rating != null) && (_jsxs("div", { className: "flex gap-2 flex-wrap", children: [film.imdb_rating != null && (_jsx(RatingBadge, { label: "IMDb", value: film.imdb_rating.toFixed(1), color: scoreColor(film.imdb_rating, 10), href: imdbUrl })), film.rt_score != null && (_jsx(RatingBadge, { label: "RT", value: `${film.rt_score}%`, color: scoreColor(film.rt_score, 100), href: rtUrl })), film.lb_rating != null && (_jsx(RatingBadge, { label: "Letterboxd", value: film.lb_rating.toFixed(1), color: scoreColor(film.lb_rating, 5), href: letterboxdUrl })), film.consensus_score != null && (_jsxs("div", { className: "flex flex-col items-center gap-0.5 px-3 py-2 border border-[var(--term-bright)] min-w-[60px]", children: [_jsx("span", { className: "text-[9px] font-mono text-[var(--term-dark)] uppercase tracking-widest leading-none", children: "consensus" }), _jsx("span", { className: "text-xl font-['VT323'] leading-none", style: { color: scoreColor(film.consensus_score, 10) }, children: film.consensus_score.toFixed(1) })] }))] })), film.why_youll_like_it && (_jsx("p", { className: "text-sm leading-relaxed pl-3 border-l-2 italic", style: { color: accentColor, borderColor: accentColor }, children: film.why_youll_like_it })), film.synopsis && (_jsxs("div", { className: "text-xs font-mono text-[var(--term-mid)] leading-relaxed", children: [_jsx("span", { className: "text-[var(--term-dark)]", children: "SYNOPSIS  " }), film.synopsis] })), film.atmosphere && (_jsxs("div", { className: "text-xs font-mono text-[var(--term-mid)] leading-relaxed", children: [_jsx("span", { className: "text-[var(--term-dark)]", children: "ATMOSPHERE  " }), film.atmosphere] })), film.genres?.length ? (_jsx("div", { className: "flex flex-wrap gap-1.5", children: film.genres.map((g) => (_jsx("span", { className: "text-[9px] font-mono px-1.5 py-px border border-[var(--term-dark)] text-[var(--term-dark)]", children: g.toLowerCase().replace(/ /g, "_") }, g))) })) : null, film.streaming_platforms?.length ? (_jsxs("div", { className: "text-xs font-mono", children: [_jsx("span", { className: "text-[var(--term-dark)]", children: "STREAM  " }), _jsx("span", { className: "text-[var(--term-bright)]", children: film.streaming_platforms.join(" · ") })] })) : null, _jsxs("div", { className: "flex items-center gap-2 pt-1 flex-wrap", children: [_jsx("a", { href: letterboxdUrl, target: "_blank", rel: "noopener noreferrer", className: "text-xs font-mono px-2 py-1 border border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)] transition-colors", children: "LETTERBOXD \u2197" }), _jsx("a", { href: imdbUrl, target: "_blank", rel: "noopener noreferrer", className: "text-xs font-mono px-2 py-1 border border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)] transition-colors", children: "IMDB \u2197" }), watchlistId && (_jsx("button", { onClick: handleAdd, disabled: adding || added, className: "ml-auto text-xs font-mono px-3 py-1 border border-[var(--term-bright)] text-[var(--term-bright)] hover:bg-[var(--term-bright-10)] disabled:opacity-40 transition-colors", children: added ? "SAVED ✓" : adding ? "SAVING…" : "+ SAVE TO WATCHLIST" }))] })] })] })] }), document.body);
}
// ── Card (grid tile) ──────────────────────────────────────────────────────────
export function FilmCard({ film, watchlistId, onAdded, index }) {
    const [open, setOpen] = useState(false);
    const idx = index !== undefined ? String(index + 1).padStart(2, "0") : "--";
    const tier = film.niche_score != null ? getNicheTier(film.niche_score) : null;
    const accentColor = tier?.color ?? "var(--term-dark)";
    const imdbUrl = `https://www.imdb.com/find/?q=${encodeURIComponent(`${film.title} ${film.year ?? ""}`)}`;
    const consensusVal = film.consensus_score ?? film.imdb_rating ?? null;
    const consensusStr = consensusVal != null ? consensusVal.toFixed(1) : null;
    const consensusColor = consensusVal != null ? scoreColor(consensusVal, 10) : "var(--term-mid)";
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "group relative flex flex-col bg-[var(--term-panel)] border border-[var(--term-dark)] hover:border-[var(--term-bright)] transition-colors cursor-pointer", style: { borderTopColor: accentColor, borderTopWidth: "2px" }, onClick: () => setOpen(true), children: [_jsxs("div", { className: "relative w-full bg-black overflow-hidden", style: { aspectRatio: "2/3" }, children: [film.poster_url ? (_jsx("img", { src: film.poster_url, alt: film.title, className: "w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity", onError: (e) => { e.target.style.display = "none"; } })) : (_jsx("div", { className: "w-full h-full flex items-center justify-center text-[var(--term-dark)] font-['VT323'] text-5xl", children: "?" })), _jsx("span", { className: "absolute top-2 left-2 text-[10px] font-mono bg-black/70 text-[var(--term-mid)] px-1.5 py-px leading-none", children: idx }), tier && film.niche_score != null && (_jsxs("span", { className: "absolute top-2 right-2 text-[9px] font-mono px-1.5 py-px leading-none", style: { color: tier.color, backgroundColor: "rgba(0,0,0,0.80)", border: `1px solid ${tier.color}` }, children: [tier.label, " ", film.niche_score, "/10"] }))] }), _jsxs("div", { className: "px-3 pt-2.5 pb-2", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("p", { className: "text-[var(--term-bright)] font-['VT323'] text-2xl leading-tight tracking-wide line-clamp-2 flex-1 min-w-0", children: film.title }), consensusStr && (_jsx("span", { className: "font-['VT323'] text-2xl leading-tight shrink-0", style: { color: consensusColor }, children: consensusStr }))] }), _jsxs("div", { className: "flex items-center gap-2 mt-1 flex-wrap", children: [film.year && (_jsx("span", { className: "text-xs font-mono text-[var(--term-mid)]", children: film.year })), film.director && (_jsx("span", { className: "text-[10px] font-mono text-[var(--term-dark)] truncate max-w-[120px]", children: film.director }))] }), film.niche_score != null && (_jsxs("div", { className: "flex items-center gap-1.5 mt-1.5", children: [_jsx("span", { className: "text-[9px] font-mono text-[var(--term-dark)] uppercase tracking-widest", children: "niche" }), _jsx("div", { className: "flex-1 h-px bg-[var(--term-dark)] relative max-w-[48px]", children: _jsx("div", { className: "absolute inset-y-0 left-0", style: { width: `${film.niche_score * 10}%`, backgroundColor: accentColor, opacity: 0.8 } }) }), _jsxs("span", { className: "text-[10px] font-mono", style: { color: accentColor }, children: [film.niche_score, "/10"] })] })), _jsxs("a", { href: imdbUrl, target: "_blank", rel: "noopener noreferrer", onClick: (e) => e.stopPropagation(), className: "inline-flex items-center gap-1 mt-2 text-[9px] font-mono text-[var(--term-dark)] hover:text-[var(--term-bright)] transition-colors", children: [_jsx("span", { className: "px-1 py-px border border-[var(--term-dark)] hover:border-[var(--term-bright)] transition-colors", children: "IMDb" }), _jsx("span", { children: "\u2197" })] })] })] }), open && (_jsx(FilmModal, { film: film, watchlistId: watchlistId, onAdded: onAdded, onClose: () => setOpen(false) }))] }));
}
