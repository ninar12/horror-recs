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
  },
  search: {
    query: (q: string) => client.get("/search", { params: { q } }),
    mood: (mood: string) => client.get("/search/mood", { params: { mood } }),
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
