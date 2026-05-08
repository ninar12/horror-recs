import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { api } from "../api";
import { FilmCard } from "../components/FilmCard";
export function WatchlistsPage() {
    const [watchlists, setWatchlists] = useState([]);
    const [selected, setSelected] = useState(null);
    const [newName, setNewName] = useState("");
    const [randomFilm, setRandomFilm] = useState(null);
    const [spinning, setSpinning] = useState(false);
    const loadWatchlists = async () => {
        const res = await api.watchlists.list();
        setWatchlists(res.data);
    };
    const loadSelected = async (id) => {
        const res = await api.watchlists.get(id);
        setSelected(res.data);
    };
    useEffect(() => { loadWatchlists(); }, []);
    const createList = async () => {
        if (!newName.trim())
            return;
        await api.watchlists.create(newName.trim());
        setNewName("");
        loadWatchlists();
    };
    const spinRandom = async () => {
        if (!selected)
            return;
        setSpinning(true);
        setRandomFilm(null);
        const res = await api.random.fromWatchlist(selected.id);
        setRandomFilm(res.data.film);
        setSpinning(false);
    };
    return (_jsxs("div", { className: "max-w-3xl mx-auto px-4 py-10", children: [_jsxs("div", { className: "terminal-panel mb-8 border border-[var(--term-dark)] bg-[var(--term-panel)] p-5", children: [_jsx("div", { className: "text-[var(--term-bright)] font-['VT323'] text-5xl tracking-widest leading-none mb-1", children: "WATCHLISTS" }), _jsx("div", { className: "text-[var(--term-mid)] text-xs", children: "// your personal horror archives" })] }), _jsxs("div", { className: "flex border border-[var(--term-dark)] bg-[var(--term-panel)] mb-6", children: [_jsx("span", { className: "px-3 py-3 text-[var(--term-bright)] text-sm select-none border-r border-[var(--term-dark)]", children: "mkdir" }), _jsx("input", { value: newName, onChange: (e) => setNewName(e.target.value), onKeyDown: (e) => e.key === "Enter" && createList(), placeholder: "new_list_name", className: "flex-1 bg-transparent text-[var(--term-bright)] px-3 py-3 text-sm placeholder:text-[var(--term-dark)] focus:outline-none" }), _jsx("button", { onClick: createList, className: "px-4 py-3 border-l border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] text-sm transition-colors", children: "[CREATE]" })] }), _jsxs("div", { className: "flex flex-col gap-1 mb-8", children: [watchlists.length === 0 && (_jsx("div", { className: "text-[var(--term-mid)] text-xs py-4 text-center border border-[var(--term-dark)] bg-[var(--term-panel-light)]", children: "// no archives found \u00B7 create one above" })), watchlists.map((wl) => (_jsxs("button", { onClick: () => loadSelected(wl.id), className: `text-left px-4 py-2.5 border transition-colors text-sm ${selected?.id === wl.id
                            ? "border-[var(--term-bright)] bg-[var(--term-bright-10)] text-[var(--term-bright)]"
                            : "border-[var(--term-dark)] bg-[var(--term-panel-light)] text-[var(--term-mid)] hover:text-[var(--term-bright)] hover:border-[var(--term-bright)]"}`, children: [_jsx("span", { className: "text-[var(--term-dark)] mr-2", children: selected?.id === wl.id ? ">" : " " }), "drwxr-xr-x", " ", _jsxs("span", { className: "text-[var(--term-bright)]", children: [wl.name, "/"] }), _jsxs("span", { className: "text-[var(--term-dark)] ml-3 text-xs", children: [wl.item_count, " records"] })] }, wl.id)))] }), selected && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center justify-between mb-4 border-b border-[var(--term-dark)] pb-3", children: [_jsxs("div", { children: [_jsxs("span", { className: "text-[var(--term-bright)] font-['VT323'] text-3xl", children: [selected.name, "/"] }), _jsxs("span", { className: "text-[var(--term-mid)] text-xs ml-3", children: ["// ", selected.items?.length ?? 0, " records"] })] }), _jsx("button", { onClick: spinRandom, disabled: spinning || !selected.items?.length, className: "px-4 py-2 border border-[var(--term-dark)] hover:border-[#cc2200] text-[var(--term-mid)] hover:text-[#cc2200] text-sm transition-colors disabled:opacity-30", children: spinning ? _jsx("span", { className: "cursor", children: "[RANDOMIZING]" }) : "[RANDOM_PICK]" })] }), randomFilm && (_jsxs("div", { className: "mb-6 border border-[#cc2200]", children: [_jsxs("div", { className: "px-4 py-2 text-xs text-[#cc2200] border-b border-[#cc2200] bg-[rgba(30,0,0,0.60)]", children: ["// SELECTED: random pick from ", selected.name] }), _jsx(FilmCard, { film: randomFilm })] })), _jsx("div", { className: "flex flex-col gap-2", children: selected.items?.map((item, i) => (_jsx(FilmCard, { film: { id: item.film_id, ...item.film_metadata, title: item.film_title }, index: i }, item.id))) })] }))] }));
}
