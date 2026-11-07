import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { TABS } from "@/lib/nav";
import { sfx } from "@/lib/scu-audio";
import { useNavHidden } from "@/lib/nav-visibility";

const LS_KEY = "scu-nav-mode";
export type NavMode = "standard" | "hud";
export const navMode = (): NavMode => {
  if (typeof window === "undefined") return "standard";
  const v = localStorage.getItem(LS_KEY);
  if (v === "1") return "hud"; // legacy boolean
  return v === "hud" ? "hud" : "standard";
};
export const setNavMode = (m: NavMode) => {
  try { localStorage.setItem(LS_KEY, m); } catch { /* noop */ }
  window.dispatchEvent(new Event("scu-nav-mode"));
};
// Back-compat helpers used by the Appearance drawer.
export const hudNavEnabled = () => navMode() === "hud";
export const setHudNav = (on: boolean) => setNavMode(on ? "hud" : "standard");

/** Floating circular HUD menu — radial fan-out nav, toggled from Appearance. */
export function FloatingNav() {
  const [mode, setMode] = useState<NavMode>(navMode);
  const navHidden = useNavHidden();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const sync = () => setMode(navMode());
    window.addEventListener("scu-nav-mode", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("scu-nav-mode", sync); window.removeEventListener("storage", sync); };
  }, []);

  if (mode !== "hud" || navHidden) return null;
  const items = TABS;
  void nav; void pathname;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-0 h-full w-full"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
            initial="hidden"
            animate="show"
          >
          {items.map((item, i) => {
          const angle = -90 + (i - (items.length - 1) / 2) * 38;
          const rad = (angle * Math.PI) / 180;
          const x = Math.cos(rad) * 110;
          const y = Math.sin(rad) * 110;
          return (
            <motion.div
              key={item.to}
              variants={{
                hidden: { opacity: 0, scale: 0.3, x: 0, y: 0 },
                show: { opacity: 1, scale: 1, x, y, transition: { type: "spring", stiffness: 300, damping: 25, mass: 0.8, delay: i * 0.05 } },
              }}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, scale: 0.3, x: 0, y: 0, transition: { duration: 0.15, ease: "easeIn" } }}
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
          </motion.div>
          )}
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
