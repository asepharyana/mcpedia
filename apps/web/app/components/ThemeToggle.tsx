"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mcpedia-theme";

/** Dark mode toggle — persisted in localStorage, defaults to system preference. */
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const initial =
      stored === "dark" ||
      (stored === null &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(initial);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="text-[#d0d6e0] hover:text-[#f7f8f8] p-1 rounded transition-colors"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
