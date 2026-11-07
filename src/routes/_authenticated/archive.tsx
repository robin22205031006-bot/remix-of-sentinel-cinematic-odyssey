import { createFileRoute, Link } from "@tanstack/react-router";
import { Castle, Clock, Network, Shield } from "lucide-react";
import { RelationshipGraph } from "@/components/relationship-graph";

export const Route = createFileRoute("/_authenticated/archive")({
  head: () => ({
    meta: [
      { title: "Archive — Sentinels Cinematic Universe" },
      { name: "description", content: "The SCU lore vault: organizations, clans, bloodlines, knowledge graph and timeline." },
    ],
  }),
  component: Archive,
});

const MODULES = [
  { to: "/orgs", icon: Shield, t: "Organization Charts", d: "DEW, H.A.W.K.S., Covenant and every faction structure." },
  { to: "/clans", icon: Castle, t: "Clans & Bloodlines", d: "Kurohana, Kazumi, Demon Clan, Al-Mansur and other lineages." },
  { to: "/graph", icon: Network, t: "Knowledge Graph", d: "The living web linking characters, clans, factions and powers." },
  { to: "/timeline", icon: Clock, t: "Canon Timeline", d: "Season 1 through Season 5 chronological history." },
] as const;

function Archive() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-5">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.25em] text-accent">Lore Vault</p>
        <h1 className="mt-2 text-5xl font-medium glow-text">Archive</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          The deep vault of the universe — structures, bloodlines, connections and history.
        </p>
      </header>
      <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MODULES.map((m) => (
          <Link key={m.to} to={m.to} className="glass group rounded-2xl p-5 transition-transform hover:-translate-y-0.5 hover:glow-ring">
            <m.icon className="h-6 w-6 text-accent" />
            <h2 className="mt-3 text-xl font-medium group-hover:text-accent">{m.t}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{m.d}</p>
          </Link>
        ))}
      </div>
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Interactive knowledge graph</h2>
        <RelationshipGraph />
      </section>
    </main>
  );
}
