import { createFileRoute } from "@tanstack/react-router";
import { EntitySection } from "@/components/entity-section";
import { CHARACTER_CATEGORIES } from "@/lib/entities";

export const Route = createFileRoute("/_authenticated/characters")({
  validateSearch: (s: Record<string, unknown>): { q?: string } => (typeof s["q"] === "string" ? { q: s["q"] } : {}),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Characters — Sentinels Cinematic Universe" },
      { name: "description", content: "Dossiers for every character in the Sentinels Cinematic Universe." },
      { property: "og:title", content: "Characters — SCU" },
      { property: "og:description", content: "Dossiers for every character in the Sentinels Cinematic Universe." },
    ],
  }),
  component: Characters,
});

function Characters() {
  const { q } = Route.useSearch();
  return (
    <EntitySection kinds={["character"]} categories={CHARACTER_CATEGORIES} initialQuery={q ?? ""}
      title="Characters" subtitle="Protagonists, antagonists, anti-heroes, anti-villains and support." />
  );
}
