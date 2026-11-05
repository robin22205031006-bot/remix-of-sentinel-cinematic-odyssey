import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useWebMCP } from "use-webmcp-tool";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-admin";
import { entitiesQuery, matchesSearch, notesQuery, type Entity } from "@/lib/entities";
import { runWebMCPTool } from "@/lib/webmcp-telemetry";
import { EntityDialog } from "./entity-dialog";
import { SketchGallery } from "./sketch-gallery";

const statusClass: Record<string, string> = {
  Alive: "text-status-alive", Active: "text-status-alive",
  Dead: "text-status-dead", Inactive: "text-status-neutral",
  Legend: "text-status-legend",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] ${statusClass[status] ?? "text-status-neutral"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />{status}
    </span>
  );
}

function Avatar({ e, size }: { e: Entity; size: string }) {
  return e.image_url ? (
    <img src={e.image_url} alt={e.name} className={`${size} shrink-0 rounded-xl object-cover`} />
  ) : (
    <div className={`${size} grid shrink-0 place-items-center rounded-xl bg-secondary font-display text-2xl text-muted-foreground`}>{e.name[0]}</div>
  );
}

function CardBody({ e, showKind }: { e: Entity; showKind: boolean }) {
  return (
    <div className="min-w-0 flex-1 text-left">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StatusBadge status={e.status} />
        {(e.category || showKind) && <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{e.category ?? e.kind}</span>}
      </div>
      <h2 className="mt-1 truncate text-2xl font-medium">{e.name}</h2>
      <p className="truncate text-sm text-muted-foreground">{[e.alias, e.role].filter(Boolean).join(" · ") || "—"}</p>
    </div>
  );
}

