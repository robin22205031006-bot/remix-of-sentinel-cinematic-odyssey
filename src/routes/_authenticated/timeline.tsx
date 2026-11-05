import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-admin";
import { timelineQuery } from "@/lib/entities";

export const Route = createFileRoute("/_authenticated/timeline")({
  head: () => ({
    meta: [
      { title: "Timeline — Sentinels Cinematic Universe" },
      { name: "description", content: "The chronological history of the Sentinels Cinematic Universe." },
      { property: "og:title", content: "Timeline — SCU" },
      { property: "og:description", content: "The chronological history of the SCU." },
    ],
  }),
  component: Timeline,
});

function Timeline() {
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(timelineQuery);
  const [adding, setAdding] = useState(false);
  const [series, setSeries] = useState("all");
  const [f, setF] = useState({ title: "", era: "", series: "", impact: 5, description: "" });

  const allSeries = Array.from(new Set((data ?? []).map((e) => e.series).filter((s): s is string => !!s)));
  const events = (data ?? []).filter((e) => series === "all" || e.series === series);
  const chart = events.map((e, i) => ({ i: i + 1, impact: e.impact, title: e.title }));

  const add = async () => {
    if (!f.title.trim()) return;
    const { error } = await supabase.from("timeline_events").insert({
      title: f.title, era: f.era || null, series: f.series || null, impact: Math.min(10, Math.max(1, f.impact)),
      description: f.description, sort_order: Math.max(0, ...(data ?? []).map((event) => event.sort_order)) + 1,
    });
    if (error) { toast.error(error.message); return; }
    setF({ title: "", era: "", series: "", impact: 5, description: "" }); setAdding(false);
    qc.invalidateQueries({ queryKey: ["timeline"] });
    qc.invalidateQueries({ queryKey: ["search-index"] });
  };
  const del = async (id: string) => {
    const { error } = await supabase.from("timeline_events").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["timeline"] });
    qc.invalidateQueries({ queryKey: ["search-index"] });
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-5">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-accent">Chronicle</p>
          <h1 className="mt-2 text-5xl font-medium glow-text">Timeline</h1>
        </div>
        {isAdmin && <Button size="sm" onClick={() => setAdding(!adding)}><Plus className="h-4 w-4" />Event</Button>}
      </header>

      {chart.length > 1 && (
        <div data-no-swipe className="glass mb-6 h-44 rounded-2xl p-3">
          <p className="px-2 text-[11px] uppercase tracking-widest text-muted-foreground">Impact</p>
          <ResponsiveContainer width="100%" height="88%">
            <AreaChart data={chart}>
              <defs>
                <linearGradient id="imp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--accent)" stopOpacity={0.6} />
                  <stop offset="1" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="i" hide />
              <YAxis domain={[0, 10]} hide />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)" }} formatter={(v) => [v, "Impact"]} labelFormatter={(_, p) => p?.[0]?.payload?.title ?? ""} />
              <Area type="linear" dataKey="impact" stroke="var(--accent)" strokeWidth={2} fill="url(#imp)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {allSeries.length > 0 && (
        <div data-no-swipe className="mb-8 flex gap-1.5 overflow-x-auto">
          {["all", ...allSeries].map((s) => (
            <button key={s} onClick={() => setSeries(s)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${series === s ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>
              {s === "all" ? "All series" : s}
            </button>
          ))}
        </div>
      )}

      {adding && (
        <div className="glass mb-10 grid gap-3 rounded-2xl p-5">
          <Input placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Era / year" value={f.era} onChange={(e) => setF({ ...f, era: e.target.value })} />
            <Input placeholder="Series" value={f.series} onChange={(e) => setF({ ...f, series: e.target.value })} />
            <Input type="number" min={1} max={10} placeholder="Impact 1-10" value={f.impact} onChange={(e) => setF({ ...f, impact: Number(e.target.value) })} />
          </div>
          <Textarea placeholder="What happened" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <Button onClick={add}>Add event</Button>
        </div>
      )}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : !events.length ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No events yet.</p>
      ) : (
        <ol className="relative border-l pl-8">
          {events.map((ev) => (
            <li key={ev.id} className="relative pb-10 last:pb-0">
              <span className="absolute -left-[37px] top-2 h-2.5 w-2.5 rounded-full border-2 border-accent bg-background glow-ring" />
              <p className="text-[11px] uppercase tracking-widest text-accent">{[ev.era, ev.series].filter(Boolean).join(" · ")}</p>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-2xl font-medium">{ev.title}</h2>
                {isAdmin && <button aria-label="Delete event" onClick={() => del(ev.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
              </div>
              {ev.description && <p className="mt-1 text-sm leading-relaxed text-foreground/80">{ev.description}</p>}
              {ev.source && <p className="mt-1 text-xs text-muted-foreground">From {ev.source}</p>}
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
