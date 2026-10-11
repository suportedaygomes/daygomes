export type SiteTheme = "dark" | "light";

export const THEME_STORAGE_KEY = "daygomes-theme";

export function readStoredTheme(): SiteTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyThemeToDocument(theme: SiteTheme) {
  const root = document.documentElement;
  if (theme === "light") {
    root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
  }
  root.style.colorScheme = theme;
}
