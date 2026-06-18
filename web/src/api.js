import axios from "axios";
const API_BASE = import.meta.env.VITE_API_URL || "/api";
const client = axios.create({ baseURL: API_BASE });
client.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token)
        config.headers.Authorization = `Bearer ${token}`;
    return config;
});
export const api = {
    auth: {
        register: (email, password) => client.post("/auth/register", { email, password }),
        login: (email, password) => {
            const form = new FormData();
            form.append("username", email);
            form.append("password", password);
            return client.post("/auth/login", form);
        },
        me: () => client.get("/auth/me"),
    },
    history: {
        list: () => client.get("/history"),
        ids: () => client.get("/history/ids"),
        log: (body) => client.post("/history", body),
        remove: (filmId) => client.delete(`/history/${filmId}`),
    },
    search: {
        query: (q, opts) => client.get("/search", { params: { q, ...opts } }),
        mood: (mood, opts) => client.get("/search/mood", { params: { mood, ...opts } }),
        image: (file, opts) => {
            const form = new FormData();
            form.append("file", file);
            return client.post("/search/image", form, { params: opts });
        },
        similar: (film, opts) => client.post("/search/similar", film, { params: opts }),
    },
    watchlists: {
        list: () => client.get("/watchlists"),
        create: (name) => client.post("/watchlists", { name }),
        get: (id) => client.get(`/watchlists/${id}`),
        addFilm: (watchlistId, film) => client.post(`/watchlists/${watchlistId}/items`, film),
        removeFilm: (watchlistId, itemId) => client.delete(`/watchlists/${watchlistId}/items/${itemId}`),
    },
    random: {
        fromWatchlist: (watchlistId) => client.get(`/random/from-watchlist/${watchlistId}`),
        fromMood: (mood) => client.get("/random/from-mood", { params: { mood } }),
    },
};
