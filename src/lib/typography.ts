// Admin-controlled typography engine. Settings live in app_settings['ui_typography']
// (public read, admin write) and are applied as CSS variables on <html>.

export type SectionKey = "characters" | "organizations" | "series" | "timeline";

export const SECTION_KEYS: { key: SectionKey; label: string }[] = [
  { key: "characters", label: "Characters" },
  { key: "organizations", label: "Organizations" },
  { key: "series", label: "Series" },
  { key: "timeline", label: "Timeline" },
];

export interface SectionStyle {
  /** CSS color for primary text in this view. */
  text?: string | undefined;
  /** CSS color for accent highlights in this view. */
  accent?: string | undefined;
}

export interface CustomFont {
  name: string;
  url: string;
}

export interface TypographySettings {
  bodyFont: string;
  displayFont: string;
  customFonts: CustomFont[];
  /** Multiplier on the user's zoom level (0.9 – 1.15). */
  baseScale: number;
  /** Font weight applied to h1–h4 headings (400–800). */
  headingWeight: number;
  sections: Record<SectionKey, SectionStyle>;
}

export const DEFAULT_TYPOGRAPHY: TypographySettings = {
  bodyFont: "Manrope",
  displayFont: "Cormorant Garamond",
  customFonts: [],
  baseScale: 1,
  headingWeight: 500,
  sections: {
    characters: {},
    organizations: {},
    series: {},
    timeline: {},
  },
};

/** Curated tactical / sci-fi faces offered in the admin picker. */
export const CURATED_FONTS = [
  // Sans / UI
  "Manrope", "Inter", "Space Grotesk", "IBM Plex Sans", "Saira", "Chakra Petch",
  "Rajdhani", "Exo 2", "Orbitron", "Michroma", "Share Tech Mono", "Major Mono Display",
  // Display / serif
  "Cormorant Garamond", "Playfair Display", "EB Garamond", "Cinzel", "Marcellus",
  "Unbounded", "Zen Dots", "Silkscreen",
] as const;

const SANS_FALLBACK = `system-ui, -apple-system, "Segoe UI", sans-serif`;
const SERIF_FALLBACK = `Georgia, "Times New Roman", serif`;

function isGoogleFont(name: string): boolean {
  return /^[A-Za-z0-9 ]+$/.test(name) && !name.includes("system");
}

function googleFontHref(name: string): string {
  const family = name.trim().replace(/\s+/g, "+");
  return `https://fonts.googleapis.com/css2?family=${family}:wght@300;400;500;600;700;800&display=swap`;
}

const loadedHrefs = new Set<string>();

/** Inject a stylesheet <link> once per href. */
export function ensureStylesheet(href: string): void {
  if (typeof document === "undefined" || loadedHrefs.has(href)) return;
  loadedHrefs.add(href);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

/** Load every font the settings reference (Google fonts + custom imports). */
export function loadTypographyFonts(s: TypographySettings): void {
  const families = new Set([s.bodyFont, s.displayFont]);
  for (const f of s.customFonts) if (f.name.trim()) families.add(f.name.trim());
  for (const name of families) {
    if (isGoogleFont(name)) ensureStylesheet(googleFontHref(name));
  }
  for (const f of s.customFonts) {
    if (f.url.trim()) ensureStylesheet(f.url.trim());
  }
}

/** Push the settings onto <html> as CSS variables. */
export function applyTypography(s: TypographySettings): void {
  if (typeof document === "undefined") return;
  loadTypographyFonts(s);
  const root = document.documentElement;
  const bodyStack = isGoogleFont(s.bodyFont) || s.customFonts.some((f) => f.name === s.bodyFont)
    ? `"${s.bodyFont}", ${SANS_FALLBACK}`
    : s.bodyFont;
  const displayStack = `"${s.displayFont}", ${SERIF_FALLBACK}`;
  root.style.setProperty("--font-sans", bodyStack);
  root.style.setProperty("--font-display", displayStack);
  root.style.setProperty("--scu-base-scale", String(Math.min(1.15, Math.max(0.85, s.baseScale))));
  root.style.setProperty("--scu-heading-weight", String(s.headingWeight));
  for (const { key } of SECTION_KEYS) {
    const sec = s.sections[key];
    if (sec.text) root.style.setProperty(`--scu-sec-${key}-text`, sec.text);
    else root.style.removeProperty(`--scu-sec-${key}-text`);
    if (sec.accent) root.style.setProperty(`--scu-sec-${key}-accent`, sec.accent);
    else root.style.removeProperty(`--scu-sec-${key}-accent`);
  }
}

/** Per-view inline vars consumed by route <main> elements via useSectionStyle. */
export function sectionStyleVars(s: TypographySettings, view: SectionKey): Record<string, string> {
  const sec = s.sections[view];
  const vars: Record<string, string> = {};
  if (sec.text) vars["--foreground"] = sec.text;
  if (sec.accent) {
    vars["--accent"] = sec.accent;
    vars["--ring"] = sec.accent;
  }
  return vars;
}
