import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";
function formatDate(iso) {
    if (!iso)
        return "—";
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function StatBox({ label, value }) {
    return (_jsxs("div", { className: "border border-[var(--term-dark)] bg-[var(--term-panel)] p-4 text-center", children: [_jsx("div", { className: "text-[var(--term-bright)] font-['VT323'] text-4xl", children: value }), _jsx("div", { className: "text-[var(--term-dark)] text-[10px] mt-1", children: label })] }));
}
export function ProfilePage() {
    const { user, loggedIn, logout, watchedIds } = useAuth();
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [watchlistCount, setWatchlistCount] = useState(0);
    const [savedCount, setSavedCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("history");
    useEffect(() => {
        if (!loggedIn) {
            navigate("/");
            return;
        }
        load();
    }, [loggedIn]);
    const load = async () => {
        setLoading(true);
        try {
            const [histRes, listRes] = await Promise.all([
                api.history.list(),
                api.watchlists.list(),
            ]);
            const hist = histRes.data;
            setHistory(hist);
            const lists = listRes.data;
            setWatchlistCount(lists.length);
            setSavedCount(lists.reduce((sum, l) => sum + l.item_count, 0));
        }
        finally {
            setLoading(false);
        }
    };
    if (!loggedIn)
        return null;
    const memberDays = user?.created_at
        ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000)
        : null;
    return (_jsx("div", { className: "h-full overflow-y-auto", children: _jsxs("div", { className: "max-w-3xl mx-auto px-4 py-10 space-y-6", children: [_jsxs("div", { className: "border border-[var(--term-dark)] bg-[var(--term-panel)] p-5", children: [_jsx("div", { className: "text-[var(--term-bright)] font-['VT323'] text-5xl tracking-widest leading-none mb-1", children: "PROFILE" }), _jsx("div", { className: "text-[var(--term-mid)] text-xs mt-2 font-mono", children: user?.email }), memberDays !== null && (_jsxs("div", { className: "text-[var(--term-dark)] text-[10px] mt-1", children: ["// member since ", formatDate(user?.created_at ?? null), " \u00B7 ", memberDays, "d"] })), _jsx("div", { className: "mt-4 pt-4 border-t border-[var(--term-dark)] flex items-center gap-3", children: _jsx("button", { onClick: () => { logout(); navigate("/"); }, className: "text-xs border border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[#cc2200] hover:border-[#cc2200] px-3 py-1.5 transition-colors", children: "[LOGOUT]" }) })] }), !loading && (_jsxs("div", { className: "grid grid-cols-3 gap-3", children: [_jsx(StatBox, { label: "FILMS WATCHED", value: watchedIds.size }), _jsx(StatBox, { label: "SAVED TO LISTS", value: savedCount }), _jsx(StatBox, { label: "WATCHLISTS", value: watchlistCount })] })), _jsx("div", { className: "flex border-b border-[var(--term-dark)]", children: ["history", "stats"].map((t) => (_jsxs("button", { onClick: () => setActiveTab(t), className: `px-5 py-2.5 text-sm transition-colors border-r border-[var(--term-dark)] last:border-r-0 ${activeTab === t
                            ? "text-[var(--term-bright)] bg-[var(--term-bright-10)] border-b-[var(--term-bright)]"
                            : "text-[var(--term-mid)] hover:text-[var(--term-bright)]"}`, children: [activeTab === t ? "> " : "  ", t.toUpperCase()] }, t))) }), loading && (_jsx("div", { className: "text-center text-[var(--term-mid)] py-10 text-sm", children: _jsx("span", { className: "cursor", children: "LOADING" }) })), !loading && activeTab === "history" && (_jsx(_Fragment, { children: history.length === 0 ? (_jsxs("div", { className: "border border-[var(--term-dark)] bg-[var(--term-panel)] p-8 text-center", children: [_jsx("div", { className: "text-[var(--term-mid)] text-sm", children: "// no films logged yet" }), _jsx("div", { className: "text-[var(--term-dark)] text-xs mt-2", children: "open any film card and hit [WATCHED] to log it here" }), _jsx(Link, { to: "/", className: "mt-4 inline-block text-xs border border-[var(--term-bright)] text-[var(--term-bright)] px-4 py-2 hover:bg-[var(--term-bright-10)] transition-colors", children: "[DISCOVER FILMS]" })] })) : (_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "text-[var(--term-dark)] text-[10px] mb-3", children: ["// ", history.length, " films logged"] }), history.map((entry) => (_jsxs("div", { className: "flex items-center gap-3 border border-[var(--term-dark)] bg-[var(--term-panel)] px-4 py-3 hover:border-[var(--term-mid)] transition-colors group", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-[var(--term-bright)] text-sm truncate font-mono", children: entry.film_title }), _jsx("div", { className: "text-[var(--term-dark)] text-[10px] mt-0.5", children: formatDate(entry.watched_at) })] }), entry.rating != null && (_jsxs("div", { className: "text-[var(--term-mid)] text-xs font-mono shrink-0", children: [entry.rating.toFixed(1), "\u2605"] }))] }, entry.id)))] })) })), !loading && activeTab === "stats" && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "border border-[var(--term-dark)] bg-[var(--term-panel)] p-5", children: [_jsx("div", { className: "text-[var(--term-mid)] text-xs mb-4", children: "// watching patterns" }), history.length === 0 ? (_jsx("div", { className: "text-[var(--term-dark)] text-sm text-center py-6", children: "// log some films to see stats" })) : (_jsx(_Fragment, { children: _jsx(WatchedChart, { history: history }) }))] }), _jsxs("div", { className: "border border-[var(--term-dark)] bg-[var(--term-panel)] p-5", children: [_jsx("div", { className: "text-[var(--term-mid)] text-xs mb-3", children: "// quick links" }), _jsxs("div", { className: "space-y-2", children: [_jsxs(Link, { to: "/watchlists", className: "flex items-center gap-2 text-sm text-[var(--term-mid)] hover:text-[var(--term-bright)] transition-colors", children: [_jsx("span", { className: "text-[var(--term-dark)]", children: ">" }), " manage watchlists", _jsxs("span", { className: "text-[var(--term-dark)] text-xs ml-auto", children: [watchlistCount, " lists \u00B7 ", savedCount, " films"] })] }), _jsxs(Link, { to: "/", className: "flex items-center gap-2 text-sm text-[var(--term-mid)] hover:text-[var(--term-bright)] transition-colors", children: [_jsx("span", { className: "text-[var(--term-dark)]", children: ">" }), " discover more films"] })] })] })] }))] }) }));
}
/** ASCII bar chart of films watched per month (last 6 months). */
function WatchedChart({ history }) {
    // Build month buckets
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const count = history.filter((e) => (e.watched_at || "").startsWith(key)).length;
        months.push({ label, count });
    }
    const max = Math.max(...months.map((m) => m.count), 1);
    const BAR_MAX = 20;
    return (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "text-[10px] text-[var(--term-dark)] mb-3", children: "films watched / month (last 6mo)" }), months.map((m) => {
                const width = Math.round((m.count / max) * BAR_MAX);
                return (_jsxs("div", { className: "flex items-center gap-3 text-xs font-mono", children: [_jsx("span", { className: "w-12 text-[var(--term-dark)] text-right", children: m.label }), _jsxs("span", { className: "text-[var(--term-bright)]", children: ["█".repeat(width), "░".repeat(BAR_MAX - width)] }), _jsx("span", { className: "text-[var(--term-mid)] w-4 text-right", children: m.count })] }, m.label));
            })] }));
}
