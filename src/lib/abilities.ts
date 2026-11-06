import {
  Bomb, BookOpen, CreditCard, Crosshair, Crown, DoorOpen, Drama,
  Droplets, Eye, Flame, Footprints, Ghost, Hash, HeartPulse, Landmark,
  Leaf, Locate, Moon, Mountain, Orbit, PawPrint, Scale, Scroll, Shield,
  Sparkles, Swords, WandSparkles, Wind, Zap, type LucideIcon,
} from "lucide-react";

export type AbilityTier = "Legendary" | "Ancient" | "Standard" | "Role";
export type AbilityGroup = "power" | "beast" | "element" | "role" | "art";

export interface AbilityDef {
  key: string;
  label: string;
  tier: AbilityTier;
  group: AbilityGroup;
  color: string;
  icon: LucideIcon;
}

const BEAST = "#f97316";

/** Official SCU ability registry — badge color/icon/tier per power. */
export const ABILITY_REGISTRY: AbilityDef[] = [
  // ---- Legendary powers ----
  { key: "omni_argon", label: "Omni Argon", tier: "Legendary", group: "power", color: "#7dd3fc", icon: Sparkles },
  { key: "reality_bend", label: "Reality Bend", tier: "Legendary", group: "power", color: "#dc2626", icon: Orbit },
  { key: "aether", label: "Aether", tier: "Legendary", group: "power", color: "#a855f7", icon: Sparkles },
  { key: "athenas_judgment", label: "Athenas Judgment", tier: "Legendary", group: "power", color: "#d4af37", icon: Scale },
  { key: "blood_manipulation", label: "Blood Manipulation", tier: "Legendary", group: "power", color: "#b91c1c", icon: Droplets },
  { key: "red_lightning", label: "Red Lightning", tier: "Legendary", group: "power", color: "#ef4444", icon: Zap },
  { key: "demonic", label: "Demonic", tier: "Legendary", group: "power", color: "#7c3aed", icon: Ghost },
  { key: "draconic_flame", label: "Draconic Flame", tier: "Legendary", group: "power", color: "#f97316", icon: Flame },
  { key: "destructive_legendary", label: "Destructive (Legendary)", tier: "Legendary", group: "power", color: "#dc2626", icon: Bomb },

  // ---- Ancient / special powers ----
  { key: "blood_art", label: "Blood Art", tier: "Ancient", group: "art", color: "#991b1b", icon: Scroll },
  { key: "ancient_art", label: "Ancient Art", tier: "Ancient", group: "art", color: "#78716c", icon: BookOpen },

  // ---- Elements ----
  { key: "flame", label: "Flame", tier: "Standard", group: "element", color: "#f97316", icon: Flame },
  { key: "fire", label: "Fire", tier: "Standard", group: "element", color: "#ea580c", icon: Flame },
  { key: "earth", label: "Earth", tier: "Standard", group: "element", color: "#a16207", icon: Mountain },
  { key: "nature", label: "Nature", tier: "Standard", group: "element", color: "#22c55e", icon: Leaf },
  { key: "water", label: "Water", tier: "Standard", group: "element", color: "#0ea5e9", icon: Droplets },
  { key: "wind", label: "Wind", tier: "Standard", group: "element", color: "#4ade80", icon: Wind },
  { key: "lightning", label: "Lightning", tier: "Standard", group: "element", color: "#eab308", icon: Zap },
  { key: "purple_lightning", label: "Purple Lightning", tier: "Standard", group: "element", color: "#c084fc", icon: Zap },
  { key: "healing", label: "Healing", tier: "Standard", group: "element", color: "#34d399", icon: HeartPulse },

  // ---- Signature powers / techniques ----
  { key: "portal", label: "Portal", tier: "Standard", group: "power", color: "#38bdf8", icon: DoorOpen },
  { key: "authority", label: "Authority", tier: "Standard", group: "power", color: "#eab308", icon: Crown },
  { key: "destructive", label: "Destructive", tier: "Standard", group: "power", color: "#dc2626", icon: Bomb },
  { key: "shadow_steps", label: "Shadow Steps", tier: "Standard", group: "art", color: "#64748b", icon: Footprints },
  { key: "long_range", label: "Long Range", tier: "Standard", group: "art", color: "#94a3b8", icon: Locate },
  { key: "rune_magic", label: "Rune Magic", tier: "Standard", group: "art", color: "#a78bfa", icon: Hash },
  { key: "card_magic", label: "Card Magic", tier: "Standard", group: "art", color: "#f472b6", icon: CreditCard },
  { key: "jester", label: "Jester", tier: "Role", group: "role", color: "#f472b6", icon: Drama },
  { key: "super_soldier", label: "Super Soldier", tier: "Standard", group: "role", color: "#60a5fa", icon: Shield },

  // ---- Combat roles ----
  { key: "assassin", label: "Assassin", tier: "Role", group: "role", color: "#dc2626", icon: Crosshair },
  { key: "spy", label: "Spy", tier: "Role", group: "role", color: "#64748b", icon: Eye },
  { key: "combat_specialist", label: "Combat Specialist", tier: "Role", group: "role", color: "#f97316", icon: Swords },
  { key: "tactician", label: "Tactician", tier: "Role", group: "role", color: "#0ea5e9", icon: Landmark },
  { key: "swordsman", label: "Swordsman", tier: "Role", group: "role", color: "#94a3b8", icon: Swords },
  { key: "sword_master", label: "Sword Master", tier: "Role", group: "role", color: "#d4af37", icon: Swords },
  { key: "beast_transformation", label: "Beast Transformation", tier: "Role", group: "role", color: BEAST, icon: PawPrint },

  // ---- Beast classifications ----
  { key: "wolf", label: "Wolf", tier: "Standard", group: "beast", color: BEAST, icon: PawPrint },
  { key: "tiger", label: "Tiger", tier: "Standard", group: "beast", color: "#f59e0b", icon: PawPrint },
  { key: "lion", label: "Lion", tier: "Standard", group: "beast", color: "#eab308", icon: PawPrint },
  { key: "dragon", label: "Dragon", tier: "Standard", group: "beast", color: "#dc2626", icon: PawPrint },
  { key: "hyena", label: "Hyena", tier: "Standard", group: "beast", color: "#92400e", icon: PawPrint },
  { key: "snakes", label: "Snakes", tier: "Standard", group: "beast", color: "#16a34a", icon: PawPrint },
  { key: "vampire", label: "Vampire", tier: "Standard", group: "beast", color: "#7f1d1d", icon: Moon },
  { key: "vampire_hybrid", label: "Vampire Hybrid", tier: "Standard", group: "beast", color: "#9f1239", icon: Moon },
];

