import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { api } from "../api";
import { FilmCard } from "../components/FilmCard";
import { useAuth } from "../contexts/AuthContext";
export function WatchlistsPage() {
    const { loggedIn } = useAuth();
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
        setRandomFilm(res.data.film);
        setSpinning(false);
    };
    const removeItem = async (itemId) => {
        if (!watchlist)
            return;
        await api.watchlists.removeFilm(watchlist.id, itemId);
        load();
    };
    return (_jsx("div", { className: "h-full overflow-y-auto", children: _jsxs("div", { className: "max-w-3xl mx-auto px-4 py-10", children: [_jsxs("div", { className: "terminal-panel mb-8 border border-[var(--term-dark)] bg-[var(--term-panel)] p-5", children: [_jsx("div", { className: "text-[var(--term-bright)] font-['VT323'] text-5xl tracking-widest leading-none mb-1", children: "WATCHLIST" }), _jsx("div", { className: "text-[var(--term-mid)] text-xs", children: "// your saved horror films" })] }), loading && (_jsx("div", { className: "text-center text-[var(--term-mid)] py-10 text-sm", children: _jsx("span", { className: "cursor", children: "LOADING" }) })), !loading && !loggedIn && (_jsxs("div", { className: "text-center text-[var(--term-mid)] py-12 text-sm border border-[var(--term-dark)] bg-[var(--term-panel)] space-y-3", children: [_jsx("div", { children: "// login to save films to your watchlist" }), _jsx("div", { className: "text-[var(--term-dark)] text-xs", children: "click [LOGIN] in the top-right to get started" })] })), !loading && loggedIn && !watchlist && (_jsx("div", { className: "text-center text-[var(--term-mid)] py-10 text-sm border border-[var(--term-dark)] bg-[var(--term-panel)]", children: "// nothing saved yet \u00B7 open any film and hit + SAVE" })), !loading && loggedIn && watchlist && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center justify-between mb-4 border-b border-[var(--term-dark)] pb-3", children: [_jsxs("span", { className: "text-[var(--term-mid)] text-xs", children: ["// ", watchlist.items?.length ?? 0, " films saved"] }), _jsx("button", { onClick: spinRandom, disabled: spinning || !watchlist.items?.length, className: "px-4 py-2 border border-[var(--term-dark)] hover:border-[#cc2200] text-[var(--term-mid)] hover:text-[#cc2200] text-sm transition-colors disabled:opacity-30", children: spinning ? _jsx("span", { className: "cursor", children: "[RANDOMIZING]" }) : "[RANDOM PICK]" })] }), randomFilm && (_jsxs("div", { className: "mb-6 border border-[#cc2200]", children: [_jsx("div", { className: "px-4 py-2 text-xs text-[#cc2200] border-b border-[#cc2200] bg-[rgba(30,0,0,0.60)]", children: "// random pick" }), _jsx(FilmCard, { film: randomFilm })] })), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3", children: watchlist.items?.map((item, i) => (_jsxs("div", { className: "relative group", children: [_jsx(FilmCard, { film: { id: item.film_id, ...item.film_metadata, title: item.film_title }, index: i }), _jsx("button", { onClick: () => removeItem(item.id), className: "absolute top-1 left-1 bg-black/80 text-[#cc2200] text-[9px] font-mono px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black", children: "remove" })] }, item.id))) })] }))] }) }));
}
