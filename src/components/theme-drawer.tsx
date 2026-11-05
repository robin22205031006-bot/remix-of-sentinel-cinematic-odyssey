import { Palette } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAppearance } from "@/hooks/use-appearance";
import { THEMES } from "@/lib/themes";

export function ThemeDrawer() {
  const { theme, setTheme, zoom, scaleIndex } = useAppearance();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button aria-label="Themes" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-accent hover:glow-ring">
          <Palette className="h-3.5 w-3.5" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader><SheetTitle className="font-display text-2xl">Themes</SheetTitle></SheetHeader>
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
          {THEMES.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left text-xs transition ${theme === t.id ? "border-accent glow-ring" : "hover:border-foreground/30"}`}
            >
              <span
                className="h-8 w-8 shrink-0 rounded-full"
                style={{ background: `conic-gradient(oklch(0.72 ${t.chroma} ${t.hue}), oklch(0.65 ${t.chroma} ${t.glow}), oklch(0.2 0.02 ${t.hue}), oklch(0.72 ${t.chroma} ${t.hue}))` }}
              />
              <span><span className="text-muted-foreground">{i + 1}.</span> {t.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 px-4 pb-6 text-sm">
          <span className="text-muted-foreground">Text size</span>
          <button className="rounded-full border px-3 py-1" onClick={() => zoom(-1)} aria-label="Zoom out">A−</button>
          <span className="w-8 text-center text-xs">{scaleIndex + 1}/6</span>
          <button className="rounded-full border px-3 py-1" onClick={() => zoom(1)} aria-label="Zoom in">A+</button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
