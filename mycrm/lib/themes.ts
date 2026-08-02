/**
 * Theme metadata — used by the Appearance picker (Settings → Appearance)
 * and by the day/night "Auto" resolver. The actual CSS variable values for
 * each theme live in app/globals.css as class selectors (.dark, .green-apple,
 * .ocean-glass) — the `id` below MUST match those class names exactly, since
 * next-themes applies `id` directly as the class on <html>.
 *
 * "light" has no CSS override block in globals.css — :root already is the
 * light theme, so it's the implicit default there.
 */

export type ThemeId = "light" | "dark" | "green-apple" | "ocean-glass";
export type ThemeChoice = ThemeId | "auto";

export interface ThemeDef {
  id: ThemeId;
  label: string;
  description: string;
  category: "light" | "dark";
  swatches: string[]; // small preview dots shown in the picker, background -> accent
}

export const THEMES: ThemeDef[] = [
  {
    id: "light",
    label: "Light",
    description: "Clean white background with the indigo brand accent.",
    category: "light",
    swatches: ["#ffffff", "#3730a3"],
  },
  {
    id: "dark",
    label: "Dark",
    description: "Deep navy background, brighter indigo accent for contrast.",
    category: "dark",
    swatches: ["#0d1220", "#6366f1"],
  },
  {
    id: "green-apple",
    label: "Green Apple",
    description: "Light background, green accent, a friendlier rounded font.",
    category: "light",
    swatches: ["#ffffff", "#16a34a"],
  },
  {
    id: "ocean-glass",
    label: "Ocean Glass",
    description: "Deep teal background with translucent, blurred glass cards.",
    category: "dark",
    swatches: ["#052430", "#06b6d4"],
  },
];

export const THEME_STORAGE_KEY = "cloudbox-theme-preference";

/** Local-clock day/night window used by "Auto" — 6am to 6pm counts as day. */
export function resolveAutoTheme(date: Date = new Date()): "light" | "dark" {
  const hour = date.getHours();
  return hour >= 6 && hour < 18 ? "light" : "dark";
}