/** Opened state: the card shifts to the top-left corner, details open beside it. */
function DetailOverlay({ e, from, onClose }: { e: Entity; from: DOMRect | null; onClose: () => void }) {
  const { data: notes } = useQuery(notesQuery(e.id));
  const stats = Object.entries((e.stats as Record<string, string>) ?? {});
  const [style, setStyle] = useState<CSSProperties>({});
  useEffect(() => {
    const k = (ev: KeyboardEvent) => ev.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  useEffect(() => {
    if (!from) return;
    const target = { x: window.innerWidth < 640 ? 16 : 24, y: window.innerWidth < 640 ? 96 : 104 };
    setStyle({ "--from-x": `${from.left - target.x}px`, "--from-y": `${from.top - target.y}px`, "--from-s": "1" } as CSSProperties);
  }, [from]);

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto grid max-w-5xl gap-5 px-4 pb-16 pt-24 sm:grid-cols-[17rem_1fr] sm:px-6 sm:pt-26" onClick={(ev) => ev.stopPropagation()}>
        <div className="corner-shift glass glow-ring h-fit rounded-2xl rounded-tl-[2rem] p-4 sm:sticky sm:top-26" style={style}>
          <Avatar e={e} size="h-40 w-full" />
          <div className="mt-3"><CardBody e={e} showKind /></div>
        </div>
        <section className="morph-in glass grid gap-6 rounded-2xl p-5 text-sm leading-relaxed sm:p-7">
          <div className="flex items-start justify-between">
            <h3 className="text-4xl font-medium glow-text">{e.name}</h3>
            <button aria-label="Close" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-secondary"><X className="h-4 w-4" /></button>
          </div>
          <SketchGallery images={e.sketches} name={e.name} />
          {e.description && <p className="whitespace-pre-line text-foreground/85">{e.description}</p>}
          {stats.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {stats.map(([k, v]) => (
                <div key={k}><dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{k}</dt><dd className="text-base">{v}</dd></div>
              ))}
            </dl>
          )}
          {notes && notes.length > 0 && (
            <div className="grid gap-3">
              <h4 className="text-[11px] uppercase tracking-widest text-muted-foreground">Lore notes</h4>
              {notes.map((n) => (
                <div key={n.id} className="border-l-2 border-accent/60 pl-3">
                  <p>{n.text}</p>
                  {n.source && <p className="mt-1 text-xs text-muted-foreground">From {n.source}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function EntitySection({
  kinds, title, subtitle, categories, initialQuery = "",
}: { kinds: Entity["kind"][]; title: string; subtitle: string; categories: string[]; initialQuery?: string }) {
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(entitiesQuery(kinds));
  const [open, setOpen] = useState<{ id: string; rect: DOMRect | null } | null>(null);
  const [editing, setEditing] = useState<Entity | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Entity | null>(null);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState(initialQuery);
  useEffect(() => setQ(initialQuery), [initialQuery]);

  const list = useMemo(() => (data ?? []).filter((e) => (cat === "all" || e.category === cat) && matchesSearch(e, q)), [data, cat, q]);
  const opened = (data ?? []).find((e) => e.id === open?.id);

  useWebMCP({
    name: "list_archive_entries",
    description: `List the ${title} entries currently shown on this page.`,
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: () =>
      runWebMCPTool("list_archive_entries", () =>
        isLoading ? "Still loading." : list.length === 0 ? "No entries shown." : list.map((e) => `${e.id}: ${e.name} (${e.category ?? e.kind}, ${e.status})`).join("\n"),
      ),
  });

  useWebMCP({
    name: "open_dossier",
    description: "Open one shown entry's dossier on screen.",
    inputSchema: { type: "object", properties: { id: { type: "string", description: "Entry id from list_archive_entries." } }, required: ["id"] },
    annotations: { untrustedContentHint: true },
    execute: ({ id }: { id: string }) =>
      runWebMCPTool("open_dossier", () => {
        const e = list.find((x) => x.id === id);
        if (!e) throw new Error("That entry is not in the current view.");
        setOpen({ id: e.id, rect: null });
        return `Opened ${e.name}.`;
      }),
  });

  const doDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("entities").delete().eq("id", deleting.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`${deleting.name} deleted`);
      qc.invalidateQueries({ queryKey: ["entities"] });
      qc.invalidateQueries({ queryKey: ["search-index"] });
      qc.removeQueries({ queryKey: ["notes", deleting.id] });
    }
    setDeleting(null);
  };

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-28 sm:px-5">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-accent">Archive</p>
          <h1 className="mt-2 text-5xl font-medium glow-text">{title}</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {isAdmin && <Button onClick={() => setEditing(null)} size="sm"><Plus className="h-4 w-4" />New</Button>}
      </header>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`} className="glass h-11 rounded-full pl-10" />
      </div>
      <div data-no-swipe className="mb-6 flex gap-1.5 overflow-x-auto pb-1">
        {["all", ...categories].map((k) => (
          <button key={k} onClick={() => setCat(k)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${cat === k ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {k === "all" ? "All" : k}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">{data?.length ? "No matches." : "Nothing in the archive yet."}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => (
            <article key={e.id} className="glass group flex gap-4 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:rounded-tr-[2rem] hover:glow-ring">
              <button className="flex min-w-0 flex-1 gap-4" onClick={(ev) => setOpen({ id: e.id, rect: (ev.currentTarget.closest("article") as HTMLElement).getBoundingClientRect() })}>
                <Avatar e={e} size="h-16 w-16" />
                <CardBody e={e} showKind={kinds.length > 1} />
              </button>
              {isAdmin && (
                <div className="flex shrink-0 flex-col gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Edit" onClick={() => setEditing(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label="Delete" onClick={() => setDeleting(e)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {opened && <DetailOverlay e={opened} from={open?.rect ?? null} onClose={() => setOpen(null)} />}

      {editing !== undefined && (
        <EntityDialog key={editing?.id ?? "new"} open onOpenChange={(o) => !o && setEditing(undefined)}
          entity={editing} defaultKind={kinds[0] ?? "character"} allowedKinds={kinds} />
      )}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the entry and its lore notes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