export const ABILITY_GROUP_LABELS: Record<AbilityGroup, string> = {
  power: "Powers",
  beast: "Beast traits",
  element: "Elements",
  role: "Roles",
  art: "Arts & techniques",
};

export const TIER_ORDER: AbilityTier[] = ["Legendary", "Ancient", "Standard", "Role"];

/** "Omni Argon" / "omni-argon" / "omni_argon" all normalize the same way. */
export function normalizeAbilityKey(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

const BY_KEY = new Map(ABILITY_REGISTRY.map((a) => [a.key, a]));
const BY_LABEL = new Map(ABILITY_REGISTRY.map((a) => [a.label.toLowerCase(), a]));

/** Resolve a stored ability string to its registry definition (or a generic fallback). */
export function lookupAbility(name: string): AbilityDef | null {
  return BY_LABEL.get(name.trim().toLowerCase()) ?? BY_KEY.get(normalizeAbilityKey(name)) ?? null;
}

/** Fallback definition for custom abilities not in the registry. */
export function genericAbility(name: string): AbilityDef {
  return { key: normalizeAbilityKey(name), label: name, tier: "Standard", group: "power", color: "#8b93a7", icon: WandSparkles };
}

export function abilityDef(name: string): AbilityDef {
  return lookupAbility(name) ?? genericAbility(name);
}

/** Sort abilities: Legendary first, then Ancient, Standard, Role; alpha within tier. */
export function sortAbilities(names: string[]): string[] {
  const rank = (n: string) => {
    const t = abilityDef(n).tier;
    return TIER_ORDER.indexOf(t);
  };
  return [...names].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}
