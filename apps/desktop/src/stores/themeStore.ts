import { create } from "zustand";

export type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  const saved = (typeof localStorage !== "undefined" &&
    localStorage.getItem("planme-theme")) as Theme | null;

  return {
    theme: saved || "dark",
    setTheme: (theme) => {
      set({ theme });
      localStorage.setItem("planme-theme", theme);
    },
    toggleTheme: () =>
      set((s) => {
        const next = s.theme === "dark" ? "light" : "dark";
        localStorage.setItem("planme-theme", next);
        return { theme: next };
      }),
  };
});
