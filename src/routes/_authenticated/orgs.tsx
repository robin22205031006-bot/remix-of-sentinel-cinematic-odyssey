import { createFileRoute } from "@tanstack/react-router";
import { EntitySection } from "@/components/entity-section";
import { GROUP_CATEGORIES } from "@/lib/entities";

export const Route = createFileRoute("/_authenticated/orgs")({
  validateSearch: (s: Record<string, unknown>): { q?: string } => (typeof s["q"] === "string" ? { q: s["q"] } : {}),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Orgs & Bloodlines — Sentinels Cinematic Universe" },
      { name: "description", content: "Factions, black ops teams, clans, organizations, cults and bloodlines of the SCU." },
      { property: "og:title", content: "Orgs & Bloodlines — SCU" },
      { property: "og:description", content: "Factions, black ops teams, clans, organizations, cults and bloodlines." },
    ],
  }),
  component: Orgs,
});

function Orgs() {
  const { q } = Route.useSearch();
  return (
    <EntitySection kinds={["organization", "clan", "bloodline", "faction"]} categories={GROUP_CATEGORIES} initialQuery={q ?? ""}
      title="Orgs & Bloodlines" subtitle="Factions, black ops teams, clans, cults and lineages." />
  );
}
