import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { entityByIdQuery, notesQuery, type Entity } from "@/lib/entities";
import { characterSeriesQuery, seriesQuery } from "@/lib/series";
import { AbilityCardCanvas } from "@/components/ability-canvas";
import { AbilityBadge } from "@/components/ability-badge";
import { KineticText } from "@/components/kinetic-text";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import { useUiToggles } from "@/lib/ui-toggles";
import { useAnimationsEnabled } from "@/lib/animations";
import { sfx } from "@/lib/scu-audio";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/character")({
  validateSearch: (s: Record<string, unknown>): { e?: string } =>
    typeof s["e"] === "string" ? { e: s["e"] } : {},
  head: () => ({ meta: [{ title: "Character — SCU" }] }),
  component: CharacterDossier,
});

const SEASON_HUES = [262, 200, 150, 20, 340, 90, 180];
const TABS = [["lore", "Story / Lore"], ["powers", "Abilities and Role"], ["bonds", "Bonds / Connection"], ["progress", "Progress"]] as const;
type Tab = (typeof TABS)[number][0];

const SANITIZE = /^\[(conflict|Auto-Merged|Auto-Stub|scope|resolved|Merged Info)/i;

function journeyScore(r: { arc_role?: string | null; status?: string | null; role_in_series?: string | null }): number {
  const role = `${r.arc_role ?? ""} ${r.role_in_series ?? ""}`.toLowerCase();
  if (/main\s*protagonist|lead\s*protagonist/.test(role)) return 5;
  if (/protagonist|legend/.test(role)) return 4;
  if (/anti-?hero|antagonist|anti-?villain|villain/.test(role)) return 3;
  if (/support|mentor|side/.test(role)) return 2;
  if (/cameo/.test(role)) return 1;
  const st = (r.status ?? "").toLowerCase();
  if (st === "dead" || st === "presumed dead") return 1;
  if (st === "alive") return 3;
  return 2;
}

function JourneyBars({ rows }: { rows: Array<{ id: string; series?: { title?: string | null } | null; arc_role?: string | null; status?: string | null; role_in_series?: string | null }> }) {
  const pts = rows.map((r) => ({ label: r.series?.title ?? "?", score: journeyScore(r), role: r.arc_role ?? r.role_in_series ?? "" }));
  const W = 560, H = 110, pad = 22;
  const bw = (W - pad * 2) / Math.max(pts.length, 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[1, 2, 3, 4, 5].map((g) => (
        <line key={g} x1={pad} x2={W - pad} y1={H - pad - (g / 5) * (H - pad * 2)} y2={H - pad - (g / 5) * (H - pad * 2)} stroke="rgba(255,255,255,0.06)" />
      ))}
      {pts.map((p, i) => {
        const x = pad + i * bw + bw / 2;
        const h = (p.score / 5) * (H - pad * 2);
        const y = H - pad - h;
        return (
          <g key={i}>
            <rect x={x - bw * 0.32} y={y} width={bw * 0.64} height={h} rx={3} fill="var(--accent)" opacity={0.75} />
            <text x={x} y={H - 6} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.5)">{p.label.replace(/^The\s*/i, "").slice(0, 10)}</text>
          </g>
        );
      })}
      <polyline points={pts.map((p, i) => `${pad + i * bw + bw / 2},${H - pad - (p.score / 5) * (H - pad * 2)}`).join(" ")} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.6} />
    </svg>
  );
}

