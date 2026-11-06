import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { sfx } from "@/lib/scu-audio";
import { CHARACTER_STATUSES, GROUP_STATUSES, fileToDataUrl, type Entity } from "@/lib/entities";
import { mergeLocks } from "@/lib/lore-merge";

type Kind = Entity["kind"];
const FIELDS = ["name", "alias", "role", "status", "category", "description", "image_url", "stats", "sketches"] as const;

function Chips({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((s) => (
        <button key={s} type="button" onClick={() => onChange(value === s ? "" : s)}
          className={`rounded-full border px-3 py-1 text-xs ${value === s ? "border-accent bg-accent text-accent-foreground" : "text-muted-foreground"}`}>
          {s}
        </button>
      ))}
    </div>
  );
}

export function EntityDialog({
  open, onOpenChange, entity, defaultKind, allowedKinds,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entity?: Entity | null;
  defaultKind: Kind;
  allowedKinds: Kind[];
}) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>(entity?.kind ?? defaultKind);
  const [form, setForm] = useState({
    name: entity?.name ?? "",
    alias: entity?.alias ?? "",
    role: entity?.role ?? "",
    status: entity?.status ?? (defaultKind === "character" ? "Alive" : "Active"),
    category: entity?.category ?? "",
    description: entity?.description ?? "",
    image_url: entity?.image_url ?? "",
    stats: entity ? Object.entries((entity.stats as Record<string, string>) ?? {}).map(([k, v]) => `${k}: ${v}`).join("\n") : "",
    sketches: entity?.sketches ?? [],
  });
  const [sketchUrl, setSketchUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const isChar = kind === "character";

  // Existing sectors for this entity type — admins can also type a custom one.
  const kindsKey = [...allowedKinds].sort().join(",");
  const { data: existingCategories } = useQuery({
    queryKey: ["entity-categories", kindsKey],
    queryFn: async () => {
      const { data } = await supabase.from("entities").select("category").in("kind", allowedKinds);
      return [...new Set((data ?? []).map((e) => e.category).filter((c): c is string => typeof c === "string" && c.trim().length > 0))].sort();
    },
  });
  const set = (k: "name" | "alias" | "role" | "description" | "stats") => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const stats = Object.fromEntries(
      form.stats.split("\n").map((l) => l.split(":")).filter((p) => p.length >= 2 && (p[0] ?? "").trim()).map(([k, ...v]) => [(k ?? "").trim(), v.join(":").trim()]),
    );
    const row = {
      kind,
      name: form.name.trim(),
      alias: form.alias || null,
      role: form.role || null,
      status: form.status,
      category: form.category || null,
      description: form.description,
      image_url: form.image_url || null,
      stats,
      sketches: form.sketches,
    };
    let error;
    if (entity) {
      const changed = FIELDS.filter((f) => JSON.stringify((entity as any)[f] ?? "") !== JSON.stringify((row as any)[f] ?? ""));
      ({ error } = await supabase.from("entities")
        .update({ ...row, locked_fields: mergeLocks(entity.locked_fields, changed), updated_at: new Date().toISOString() })
        .eq("id", entity.id));
    } else {
      ({ error } = await supabase.from("entities").insert({ ...row, locked_fields: [...FIELDS] }));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    if (entity) sfx.click(); else sfx.add();
    toast.success(entity ? "Saved" : "Created");
    qc.invalidateQueries({ queryKey: ["entities"] });
    qc.invalidateQueries({ queryKey: ["search-index"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{entity ? `Edit ${entity.name}` : "New entry"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          {allowedKinds.length > 1 && (
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <select className="h-9 rounded-md border bg-background px-3 text-sm capitalize" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
                {allowedKinds.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          )}
          <div className="grid gap-1.5"><Label>Name</Label><Input value={form.name} onChange={set("name")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>{isChar ? "Alias / real name" : "Alias"}</Label><Input value={form.alias} onChange={set("alias")} /></div>
            <div className="grid gap-1.5"><Label>{isChar ? "Faction / role" : "Role"}</Label><Input value={form.role} onChange={set("role")} /></div>
          </div>
          <div className="grid gap-1.5"><Label>Status</Label><Chips options={isChar ? CHARACTER_STATUSES : GROUP_STATUSES} value={form.status} onChange={(v) => setForm({ ...form, status: v || form.status })} /></div>
          <div className="grid gap-1.5">
            <Label>{isChar ? "Narrative role / sector" : "Group type / sector"}</Label>
            <Input
              list="entity-category-options"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder={isChar ? "Protagonist, Anti-Hero, or custom tier…" : "Faction, Clan, or custom tier…"}
            />
            <datalist id="entity-category-options">
              {(existingCategories ?? []).map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="grid gap-1.5"><Label>Description</Label><Textarea rows={5} value={form.description} onChange={set("description")} /></div>
          <div className="grid gap-1.5"><Label>Stats (one per line, e.g. "Power: 9")</Label><Textarea rows={3} value={form.stats} onChange={set("stats")} /></div>
          <div className="grid gap-1.5">
            <Label>{isChar ? "Avatar" : "Emblem"}</Label>
            {form.image_url && <img src={form.image_url} alt="" className="h-20 w-20 rounded-md object-cover" />}
            <div className="flex gap-2">
              <Input type="file" accept="image/*" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const image_url = await fileToDataUrl(file);
                  setForm((current) => ({ ...current, image_url }));
                } catch { toast.error("This image could not be processed."); }
              }} />
              {form.image_url && <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, image_url: "" })}>Remove</Button>}
            </div>
          </div>
          {isChar && (
            <div className="grid gap-2">
              <Label>Sketch gallery (angles, turnarounds, armor variants)</Label>
              <div className="flex flex-wrap gap-2">
                {form.sketches.map((s, i) => (
                  <div key={i} className="relative">
                    <img src={s} alt="" className="h-16 w-16 rounded-md object-cover" />
                    <button aria-label="Remove sketch" className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground"
                      onClick={() => setForm({ ...form, sketches: form.sketches.filter((_, j) => j !== i) })}><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Paste image URL" value={sketchUrl} onChange={(e) => setSketchUrl(e.target.value)} />
                <Button variant="secondary" size="sm" disabled={!/^https?:\/\//.test(sketchUrl)} onClick={() => { setForm({ ...form, sketches: [...form.sketches, sketchUrl] }); setSketchUrl(""); }}>Add</Button>
              </div>
              <Input type="file" accept="image/*" multiple onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                try {
                  const urls: string[] = [];
                  for (const file of files) urls.push(await fileToDataUrl(file, 900));
                  setForm((f) => ({ ...f, sketches: [...f.sketches, ...urls] }));
                } catch { toast.error("This image could not be processed."); }
              }} />
            </div>
          )}
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
