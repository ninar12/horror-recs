import { useState } from "react";
import { api } from "../api";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = tab === "login"
        ? await api.auth.login(email, password)
        : await api.auth.register(email, password);
      localStorage.setItem("token", res.data.access_token);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-sm bg-[var(--term-panel)] border border-[var(--term-bright)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tabs */}
        <div className="flex border-b border-[var(--term-dark)]">
          {(["login", "register"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); }}
              className={`flex-1 py-3 text-sm transition-colors border-r last:border-r-0 border-[var(--term-dark)] ${
                tab === t
                  ? "text-[var(--term-bright)] bg-[var(--term-bright-10)]"
                  : "text-[var(--term-mid)] hover:text-[var(--term-bright)]"
              }`}
            >
              {tab === t ? "> " : "  "}{t.toUpperCase()}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="p-5 space-y-3">
          <div className="text-[var(--term-dark)] text-[10px] mb-2">
            root@reelscream:~$ {tab === "login" ? "auth login" : "auth register"}
          </div>

          <div>
            <div className="text-[var(--term-dark)] text-[10px] mb-1">EMAIL</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full bg-black border border-[var(--term-dark)] text-[var(--term-bright)] px-2 py-2 text-sm focus:outline-none focus:border-[var(--term-bright)]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="text-[var(--term-dark)] text-[10px] mb-1">PASSWORD</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-black border border-[var(--term-dark)] text-[var(--term-bright)] px-2 py-2 text-sm focus:outline-none focus:border-[var(--term-bright)]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-[#cc2200] text-xs font-mono">// {error}</div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 border border-[var(--term-bright)] text-[var(--term-bright)] hover:bg-[var(--term-bright-10)] text-sm disabled:opacity-40 transition-colors"
            >
              {loading ? <span className="cursor">AUTHENTICATING</span> : `[${tab === "login" ? "LOGIN" : "REGISTER"}]`}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-[var(--term-dark)] text-[var(--term-mid)] hover:text-[var(--term-bright)] text-sm transition-colors"
            >
              [ESC]
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
