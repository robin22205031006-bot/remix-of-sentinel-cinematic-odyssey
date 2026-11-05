// Theme engine: each preset sets CSS custom properties on <html> without reload.

export interface ThemePreset {
  id: string;
  label: string;
  /** Accent hue (oklch degrees) and chroma; base surfaces tint toward the hue. */
  hue: number;
  chroma: number;
  /** Secondary glow hue for gradients. */
  glow: number;
  /** Minimal = calm editorial look, no glass/glow. */
  minimal?: boolean;
}

export const THEMES: ThemePreset[] = [
  { id: "ancient", label: "Ancient · Ethereal Rune", hue: 85, chroma: 0.12, glow: 160 },
  { id: "modern", label: "Modern · Neon Agency", hue: 200, chroma: 0.16, glow: 320 },
  { id: "evil", label: "Evil · Crimson Haze", hue: 22, chroma: 0.2, glow: 350 },
  { id: "darkness", label: "Darkness · Midnight Abyss", hue: 265, chroma: 0.12, glow: 230 },
  { id: "healing", label: "Healing · Jade Whisper", hue: 160, chroma: 0.13, glow: 120 },
  { id: "wind", label: "Wind · Aero Tempest", hue: 215, chroma: 0.09, glow: 180 },
  { id: "power", label: "Power · Velvet Twilight", hue: 300, chroma: 0.15, glow: 20 },
  { id: "aggression", label: "Aggression · Marple Apex", hue: 40, chroma: 0.18, glow: 10 },
  { id: "blackops", label: "Black Ops · H.A.W.K.S.", hue: 135, chroma: 0.1, glow: 95 },
  { id: "astral", label: "Astral Lagoon · Cosmic Mirage", hue: 245, chroma: 0.14, glow: 185 },
  { id: "minimal", label: "Minimal · Editorial", hue: 70, chroma: 0.11, glow: 70, minimal: true },
  { id: "dune", label: "Dune · Spice Sands", hue: 60, chroma: 0.13, glow: 35 },
  { id: "magic", label: "Magic · Arcane Bloom", hue: 325, chroma: 0.17, glow: 280 },
  { id: "thunder", label: "Thunder · Storm Crown", hue: 95, chroma: 0.17, glow: 250 },
  { id: "frost", label: "Frost · Glacier Vow", hue: 225, chroma: 0.07, glow: 200 },
  { id: "inferno", label: "Inferno · Ember Core", hue: 45, chroma: 0.2, glow: 25 },
];

export const DEFAULT_THEME = "blackops";

const c = (l: number, ch: number, h: number, a?: number) =>
  `oklch(${l} ${ch} ${h}${a !== undefined ? ` / ${a}` : ""})`;

export function themeVars(t: ThemePreset, dark: boolean): Record<string, string> {
  const h = t.hue;
  const tint = t.minimal ? 0.012 : 0.02;
  const accent = c(dark ? 0.76 : 0.6, t.chroma, h);
  const glow = c(dark ? 0.7 : 0.62, t.chroma, t.glow);
  const base = dark
    ? {
        "--background": c(t.minimal ? 0.17 : 0.13, tint, h),
        "--foreground": c(0.94, 0.01, h),
        "--card": c(t.minimal ? 0.21 : 0.18, tint, h, t.minimal ? 1 : 0.62),
        "--popover": c(0.19, tint, h),
        "--primary": accent,
        "--primary-foreground": c(0.14, 0.02, h),
        "--secondary": c(0.24, tint, h, 0.8),
        "--muted": c(0.24, tint, h),
        "--muted-foreground": c(0.68, 0.02, h),
        "--border": c(1, 0, 0, t.minimal ? 0.09 : 0.11),
        "--input": c(1, 0, 0, 0.14),
      }
    : {
        "--background": c(0.97, 0.01, h),
        "--foreground": c(0.2, 0.02, h),
        "--card": c(0.99, 0.006, h, t.minimal ? 1 : 0.7),
        "--popover": c(0.99, 0.006, h),
        "--primary": t.minimal ? c(0.22, 0.02, h) : accent,
        "--primary-foreground": c(0.98, 0.005, h),
        "--secondary": c(0.93, 0.015, h, 0.85),
        "--muted": c(0.93, 0.015, h),
        "--muted-foreground": c(0.48, 0.02, h),
        "--border": c(0.2, 0.02, h, 0.12),
        "--input": c(0.2, 0.02, h, 0.16),
      };
  return {
    ...base,
    "--card-foreground": base["--foreground"],
    "--popover-foreground": base["--foreground"],
    "--secondary-foreground": base["--foreground"],
    "--accent": accent,
    "--accent-foreground": c(0.14, 0.02, h),
    "--ring": accent,
    "--glow": glow,
    "--glow-strength": t.minimal ? "0" : "1",
    "--glass-blur": t.minimal ? "0px" : "18px",
  };
}

export const FONT_SCALES = [0.875, 0.9375, 1, 1.0625, 1.125, 1.25];
