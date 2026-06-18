import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";

interface HistoryEntry {
  id: string;
  film_id: string;
  film_title: string;
  rating: number | null;
  watched_at: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-[var(--term-dark)] bg-[var(--term-panel)] p-4 text-center">
      <div className="text-[var(--term-bright)] font-['VT323'] text-4xl">{value}</div>
      <div className="text-[var(--term-dark)] text-[10px] mt-1">{label}</div>
    </div>
  );
}

export function ProfilePage() {
  const { user, loggedIn, logout, watchedIds } = useAuth();
  const navigate = useNavigate();

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"history" | "stats">("history");

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
      const hist: HistoryEntry[] = histRes.data;
      setHistory(hist);

      const lists = listRes.data as Array<{ id: string; item_count: number }>;
      setWatchlistCount(lists.length);
      setSavedCount(lists.reduce((sum, l) => sum + l.item_count, 0));
    } finally {
      setLoading(false);
    }
  };

  if (!loggedIn) return null;

  const memberDays = user?.created_at
    ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000)
    : null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* Header */}
        <div className="border border-[var(--term-dark)] bg-[var(--term-panel)] p-5">
          <div className="text-[var(--term-bright)] font-['VT323'] text-5xl tracking-widest leading-none mb-1">
            PROFILE
          </div>
          <div className="text-[var(--term-mid)] text-xs mt-2 font-mono">{user?.email}</div>
          {memberDays !== null && (
            <div className="text-[var(--term-dark)] text-[10px] mt-1">
              // member since {formatDate(user?.created_at ?? null)} · {memberDays}d
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-[var(--term-dark)] flex items-center gap-3">
            <button
              onClick={() => { logout(); navigate("/"); }}
              className="text-xs border border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[#cc2200] hover:border-[#cc2200] px-3 py-1.5 transition-colors"
            >
              [LOGOUT]
            </button>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="FILMS WATCHED" value={watchedIds.size} />
            <StatBox label="SAVED TO LISTS" value={savedCount} />
            <StatBox label="WATCHLISTS" value={watchlistCount} />
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[var(--term-dark)]">
          {(["history", "stats"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-5 py-2.5 text-sm transition-colors border-r border-[var(--term-dark)] last:border-r-0 ${
                activeTab === t
                  ? "text-[var(--term-bright)] bg-[var(--term-bright-10)] border-b-[var(--term-bright)]"
                  : "text-[var(--term-mid)] hover:text-[var(--term-bright)]"
              }`}
            >
              {activeTab === t ? "> " : "  "}{t.toUpperCase()}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center text-[var(--term-mid)] py-10 text-sm">
            <span className="cursor">LOADING</span>
          </div>
        )}

        {/* Watch History Tab */}
        {!loading && activeTab === "history" && (
          <>
            {history.length === 0 ? (
              <div className="border border-[var(--term-dark)] bg-[var(--term-panel)] p-8 text-center">
                <div className="text-[var(--term-mid)] text-sm">// no films logged yet</div>
                <div className="text-[var(--term-dark)] text-xs mt-2">
                  open any film card and hit [WATCHED] to log it here
                </div>
                <Link
                  to="/"
                  className="mt-4 inline-block text-xs border border-[var(--term-bright)] text-[var(--term-bright)] px-4 py-2 hover:bg-[var(--term-bright-10)] transition-colors"
                >
                  [DISCOVER FILMS]
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-[var(--term-dark)] text-[10px] mb-3">
                  // {history.length} films logged
                </div>
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 border border-[var(--term-dark)] bg-[var(--term-panel)] px-4 py-3 hover:border-[var(--term-mid)] transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[var(--term-bright)] text-sm truncate font-mono">
                        {entry.film_title}
                      </div>
                      <div className="text-[var(--term-dark)] text-[10px] mt-0.5">
                        {formatDate(entry.watched_at)}
                      </div>
                    </div>
                    {entry.rating != null && (
                      <div className="text-[var(--term-mid)] text-xs font-mono shrink-0">
                        {entry.rating.toFixed(1)}★
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Stats Tab */}
        {!loading && activeTab === "stats" && (
          <div className="space-y-4">
            <div className="border border-[var(--term-dark)] bg-[var(--term-panel)] p-5">
              <div className="text-[var(--term-mid)] text-xs mb-4">// watching patterns</div>

              {history.length === 0 ? (
                <div className="text-[var(--term-dark)] text-sm text-center py-6">
                  // log some films to see stats
                </div>
              ) : (
                <>
                  {/* Watched per month */}
                  <WatchedChart history={history} />
                </>
              )}
            </div>

            <div className="border border-[var(--term-dark)] bg-[var(--term-panel)] p-5">
              <div className="text-[var(--term-mid)] text-xs mb-3">// quick links</div>
              <div className="space-y-2">
                <Link
                  to="/watchlists"
                  className="flex items-center gap-2 text-sm text-[var(--term-mid)] hover:text-[var(--term-bright)] transition-colors"
                >
                  <span className="text-[var(--term-dark)]">&gt;</span> manage watchlists
                  <span className="text-[var(--term-dark)] text-xs ml-auto">{watchlistCount} lists · {savedCount} films</span>
                </Link>
                <Link
                  to="/"
                  className="flex items-center gap-2 text-sm text-[var(--term-mid)] hover:text-[var(--term-bright)] transition-colors"
                >
                  <span className="text-[var(--term-dark)]">&gt;</span> discover more films
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** ASCII bar chart of films watched per month (last 6 months). */
function WatchedChart({ history }: { history: HistoryEntry[] }) {
  // Build month buckets
  const now = new Date();
  const months: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const count = history.filter((e) => (e.watched_at || "").startsWith(key)).length;
    months.push({ label, count });
  }
  const max = Math.max(...months.map((m) => m.count), 1);
  const BAR_MAX = 20;

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-[var(--term-dark)] mb-3">films watched / month (last 6mo)</div>
      {months.map((m) => {
        const width = Math.round((m.count / max) * BAR_MAX);
        return (
          <div key={m.label} className="flex items-center gap-3 text-xs font-mono">
            <span className="w-12 text-[var(--term-dark)] text-right">{m.label}</span>
            <span className="text-[var(--term-bright)]">
              {"█".repeat(width)}{"░".repeat(BAR_MAX - width)}
            </span>
            <span className="text-[var(--term-mid)] w-4 text-right">{m.count}</span>
          </div>
        );
      })}
    </div>
  );
}
