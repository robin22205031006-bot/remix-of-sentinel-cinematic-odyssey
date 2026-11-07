import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CANON_SCOPES } from "@/lib/canon";

export interface ConflictRow {
  id: string;
  entity_id: string;
  entity_name: string;
  text: string;
  source: string | null;
  created_at: string;
}

interface ParsedConflict {
  field: string; // status | kind | category | role | faction | other
  a: string;     // archived value
  b: string;     // extracted value
}

/** Parses "[conflict] <field>: archived 'X' vs extracted 'Y'" into a question. */
function parseConflict(text: string): ParsedConflict | null {
  const m = text.match(/\[conflict\]\s*([a-z_]+):\s*archived\s*'([^']+)'\s*vs\s*(?:extracted\s*)?'([^']+)'/i);
  if (!m?.[1] || !m[2] || !m[3]) return null;
  return { field: m[1].toLowerCase(), a: m[2], b: m[3] };
}

const LIFE_STATUSES = ["Alive", "Dead", "Presumed Dead"] as const;
const FIELD_LABELS: Record<string, string> = {
  status: "life status",
  kind: "entity type",
  category: "category",
  role: "role",
  faction: "faction",
};

export function AdminContradictions({ conflicts }: { conflicts: ConflictRow[] }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [scopedFor, setScopedFor] = useState<string | null>(null);
  const [scope, setScope] = useState<string>(CANON_SCOPES[0] ?? "Sentinels S1");
  const [scopeKind, setScopeKind] = useState<"status" | "faction">("status");
  const [scopeStatus, setScopeStatus] = useState<string>("");
  const [scopeFaction, setScopeFaction] = useState<string>("");

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-conflicts"] });

  const clearConflict = async (c: ConflictRow) => {
    const { error } = await supabase.from("lore_notes").delete().eq("id", c.id);
    if (error) throw error;
  };

  /** Admin picks one option — writes it as canon and clears the flag. */
  const pick = async (c: ConflictRow, field: string, value: string) => {
    setBusy(c.id);
    try {
      if (field === "status") {
        const { error } = await supabase.from("entities").update({ status: value }).eq("id", c.entity_id);
        if (error) throw error;
      }
      await supabase.from("lore_notes").insert({
        entity_id: c.entity_id,
        text: `[resolved] ${field} canonically set to '${value}'`,
        source: "admin-resolver",
      });
      await clearConflict(c);
      toast.success(`Canon ${FIELD_LABELS[field] ?? field} set to '${value}'`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resolve conflict.");
    } finally {
      setBusy(null);
    }
  };

  /** Scoped progression: attach a status or faction roster to one canon season. */
  const saveScoped = async (c: ConflictRow) => {
    setBusy(c.id);
    try {
      const note =
        scopeKind === "status"
          ? `[scope] status '${scopeStatus}' applies to ${scope}`
          : `[scope] faction '${scopeFaction}' roster applies to ${scope}`;
      const { error } = await supabase.from("lore_notes").insert({
        entity_id: c.entity_id,
        text: note,
        source: "admin-resolver",
      });
      if (error) throw error;
      await clearConflict(c);
      toast.success(`Scoped to ${scope}`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save scoped status.");
    } finally {
      setBusy(null);
      setScopedFor(null);
    }
  };

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-1 text-2xl">Lore conflicts</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Each entry is a question — pick the canon answer, or scope it to a season as valid narrative progression.
      </p>
      <ul className="grid gap-3 text-sm">
        {conflicts.map((c) => {
          const parsed = parseConflict(c.text);
          const isStatus = parsed?.field === "status";
          const isFaction = /faction|team|member|org/i.test(c.text);
          return (
            <li key={c.id} className="rounded-lg border border-border/60 bg-secondary/40 px-4 py-3">
              {/* Question header */}
              <p className="font-medium">
                {parsed
                  ? `${c.entity_name}: which ${FIELD_LABELS[parsed.field] ?? parsed.field} is canon?`
                  : `${c.entity_name}: resolve this conflict?`}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {c.text} · {c.source ?? ""} · {new Date(c.created_at).toLocaleDateString()}
              </p>

              {/* Answer options */}
              {parsed && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {isStatus ? (
                    LIFE_STATUSES.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={s === "Presumed Dead" ? "secondary" : "outline"}
                        disabled={busy === c.id}
                        onClick={() => pick(c, "status", s)}
                      >
                        {s}
                      </Button>
                    ))
                  ) : (
                    <>
                      <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => pick(c, parsed.field, parsed.a)}>
                        Keep '{parsed.a}'
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => pick(c, parsed.field, parsed.b)}>
                        Use '{parsed.b}'
                      </Button>
                    </>
                  )}
                  {!parsed && isFaction && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === c.id}
                      onClick={() => {
                        setScopedFor(scopedFor === c.id ? null : c.id);
                        setScopeKind("faction");
                        setScopeFaction("");
                      }}
                    >
                      Update Faction Roster Scope
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy === c.id}
                    onClick={() => {
                      setScopedFor(scopedFor === c.id ? null : c.id);
                      setScopeKind(isStatus ? "status" : "faction");
                      setScopeStatus(parsed?.a ?? "Alive");
                      setScopeFaction("");
                    }}
                  >
                    Season/Timeline Progression
                  </Button>
                </div>
              )}

              {/* Scoped selector */}
              {scopedFor === c.id && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-accent/30 bg-accent/5 p-2">
                  <span className="text-xs text-muted-foreground">Attach to:</span>
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                  >
                    {CANON_SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    value={scopeKind}
                    onChange={(e) => setScopeKind(e.target.value as "status" | "faction")}
                  >
                    <option value="status">Life status</option>
                    <option value="faction">Faction roster</option>
                  </select>
                  {scopeKind === "status" ? (
                    <select
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                      value={scopeStatus}
                      onChange={(e) => setScopeStatus(e.target.value)}
                    >
                      {LIFE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input
                      className="w-40 rounded-md border border-border bg-background px-2 py-1 text-xs"
                      placeholder="Faction name"
                      value={scopeFaction}
                      onChange={(e) => setScopeFaction(e.target.value)}
                    />
                  )}
                  <Button
                    size="sm"
                    disabled={busy === c.id || (scopeKind === "faction" && !scopeFaction.trim())}
                    onClick={() => saveScoped(c)}
                  >
                    Save Scoped
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
