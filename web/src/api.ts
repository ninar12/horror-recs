import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const client = axios.create({ baseURL: API_BASE });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const api = {
  auth: {
    register: (email: string, password: string) =>
      client.post("/auth/register", { email, password }),
    login: (email: string, password: string) => {
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
    log: (body: { film_id: string; film_title: string; rating?: number }) =>
      client.post("/history", body),
    remove: (filmId: string) => client.delete(`/history/${filmId}`),
  },
  search: {
    query: (q: string, opts?: { niche_min?: number; niche_max?: number; exclude?: string }) =>
      client.get("/search", { params: { q, ...opts } }),
    mood: (mood: string, opts?: { niche_min?: number; niche_max?: number }) =>
      client.get("/search/mood", { params: { mood, ...opts } }),
    image: (file: File, opts?: { niche_min?: number; niche_max?: number }) => {
      const form = new FormData();
      form.append("file", file);
      return client.post("/search/image", form, { params: opts });
    },
    similar: (
      film: {
        film_id: string;
        title: string;
        synopsis?: string;
        genres?: string[];
        themes?: string[];
        atmosphere?: string;
      },
      opts?: { niche_min?: number }
    ) => client.post("/search/similar", film, { params: opts }),
  },
  watchlists: {
    list: () => client.get("/watchlists"),
    create: (name: string) => client.post("/watchlists", { name }),
    get: (id: string) => client.get(`/watchlists/${id}`),
    addFilm: (watchlistId: string, film: { film_id: string; film_title: string; film_metadata: object }) =>
      client.post(`/watchlists/${watchlistId}/items`, film),
    removeFilm: (watchlistId: string, itemId: string) =>
      client.delete(`/watchlists/${watchlistId}/items/${itemId}`),
  },
  random: {
    fromWatchlist: (watchlistId: string) =>
      client.get(`/random/from-watchlist/${watchlistId}`),
    fromMood: (mood: string) =>
      client.get("/random/from-mood", { params: { mood } }),
  },
};
