import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-admin";

export function UniversalSearch() {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const { data: user } = useSession();
  const { data } = useQuery({
    queryKey: ["search-index", user?.id],
    staleTime: 60_000,
    enabled: open && !!user,
    queryFn: async () => {
      const [e, t, d] = await Promise.all([
        supabase.from("entities").select("id, name, alias, kind"),
        supabase.from("timeline_events").select("id, title, era"),
        supabase.from("vault_documents").select("id, title"),
      ]);
      for (const result of [e, t, d]) if (result.error) throw result.error;
      return { entities: e.data ?? [], events: t.data ?? [], docs: d.data ?? [] };
    },
  });

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Search the universe" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground">
        <Search className="h-3.5 w-3.5" />
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={user ? "Search characters, orgs, events, documents…" : "Sign in to search the archive"} />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          {user && data && (
            <>
              <CommandGroup heading="Archive">
                {data.entities.map((e) => (
                  <CommandItem key={e.id} value={`${e.name} ${e.alias ?? ""}`} onSelect={() => { setOpen(false); nav({ to: e.kind === "character" ? "/characters" : "/orgs", search: { q: e.name } }); }}>
                    {e.name} <span className="ml-auto text-xs capitalize text-muted-foreground">{e.kind}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Timeline">
                {data.events.map((e) => (
                  <CommandItem key={e.id} value={e.title} onSelect={() => { setOpen(false); nav({ to: "/timeline" }); }}>
                    {e.title} <span className="ml-auto text-xs text-muted-foreground">{e.era}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="PDF Vault">
                {data.docs.map((d) => (
                  <CommandItem key={d.id} value={d.title} onSelect={() => { setOpen(false); nav({ to: "/vault" }); }}>{d.title}</CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
