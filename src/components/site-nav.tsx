import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookMarked, Bot, Castle, Clock, FileLock, Home, LogOut, Map as MapIcon, MessagesSquare, Network, Shield, Sparkles, Users, Volume2, VolumeX, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useIsStaff, useSession } from "@/hooks/use-admin";
import { useScuMute } from "@/hooks/use-scu-audio";
import { useAppearance } from "@/hooks/use-appearance";
import { supabase } from "@/integrations/supabase/client";
import { STAFF_TAB, TABS, tabIndex } from "@/lib/nav";
import { DayNightToggle } from "./day-night-toggle";
import { ThemeDrawer } from "./theme-drawer";
import { UniversalSearch } from "./universal-search";

const ICONS = { home: Home, orgs: Shield, chars: Users, series: BookMarked, time: Clock, map: MapIcon, graph: Network, clans: Castle, fandom: MessagesSquare, ai: Bot, vault: FileLock, admin: Sparkles };

export function SiteNav() {
  const isStaff = useIsStaff();
  const { data: user } = useSession();
  const { muted, toggleMute } = useScuMute();
  const { zoom } = useAppearance();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const tabs = useMemo(() => (isStaff ? [...TABS, STAFF_TAB] : [...TABS]), [isStaff]);
  const active = tabIndex(pathname, tabs);
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const el = refs.current[active];
    if (el) {
      setPill({ left: el.offsetLeft, width: el.offsetWidth });
      el.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }
  }, [active, tabs.length]);

  // Swipe left/right anywhere to move between adjacent tabs.
  useEffect(() => {
    let sx = 0, sy = 0, skip = false;
    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      sx = t.clientX; sy = t.clientY;
      skip = e.touches.length !== 1 || !(e.target instanceof Element) || !!e.target.closest("[data-no-swipe], input, textarea, select, [role=dialog]");
    };
    const end = (e: TouchEvent) => {
      if (skip) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
      const next = tabs[active + (dx < 0 ? 1 : -1)];
      if (active >= 0 && next) nav({ to: next.to });
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchend", end, { passive: true });
    return () => { window.removeEventListener("touchstart", start); window.removeEventListener("touchend", end); };
  }, [active, tabs, nav]);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };

  const progress = tabs.length > 1 && active >= 0 ? (active / (tabs.length - 1)) * 100 : 0;

  return (
    <nav className="fixed inset-x-0 top-3 z-40 flex flex-col items-center gap-1.5 px-2">
      <div className="glass glow-ring flex max-w-full items-center gap-0.5 rounded-full px-1.5 py-1.5">
        <div className="relative flex items-center overflow-x-auto [scrollbar-width:none]">
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-secondary transition-[transform,opacity,width] duration-500 ease-[cubic-bezier(.2,.8,.2,1)] will-change-transform"
            style={{ transform: `translateX(${pill.left}px)`, width: pill.width, opacity: active >= 0 ? 1 : 0 }}
          />
          {tabs.map((t, i) => {
            const Icon = ICONS[t.icon];
            const on = i === active;
            return (
              <Link
                key={t.to}
                to={t.to}
                ref={(el) => { refs.current[i] = el; }}
                className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className={`h-3.5 w-3.5 ${on ? "text-accent" : ""}`} />
                <span className={on ? "" : "hidden md:inline"}>{t.label}</span>
                {on && <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent glow-ring" />}
              </Link>
            );
          })}
        </div>
        <span className="mx-1 h-4 w-px bg-border" />
        <UniversalSearch />
        <ThemeDrawer />
        <button aria-label="Zoom out text" onClick={() => zoom(-1)} className="hidden h-7 w-7 place-items-center rounded-full text-muted-foreground hover:text-foreground sm:grid"><ZoomOut className="h-3.5 w-3.5" /></button>
        <button aria-label="Zoom in text" onClick={() => zoom(1)} className="hidden h-7 w-7 place-items-center rounded-full text-muted-foreground hover:text-foreground sm:grid"><ZoomIn className="h-3.5 w-3.5" /></button>
        <DayNightToggle />
        <button
          aria-label={muted ? "Unmute sounds" : "Mute sounds"}
          title={muted ? "Unmute" : "Mute"}
          onClick={toggleMute}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground"
        >
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
        {user ? (
          <button aria-label="Sign out" onClick={signOut} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground"><LogOut className="h-3.5 w-3.5" /></button>
        ) : (
          <Link to="/auth" className="whitespace-nowrap rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Sign in</Link>
        )}
      </div>
      <div className="h-0.5 w-40 overflow-hidden rounded-full bg-border" aria-hidden>
        <div className="h-full w-full origin-left rounded-full bg-accent transition-transform duration-500" style={{ transform: `scaleX(${Math.max(progress, 6)}%)` }} />
      </div>
    </nav>
  );
}
