import { abilityDef, type AbilityTier } from "@/lib/abilities";

const TIER_RANK: Record<AbilityTier, number> = { Legendary: 3, Ancient: 2, Standard: 1, Role: 0 };

/** Compact ability badge with registry color/icon and tier tooltip. */
export function AbilityBadge({ name, className = "" }: { name: string; className?: string }) {
  const def = abilityDef(name);
  const Icon = def.icon;
  const legendary = def.tier === "Legendary";
  const ancient = def.tier === "Ancient";
  const title = `${def.label} — ${def.tier}${def.group === "beast" ? " · Beast trait" : ""}`;
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${className}`}
      style={{
        color: def.color,
        borderColor: `${def.color}55`,
        background: legendary
          ? `linear-gradient(90deg, ${def.color}26, #a855f726)`
          : `${def.color}14`,
        boxShadow: legendary ? `0 0 8px ${def.color}33` : ancient ? `0 0 5px ${def.color}22` : undefined,
      }}
    >
      <Icon className="h-3 w-3" style={{ color: def.color }} />
      {def.label}
    </span>
  );
}

/** Row of ability badges: top N featured + "+X more" expander. */
export function AbilityBadgeRow({ abilities, max = 3 }: { abilities: string[]; max?: number }) {
  if (!abilities.length) return null;
  const shown = abilities.slice(0, max);
  const rest = abilities.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((a) => <AbilityBadge key={a} name={a} />)}
      {rest > 0 && (
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          +{rest} more
        </span>
      )}
    </div>
  );
}

export { TIER_RANK };
