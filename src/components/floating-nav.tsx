import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { TABS } from "@/lib/nav";
import { sfx } from "@/lib/scu-audio";

const LS_KEY = "scu-hud-nav";
export const hudNavEnabled = () => typeof window !== "undefined" && localStorage.getItem(LS_KEY) === "1";
export const setHudNav = (on: boolean) => { try { localStorage.setItem(LS_KEY, on ? "1" : "0"); } catch { /* noop */ } window.dispatchEvent(new Event("scu-hud-nav")); };

/** Floating circular HUD menu — radial fan-out nav, toggled from Appearance. */
export function FloatingNav() {
  const [enabled, setEnabled] = useState(hudNavEnabled);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const sync = () => setEnabled(hudNavEnabled());
    window.addEventListener("scu-hud-nav", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("scu-hud-nav", sync); window.removeEventListener("storage", sync); };
  }, []);

  if (!enabled) return null;
  const items = TABS;
  void nav; void pathname;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && items.map((item, i) => {
          const angle = -90 + (i - (items.length - 1) / 2) * 38;
          const rad = (angle * Math.PI) / 180;
          const x = Math.cos(rad) * 110;
          const y = Math.sin(rad) * 110;
          return (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
              animate={{ opacity: 1, scale: 1, x, y }}
              exit={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 22, delay: i * 0.03 }}
              className="absolute right-0 top-0"
            >
              <Link
                to={item.to}
                onClick={() => { sfx.pop(); setOpen(false); }}
                className="glass glow-ring flex h-14 w-14 items-center justify-center rounded-full text-xs font-semibold uppercase tracking-wide"
                aria-label={item.label}
              >
                {item.label.slice(0, 2)}
              </Link>
            </motion.div>
          );
        })}
      </AnimatePresence>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => { sfx.click(); setOpen((o) => !o); }}
        aria-label={open ? "Close menu" : "Open menu"}
        className="glass glow-ring grid h-14 w-14 place-items-center rounded-full text-xl"
      >
        {open ? "✕" : "◉"}
      </motion.button>
    </div>
  );
}
