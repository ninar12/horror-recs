import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { FilmCard } from "../components/FilmCard";
import { useAuth } from "../contexts/AuthContext";
function getNicheTier(score) {
    if (score >= 8)
        return { label: "DEEP CUT", color: "#cc44ff" };
    if (score >= 6)
        return { label: "CULT PICK", color: "#4488ff" };
    if (score >= 4)
        return { label: "HIDDEN GEM", color: "var(--term-bright)" };
    return null;
}
export function WatchlistsPage() {
    const { loggedIn } = useAuth();
    const navigate = useNavigate();
    const [watchlist, setWatchlist] = useState(null);
    const [randomFilm, setRandomFilm] = useState(null);
    const [spinning, setSpinning] = useState(false);
    const [loading, setLoading] = useState(true);
    const load = async () => {
        if (!loggedIn) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await api.watchlists.list();
            const lists = res.data;
            if (lists.length === 0) {
                setWatchlist(null);
            }
            else {
                const detail = await api.watchlists.get(lists[0].id);
                setWatchlist(detail.data);
            }
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, [loggedIn]);
    const spinRandom = async () => {
        if (!watchlist)
            return;
        setSpinning(true);
        setRandomFilm(null);
        const res = await api.random.fromWatchlist(watchlist.id);
        const f = res.data.film;
        if (f)
            setRandomFilm({ id: f.film_id, ...f.film_metadata, title: f.film_title });
        setSpinning(false);
    };
    const removeItem = async (itemId) => {
        if (!watchlist)
            return;
        await api.watchlists.removeFilm(watchlist.id, itemId);
        load();
    };
    return (_jsx("div", { className: "h-full overflow-y-auto", children: _jsxs("div", { className: "max-w-3xl mx-auto px-4 py-10", children: [_jsxs("div", { className: "terminal-panel mb-8 border border-[var(--term-dark)] bg-[var(--term-panel)] p-5", children: [_jsx("div", { className: "text-[var(--term-bright)] font-['VT323'] text-5xl tracking-widest leading-none mb-1", children: "WATCHLIST" }), _jsx("div", { className: "text-[var(--term-mid)] text-xs", children: "// your saved horror films" })] }), loading && (_jsx("div", { className: "text-center text-[var(--term-mid)] py-10 text-sm", children: _jsx("span", { className: "cursor", children: "LOADING" }) })), !loading && !loggedIn && (_jsxs("div", { className: "text-center text-[var(--term-mid)] py-12 text-sm border border-[var(--term-dark)] bg-[var(--term-panel)] space-y-3", children: [_jsx("div", { children: "// login to save films to your watchlist" }), _jsx("div", { className: "text-[var(--term-dark)] text-xs", children: "click [LOGIN] in the top-right to get started" })] })), !loading && loggedIn && !watchlist && (_jsx("div", { className: "text-center text-[var(--term-mid)] py-10 text-sm border border-[var(--term-dark)] bg-[var(--term-panel)]", children: "// nothing saved yet \u00B7 open any film and hit + SAVE" })), !loading && loggedIn && watchlist && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center justify-between mb-4 border-b border-[var(--term-dark)] pb-3", children: [_jsxs("span", { className: "text-[var(--term-mid)] text-sm", children: ["// ", watchlist.items?.length ?? 0, " films saved"] }), _jsx("button", { onClick: spinRandom, disabled: spinning || !watchlist.items?.length, className: "px-4 py-2 border border-[var(--term-dark)] hover:border-[#cc2200] text-[var(--term-mid)] hover:text-[#cc2200] text-sm transition-colors disabled:opacity-30", children: spinning ? _jsx("span", { className: "cursor", children: "[RANDOMIZING]" }) : "[RANDOM PICK]" })] }), randomFilm && (() => {
                            const tier = randomFilm.niche_score != null ? getNicheTier(randomFilm.niche_score) : null;
                            return (_jsxs("div", { className: "mb-5 border border-[#cc2200] bg-[rgba(30,0,0,0.5)]", children: [_jsx("div", { className: "px-3 py-1 text-[9px] font-mono text-[#cc2200] border-b border-[#cc2200] tracking-[0.2em] uppercase", children: "// random pick" }), _jsxs("div", { className: "flex items-center gap-3 p-3", children: [randomFilm.poster_url ? (_jsx("img", { src: randomFilm.poster_url, alt: randomFilm.title, className: "w-12 object-cover border border-[#cc2200]/40 shrink-0", style: { aspectRatio: "2/3" }, onError: (e) => { e.target.style.display = "none"; } })) : (_jsx("div", { className: "w-12 shrink-0 bg-black/60 border border-[#cc2200]/40 flex items-center justify-center text-[#cc2200] font-['VT323'] text-2xl", style: { aspectRatio: "2/3" }, children: "?" })), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-[var(--term-bright)] font-['VT323'] text-2xl leading-tight truncate", children: randomFilm.title }), _jsxs("div", { className: "flex items-center gap-2 mt-0.5", children: [randomFilm.year && _jsx("span", { className: "text-[10px] font-mono text-[var(--term-mid)]", children: randomFilm.year }), tier && (_jsx("span", { className: "text-[8px] font-mono px-1 py-px border", style: { color: tier.color, borderColor: tier.color }, children: tier.label }))] }), randomFilm.director && (_jsx("div", { className: "text-[9px] font-mono text-[var(--term-dark)] mt-0.5 truncate", children: randomFilm.director }))] }), _jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [_jsx("button", { onClick: () => navigate(`/film/${randomFilm.id}`, { state: { film: randomFilm } }), className: "text-[10px] font-mono px-2 py-1 border border-[#cc2200] text-[#cc2200] hover:bg-[#cc2200] hover:text-black transition-colors", children: "VIEW \u2192" }), _jsx("button", { onClick: () => setRandomFilm(null), className: "text-[10px] font-mono text-[var(--term-dark)] hover:text-[var(--term-bright)] transition-colors px-1", children: "\u2715" })] })] })] }));
                        })(), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3", children: watchlist.items?.map((item, i) => (_jsxs("div", { className: "relative group", children: [_jsx(FilmCard, { film: { id: item.film_id, ...item.film_metadata, title: item.film_title }, index: i }), _jsx("button", { onClick: () => removeItem(item.id), className: "absolute top-1 left-1 bg-black/80 text-[#cc2200] text-[9px] font-mono px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black", children: "remove" })] }, item.id))) })] }))] }) }));
}
