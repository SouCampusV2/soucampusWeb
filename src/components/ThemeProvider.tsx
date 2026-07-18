"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
} | null>(null);

const listeners = new Set<() => void>();

// No real external event to subscribe to (no MutationObserver) — every
// caller of applyTheme() below notifies these listeners itself, right
// after it mutates the DOM.
function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

// The server has no DOM/localStorage — always "light" here. The blocking
// script in <head> (see layout.tsx) may have already added `.dark` to
// <html> by the time the client hydrates, so getSnapshot() and
// getServerSnapshot() can legitimately disagree on first read.
// useSyncExternalStore is built for exactly this: it renders
// getServerSnapshot() during hydration to match the server-rendered HTML
// (no mismatch warning), then re-renders with the real getSnapshot() value
// right after — without a manual setState-in-effect, which is its own
// lint error (see the previous fix this replaced).
function getServerSnapshot(): Theme {
  return "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem("theme", theme);
  listeners.forEach((notify) => notify());
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = useCallback(() => {
    applyTheme(theme === "dark" ? "light" : "dark");
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
