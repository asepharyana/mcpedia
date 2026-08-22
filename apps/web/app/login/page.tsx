"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Key, Eye, EyeOff, ArrowLeft, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Invalid password. Check ADMIN_PASSWORD.");
      }

      router.push("/create");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[65vh] items-center justify-center px-4">
      <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Top decorative glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-indigo-500/20 blur-2xl pointer-events-none rounded-full" />

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-700 text-white font-bold text-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/25">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Admin Vault Authentication</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">
            Enter your admin password to manage documents and trigger schema mutations.
          </p>
        </div>

        {error && (
          <div className="p-3.5 mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 dark:text-rose-400 text-xs font-medium animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 font-mono">
              Admin Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full pl-10 pr-10 py-3 bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[var(--brand)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 transition-all"
                required
                autoFocus
              />
              <Key className="w-4 h-4 text-[var(--text-dim)] absolute left-3.5 top-3.5 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white rounded-xl transition-all font-semibold text-sm shadow-md shadow-[var(--brand)]/20 hover:shadow-[var(--brand)]/35 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{loading ? "Authenticating Session..." : "Authorize Access"}</span>
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <Link
            href="/"
            className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Knowledge Base</span>
          </Link>
          <span className="text-[11px] text-[var(--text-dim)] font-mono">Secure HTTP Cookie</span>
        </div>
      </div>
    </div>
  );
}
