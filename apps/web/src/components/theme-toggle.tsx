"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "medium-dark" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load theme from localStorage (only in browser)
    if (typeof window !== "undefined") {
      try {
        const savedTheme = localStorage.getItem("theme") as Theme;
        if (savedTheme && ["light", "medium-dark", "dark"].includes(savedTheme)) {
          setTheme(savedTheme);
          document.documentElement.setAttribute("data-theme", savedTheme);
        }
      } catch (error) {
        console.warn("Could not access localStorage:", error);
      }
    }
  }, []);

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("theme", newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
      } catch (error) {
        console.warn("Could not save theme to localStorage:", error);
      }
    }
  };

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }

  return (
    <div className="flex items-center gap-1 rounded border theme-border theme-card p-1">
      <button
        onClick={() => changeTheme("light")}
        className={`rounded px-3 py-1.5 text-xs font-medium transition ${
          theme === "light"
            ? "bg-gray-900 text-white"
            : "theme-text-muted hover:theme-muted"
        }`}
        title="Light theme"
      >
        Light
      </button>
      <button
        onClick={() => changeTheme("medium-dark")}
        className={`rounded px-3 py-1.5 text-xs font-medium transition ${
          theme === "medium-dark"
            ? "bg-gray-900 text-white"
            : "theme-text-muted hover:theme-muted"
        }`}
        title="Medium dark theme"
      >
        Medium
      </button>
      <button
        onClick={() => changeTheme("dark")}
        className={`rounded px-3 py-1.5 text-xs font-medium transition ${
          theme === "dark"
            ? "bg-gray-900 text-white"
            : "theme-text-muted hover:theme-muted"
        }`}
        title="Dark theme"
      >
        Dark
      </button>
    </div>
  );
}
