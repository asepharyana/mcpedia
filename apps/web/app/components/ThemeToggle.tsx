"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mcpedia-theme";

/** Dark mode toggle. Defaults to system preference, persisted in localStorage. */
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const initial =
      stored === "dark" ||
      (stored === null &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(initial);
    apply(initial);
  }, []);

  function apply(isDark: boolean) {
    document.documentElement.classList.toggle("dark", isDark);
  }

  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    apply(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="text-sm border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      {dark ? "🌙" : "☀️"}
    </button>
  );
}
