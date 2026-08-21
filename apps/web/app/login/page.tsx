"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
      <div className="w-full max-w-md bg-[#0f1011] border border-[#1f2022] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Top decorative glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-[#5e6ad2]/20 blur-2xl pointer-events-none rounded-full" />

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#5e6ad2] text-white font-bold text-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#5e6ad2]/25">
            M
          </div>
          <h1 className="text-2xl font-bold text-[#f7f8f8] tracking-tight">Admin Authentication</h1>
          <p className="text-xs text-[#8a8f98] mt-1.5">
            Enter your admin password to create, edit, or delete documents.
          </p>
        </div>

        {error && (
          <div className="p-3.5 mb-6 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8a8f98] mb-1.5">
              Admin Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full px-3.5 py-2.5 bg-[#141517] border border-[#23252a] hover:border-[#383b42] rounded-lg text-sm text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] transition-colors"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-xs text-[#62666d] hover:text-[#d0d6e0]"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#5e6ad2] hover:bg-[#6a75e0] text-white rounded-lg transition-all font-medium text-sm shadow-md shadow-[#5e6ad2]/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{loading ? "Authenticating..." : "Sign In"}</span>
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#1a1b1d] flex items-center justify-between text-xs text-[#8a8f98]">
          <Link
            href="/"
            className="hover:text-[#d0d6e0] transition-colors"
          >
            ← Back to Home
          </Link>
          <span className="text-[11px] text-[#62666d]">HTTP-only Secure Cookie</span>
        </div>
      </div>
    </div>
  );
}
