"use client";

import { useEffect, useSyncExternalStore } from "react";

export type SimpleModeState = "on" | "off";

const SIMPLE_MODE_KEY = "simple-mode";
const SIMPLE_MODE_EVENT = "rowshni-simple-mode-change";

function getSimpleModeSnapshot(): SimpleModeState {
  if (typeof window === "undefined") {
    return "off";
  }
  try {
    const stored = window.localStorage.getItem(SIMPLE_MODE_KEY);
    if (stored === "on" || stored === "off") {
      return stored;
    }
    const attr = document.documentElement.getAttribute("data-simple-mode");
    return attr === "true" ? "on" : "off";
  } catch {
    const attr = document.documentElement.getAttribute("data-simple-mode");
    if (attr === "true") {
      return "on";
    }
    return "off";
  }
}

function subscribeToSimpleModeChanges(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === SIMPLE_MODE_KEY) {
      onStoreChange();
    }
  };

  const handleSimpleModeChange = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(SIMPLE_MODE_EVENT, handleSimpleModeChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SIMPLE_MODE_EVENT, handleSimpleModeChange);
  };
}

function updateSimpleMode(mode: SimpleModeState) {
  if (typeof window === "undefined") {
    return;
  }
  const isOn = mode === "on";
  document.documentElement.setAttribute("data-simple-mode", String(isOn));
  try {
    window.localStorage.setItem(SIMPLE_MODE_KEY, mode);
  } catch {
    // ignore persistence errors
  }
  window.dispatchEvent(new Event(SIMPLE_MODE_EVENT));
}

export function SimpleModeToggle() {
  const simpleMode = useSyncExternalStore(
    subscribeToSimpleModeChanges,
    getSimpleModeSnapshot,
    () => "off"
  );

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-simple-mode",
      String(simpleMode === "on")
    );
  }, [simpleMode]);

  return (
    <div className="flex items-center gap-1 rounded border theme-border theme-card p-1">
      <button
        onClick={() => updateSimpleMode("off")}
        className={`rounded px-3 py-1.5 text-xs font-medium transition ${
          simpleMode === "off"
            ? "bg-gray-900 text-white"
            : "theme-text-muted hover:opacity-70"
        }`}
        title="Standard mode"
      >
        Standard
      </button>
      <button
        onClick={() => updateSimpleMode("on")}
        className={`rounded px-3 py-1.5 text-xs font-medium transition ${
          simpleMode === "on"
            ? "bg-gray-900 text-white"
            : "theme-text-muted hover:opacity-70"
        }`}
        title="Simple mode"
      >
        Simple
      </button>
    </div>
  );
}
