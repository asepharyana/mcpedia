"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Simple admin login form. POSTs password to /api/auth/login.
// On success, the API sets an HTTP-only cookie. We don't touch the cookie
// client-side (it's HttpOnly) — just redirect to /create after login.
export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
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
        throw new Error(data.error ?? "Login failed");
      }

      router.push("/create");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-light text-[#f7f8f8] mb-2">Admin Login</h1>
        <p className="text-[#8a8f98] text-sm mb-6">
          Enter your admin password to manage documents.
        </p>

        {error && (
          <div className="p-3 mb-4 rounded border border-[#274360] text-[#fca5a5] text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-[#0f1011] border border-[#23252a] rounded text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
              required
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-[#5e6ad2] text-white rounded hover:bg-[#7170ff] transition-colors disabled:opacity-50 font-medium text-sm"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-6">
          <Link
            href="/"
            className="text-sm text-[#8a8f98] hover:text-[#d0d6e0] transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