function CharacterDossier() {
  const { e: id } = Route.useSearch();
  const qc = useQueryClient();
  const ui = useUiToggles();
  const animOn = useAnimationsEnabled();
  const [tab, setTab] = useState<Tab>("lore");
  const [openSeries, setOpenSeries] = useState<string | null>(null);
  const [ctxSeason, setCtxSeason] = useState<string | null>(null);
  const [seasonIdx, setSeasonIdx] = useState(-1);
  const [descOpen, setDescOpen] = useState(false);

  const { data: e } = useQuery({ ...entityByIdQuery(id ?? ""), enabled: !!id });
  const { data: notes } = useQuery({ ...notesQuery(id ?? ""), enabled: !!id });
  const { data: memberships } = useQuery({ ...characterSeriesQuery(id ?? ""), enabled: !!id && e?.kind === "character" });
  const { data: allSeries } = useQuery({ ...seriesQuery, enabled: e?.kind === "character" });
  const { data: charAbilities } = useQuery({
    queryKey: ["character-abilities", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("character_abilities").select("*").eq("entity_id", id!);
      return data ?? [];
    },
  });

  const seasons = useMemo(() => (memberships ?? []).filter((r) => r.series), [memberships]);
  const cleanNotes = useMemo(() => (notes ?? []).filter((n) => !SANITIZE.test(n.text)), [notes]);
  const activeSeason = seasonIdx >= 0 ? seasons[seasonIdx] : null;
  const seasonHue = seasonIdx >= 0 ? SEASON_HUES[seasonIdx % SEASON_HUES.length] : null;
  const accent = seasonHue ? `hsl(${seasonHue} 85% 60%)` : "var(--accent)";

  if (!e) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading dossier…</div>;

  const scopedNotes = activeSeason?.series?.title
    ? cleanNotes.filter((n) => n.text.includes(activeSeason.series!.title))
    : cleanNotes;

  return (
    <div className="fixed inset-0 grid grid-rows-[auto_1fr] overflow-hidden bg-[#020408] text-foreground">
      {/* TOP HEADER */}
      <header className="relative z-20 flex items-center justify-between border-b border-white/10 bg-black/60 px-4 py-2 backdrop-blur-xl">
        <Link to="/" className="font-display text-sm tracking-[0.3em] text-accent">SCU</Link>
        <nav className="hidden items-center gap-6 text-[11px] uppercase tracking-widest text-muted-foreground md:flex">
          <Link to="/" className="hover:text-foreground">Inicio</Link>
          <Link to="/story" className="hover:text-foreground">Synopsis</Link>
          <Link to="/characters" className="hover:text-foreground">Cast</Link>
          <Link to="/archive" className="hover:text-foreground">Gallery</Link>
          <Link to="/map" className="hover:text-foreground">Trailer</Link>
          <Link to="/graph" className="text-accent hover:text-foreground">Character Graph</Link>
        </nav>
        <div className="flex items-center gap-2">
          <button
            aria-label="Favorite"
            onClick={() => { toggleFavorite({ id: e.id, name: e.name, kind: e.kind }); sfx.pop(); qc.invalidateQueries({ queryKey: ["favorites"] }); }}
            className={`grid h-8 w-8 place-items-center rounded-full ${isFavorite(e.id) ? "bg-accent/20 text-accent" : "bg-secondary text-muted-foreground"}`}
          >
            <Heart className={`h-4 w-4 ${isFavorite(e.id) ? "fill-current" : ""}`} />
          </button>
          <Link to="/characters" className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground hover:text-foreground" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link>
        </div>
      </header>

      {/* Tactical HUD frame */}
      <div className="pointer-events-none absolute inset-0 z-10 opacity-[0.05]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      {(["top-3 left-3 border-t border-l", "top-3 right-3 border-t border-r", "bottom-3 left-3 border-b border-l", "bottom-3 right-3 border-b border-r"] as const).map((pos) => (
        <span key={pos} className={`pointer-events-none absolute z-10 h-5 w-5 border-white/25 ${pos}`} />
      ))}
      <span className="pointer-events-none absolute left-4 top-[4.5rem] z-10 font-mono text-[9px] uppercase tracking-widest text-white/30">
        SCU // {e.name.slice(0, 12).toUpperCase()} — {String(Math.max(seasonIdx + 1, 1)).padStart(2, "0")} / {String(Math.max(seasons.length, 1)).padStart(2, "0")}
      </span>

      {/* 3-COLUMN GRID */}
      <div className="relative grid min-h-0 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_350px]">
        {/* LEFT — series & season accordion */}
        <aside className="hidden min-h-0 flex-col border-r border-white/10 bg-black/50 p-3 lg:flex">
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
            {(allSeries ?? []).map((s, si) => {
              const hue = SEASON_HUES[si % SEASON_HUES.length];
              const open = openSeries === s.id;
              const list = s.season_names?.length ? s.season_names : s.season_count ? Array.from({ length: s.season_count }, (_, i) => `Season ${i + 1}`) : ["Season 1"];
              const memberIdx = seasons.findIndex((r) => r.series?.id === s.id || r.series?.title === s.title);
              return (
                <div key={s.id} className="overflow-hidden rounded-lg border border-white/10">
                  <button
                    onClick={() => setOpenSeries(open ? null : s.id)}
                    className={`flex w-full items-center gap-2 p-2 text-left ${open ? "bg-white/10" : "bg-white/5 hover:bg-white/10"}`}
                    style={{ borderLeft: `3px solid hsl(${hue} 85% 60%)` }}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary text-[9px] uppercase text-muted-foreground">{s.title.slice(0, 2)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold uppercase tracking-wide">{s.title}</span>
                      <span className="block text-[9px] uppercase text-muted-foreground">{memberIdx >= 0 ? seasons[memberIdx]!.status : `${list.length} seasons`}</span>
                    </span>
                    <span className={`text-xs text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}>›</span>
                  </button>
                  {open && (
                    <div className="grid gap-0.5 border-t border-white/10 bg-black/30 p-1.5">
                      {list.map((sn) => (
                        <button
                          key={sn}
                          onClick={() => { setCtxSeason(sn); setSeasonIdx(memberIdx); }}
                          className={`rounded px-2 py-1 text-left text-[10px] uppercase tracking-wide ${ctxSeason === sn ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          {sn}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex flex-col items-center gap-0.5 border-t border-white/10 pt-2 text-white/40">
            <span>▲</span><span className="text-[8px] uppercase tracking-[0.3em]">Scroll</span><span>▼</span>
          </div>
        </aside>

        {/* CENTER — context-aware bio */}
        <section className="relative min-h-0 overflow-y-auto p-5 sm:p-8">
          {animOn && <AbilityCardCanvas abilities={e.abilities} theme={activeSeason?.card_theme ?? e.card_theme} density={1.6} className="pointer-events-none absolute inset-0 h-full w-full opacity-30" />}
          <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
          <div className="relative">
            <h1 className="font-display text-5xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-6xl" style={{ textShadow: `0 0 30px ${accent}66` }}>
              <KineticText text={e.name} />
            </h1>
            <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              {activeSeason ? `${activeSeason.series?.title} · ${ctxSeason ?? "All seasons"}` : "Overview"}
            </p>

            {/* Season intel */}
            {activeSeason && (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/50 p-4 backdrop-blur-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {activeSeason.arc_role && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-accent">{activeSeason.arc_role}</span>}
                  {activeSeason.status && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-muted-foreground">{activeSeason.status}</span>}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{activeSeason.role_in_series ?? "Missing role / story"}</p>
              </div>
            )}

            {/* Tab content */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/50 p-5 backdrop-blur-xl">
              {tab === "lore" && (
                <div className="space-y-4">
                  {e.description && (
                    <div>
                      <p className={`whitespace-pre-line text-foreground/85 ${!descOpen && e.description.length > 700 ? "line-clamp-6" : ""}`}>{e.description}</p>
                      {e.description.length > 700 && (
                        <button onClick={() => setDescOpen((o) => !o)} className="mt-1 text-xs font-semibold uppercase tracking-widest text-accent hover:underline">
                          {descOpen ? "VER MENOS <<" : "VER MAS >>"}
                        </button>
                      )}
                    </div>
                  )}
                  {scopedNotes.map((n) => (
                    <div key={n.id} className="border-l-2 border-accent/60 pl-3 text-sm">
                      <p>{n.text}</p>
                      {n.source && <p className="mt-1 text-xs text-muted-foreground">From {n.source}</p>}
                    </div>
                  ))}
                  {!e.description && scopedNotes.length === 0 && <p className="text-sm text-muted-foreground">No lore recorded for this selection.</p>}
                </div>
              )}
              {tab === "powers" && (
                <div className="grid gap-3">
                  {(charAbilities ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(charAbilities ?? []).map((ca) => <AbilityBadge key={ca.id} name={ca.ability_key} />)}
                    </div>
                  )}
                  {(e.abilities ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {e.abilities.map((a) => <AbilityBadge key={a} name={a} />)}
                    </div>
                  )}
                  {!e.abilities?.length && !(charAbilities ?? []).length && <p className="text-sm text-muted-foreground">No abilities recorded.</p>}
                </div>
              )}
              {tab === "bonds" && (
                <div className="grid gap-2">
                  {seasons.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs">
                      <span className="font-medium">{r.series?.title}</span>
                      <span className="text-muted-foreground">{r.arc_role ?? r.role_in_series ?? r.status}</span>
                    </div>
                  ))}
                  {seasons.length === 0 && <p className="text-sm text-muted-foreground">No bonds recorded.</p>}
                </div>
              )}
              {tab === "progress" && ui.showJourneyGraph && seasons.length > 0 && (
                <div className="mb-4">
                  <JourneyBars rows={seasons} />
                </div>
              )}
              {tab === "progress" && (
                <ul className="grid gap-1.5 text-xs">
                  {seasons.map((r, i) => (
                    <li key={r.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: `hsl(${SEASON_HUES[i % SEASON_HUES.length]} 85% 60%)` }} />
                      <span className="font-medium">{r.series?.title}</span>
                      <span className="ml-auto text-muted-foreground">{r.status}</span>
                    </li>
                  ))}
                  {seasons.length === 0 && <li className="text-sm text-muted-foreground">No series data.</li>}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT — render + far-right edge tabs */}
        <div className="relative hidden min-h-0 lg:block">
          {e.image_url && (
            <div className="absolute inset-0 flex items-end justify-center overflow-hidden">
              <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 85%, ${accent} 0%, transparent 65%)`, opacity: 0.25 }} />
              <img src={e.image_url} alt={e.name} className="relative h-[92%] w-auto max-w-full object-contain object-bottom [mask-image:linear-gradient(to_top,black_55%,transparent_98%)]" />
            </div>
          )}
          <nav className="absolute right-0 top-0 flex h-full w-12 flex-col border-l border-white/10 bg-black/50" aria-label="Sections">
            {TABS.map(([t, label], i) => (
              <button
                key={t}
                onClick={() => { sfx.pop(); setTab(t); }}
                className="group relative flex h-full flex-1 items-center justify-center"
                aria-label={label}
              >
                <span
                  className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r transition-all"
                  style={{ background: tab === t ? accent : "rgba(255,255,255,.15)", boxShadow: tab === t ? `0 0 10px ${accent}` : undefined }}
                />
                <span className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ writingMode: "vertical-rl", color: tab === t ? accent : "rgba(255,255,255,.45)" }}>
                  {label}
                </span>
                <span className="absolute right-1 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/60 text-[8px] text-muted-foreground">{i + 1}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
