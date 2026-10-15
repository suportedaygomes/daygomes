export type SiteTheme = "dark" | "light";

export const THEME_STORAGE_KEY = "daygomes-theme";

const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

export function parseThemeCookie(value: string | undefined | null): SiteTheme {
  return value === "light" ? "light" : "dark";
}

/** Persiste tema para o layout no servidor (sem script inline). */
export function writeThemeCookie(theme: SiteTheme) {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${THEME_STORAGE_KEY}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

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
