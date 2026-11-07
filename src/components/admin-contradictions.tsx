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

/** Parses "[conflict] status: archived 'X' vs extracted 'Y'" into options. */
function parseStatusConflict(text: string): { a: string; b: string } | null {
  const m = text.match(/status:\s*archived\s*'([^']+)'\s*vs\s*(?:extracted\s*)?'([^']+)'/i);
  return m?.[1] && m[2] ? { a: m[1], b: m[2] } : null;
}

export function AdminContradictions({ conflicts }: { conflicts: ConflictRow[] }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [scopedFor, setScopedFor] = useState<string | null>(null);
  const [scope, setScope] = useState<string>(CANON_SCOPES[0] ?? "Sentinels S1");
  const [scopeStatus, setScopeStatus] = useState<string>("");

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-conflicts"] });

  const resolve = async (c: ConflictRow, status: string, scopeLabel?: string) => {
    setBusy(c.id);
    try {
      if (scopeLabel) {
        // Timeline-scoped: record the status for that arc, keep global status untouched.
        const { error } = await supabase.from("lore_notes").insert({
          entity_id: c.entity_id,
          text: `[scope] status '${status}' applies to ${scopeLabel}`,
          source: "admin-resolver",
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("entities").update({ status }).eq("id", c.entity_id);
        if (error) throw error;
        await supabase.from("lore_notes").insert({
          entity_id: c.entity_id,
          text: `[resolved] status canonically set to '${status}'`,
          source: "admin-resolver",
        });
      }
      const { error: delErr } = await supabase.from("lore_notes").delete().eq("id", c.id);
      if (delErr) throw delErr;
      toast.success(scopeLabel ? `Scoped '${status}' to ${scopeLabel}` : `Canon status set to '${status}'`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resolve conflict.");
    } finally {
      setBusy(null);
      setScopedFor(null);
    }
  };

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-1 text-2xl">Lore conflicts</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Status disagreements across arcs — resolve globally or scope them to a season as a valid narrative progression.
      </p>
      <ul className="grid gap-2 text-sm">
        {conflicts.map((c) => {
          const parsed = parseStatusConflict(c.text);
          return (
            <li key={c.id} className="rounded-lg bg-secondary/50 px-3 py-2">
              <span className="font-medium">{c.entity_name}</span>
              <span className="text-muted-foreground"> — {c.text}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {c.source ?? ""} · {new Date(c.created_at).toLocaleDateString()}
              </span>
              {parsed && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => resolve(c, parsed.a)}>
                    Mark '{parsed.a}' Canonical
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => resolve(c, parsed.b)}>
                    Mark '{parsed.b}' Canonical
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy === c.id}
                    onClick={() => {
                      setScopedFor(scopedFor === c.id ? null : c.id);
                      setScopeStatus(parsed.a);
                    }}
                  >
                    Season/Timeline Progression
                  </Button>
                </div>
              )}
              {parsed && scopedFor === c.id && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-accent/30 bg-accent/5 p-2">
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                  >
                    {CANON_SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    value={scopeStatus}
                    onChange={(e) => setScopeStatus(e.target.value)}
                  >
                    <option value={parsed.a}>{parsed.a}</option>
                    <option value={parsed.b}>{parsed.b}</option>
                  </select>
                  <Button size="sm" disabled={busy === c.id} onClick={() => resolve(c, scopeStatus, scope)}>
                    Save Scoped Status
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
