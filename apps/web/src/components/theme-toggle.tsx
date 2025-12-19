"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "medium-dark" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load theme from localStorage
    const savedTheme = localStorage.getItem("theme") as Theme;
    if (savedTheme && ["light", "medium-dark", "dark"].includes(savedTheme)) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }

  return (
    <div className="flex items-center gap-1 rounded border border-gray-300 bg-white p-1">
      <button
        onClick={() => changeTheme("light")}
        className={`rounded px-3 py-1.5 text-xs font-medium transition ${
          theme === "light"
            ? "bg-gray-900 text-white"
            : "text-gray-700 hover:bg-gray-100"
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
            : "text-gray-700 hover:bg-gray-100"
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
            : "text-gray-700 hover:bg-gray-100"
        }`}
        title="Dark theme"
      >
        Dark
      </button>
    </div>
  );
}
