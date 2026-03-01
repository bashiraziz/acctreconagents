"use client";

import { useEffect, useSyncExternalStore } from "react";

export type Theme = "light" | "medium-dark" | "dark";
const DEFAULT_THEME: Theme = "light";
const THEME_STORAGE_KEY = "theme";
const THEME_CHANGE_EVENT = "rowshni-theme-change";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "medium-dark" || value === "dark";
}

function getThemeSnapshot(): Theme {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }

  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(savedTheme)) {
      return savedTheme;
    }
    const attrTheme = document.documentElement.getAttribute("data-theme");
    return isTheme(attrTheme) ? attrTheme : DEFAULT_THEME;
  } catch {
    const attrTheme = document.documentElement.getAttribute("data-theme");
    if (isTheme(attrTheme)) {
      return attrTheme;
    }
    return DEFAULT_THEME;
  }
}

function subscribeToThemeChanges(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === THEME_STORAGE_KEY) {
      onStoreChange();
    }
  };

  const handleThemeChange = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  };
}

function updateTheme(theme: Theme) {
  if (typeof window === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-theme", theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage is optional; keep theme applied even if persistence fails
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeToThemeChanges,
    getThemeSnapshot,
    () => DEFAULT_THEME
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <div className="flex items-center gap-1 rounded border theme-border theme-card p-1">
      <button
        onClick={() => updateTheme("light")}
        className={`btn btn-sm ${theme === "light" ? "btn-primary" : "btn-secondary"}`}
        title="Light theme"
      >
        Light
      </button>
      <button
        onClick={() => updateTheme("medium-dark")}
        className={`btn btn-sm ${theme === "medium-dark" ? "btn-primary" : "btn-secondary"}`}
        title="Medium dark theme"
      >
        Medium
      </button>
      <button
        onClick={() => updateTheme("dark")}
        className={`btn btn-sm ${theme === "dark" ? "btn-primary" : "btn-secondary"}`}
        title="Dark theme"
      >
        Dark
      </button>
    </div>
  );
}
