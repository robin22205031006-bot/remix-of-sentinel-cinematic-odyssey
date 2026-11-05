import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useIsStaff } from "@/hooks/use-admin";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Admin — Sentinels Cinematic Universe" },
      { name: "description", content: "Moderate the SCU community and archive." },
      { property: "og:title", content: "Admin — SCU" },
      { property: "og:description", content: "Moderate the SCU community and archive." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const staff = useIsStaff();
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  const [word, setWord] = useState("");

  const { data } = useQuery({
    queryKey: ["admin"],
    enabled: staff,
    queryFn: async () => {
      const [p, b, w, l] = await Promise.all([
        supabase.from("profiles").select("id, email, display_name").order("created_at"),
        supabase.from("banned_users").select("user_id, reason"),
        supabase.from("banned_words").select("id, word").order("word"),
        supabase.from("activity_log").select("id, user_id, action, created_at").order("created_at", { ascending: false }).limit(50),
      ]);
      return { profiles: p.data ?? [], bans: b.data ?? [], words: w.data ?? [], log: l.data ?? [] };
    },
  });

  if (!staff) return <main className="mx-auto max-w-3xl px-5 pt-32 text-muted-foreground">Staff only.</main>;

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });
  const banned = new Set((data?.bans ?? []).map((b) => b.user_id));
  const emailOf = (id: string | null) => data?.profiles.find((p) => p.id === id)?.email ?? "—";

  const toggleBan = async (id: string) => {
    const { data: me } = await supabase.auth.getUser();
    const { error } = banned.has(id)
      ? await supabase.from("banned_users").delete().eq("user_id", id)
      : await supabase.from("banned_users").insert({ user_id: id, banned_by: me.user?.id ?? null });
    if (error) toast.error(error.message); else refresh();
  };
  const addWord = async () => {
    if (!word.trim()) return;
    const { error } = await supabase.from("banned_words").insert({ word: word.trim().toLowerCase() });
    if (error) toast.error(error.message); else { setWord(""); refresh(); }
  };
  const delWord = async (id: string) => {
    const { error } = await supabase.from("banned_words").delete().eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-4 pb-24 pt-28 sm:px-5">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-accent">Control room</p>
          <h1 className="mt-2 text-5xl font-medium glow-text">Admin</h1>
        </div>
        {isAdmin && <Button asChild size="sm" variant="secondary"><Link to="/ingest">Ingest a PDF</Link></Button>}
      </header>

      <section className="glass rounded-2xl p-5">
        <h2 className="mb-3 text-2xl">Members</h2>
        <ul className="grid gap-2">
          {(data?.profiles ?? []).map((p) => (
            <li key={p.id} className="flex items-center gap-3 text-sm">
              <span className="min-w-0 flex-1 truncate">{p.display_name || p.email}</span>
              <Button size="sm" variant={banned.has(p.id) ? "secondary" : "destructive"} onClick={() => toggleBan(p.id)}>
                {banned.has(p.id) ? "Unblock" : "Block"}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass rounded-2xl p-5">
        <h2 className="mb-3 text-2xl">Banned words</h2>
        <div className="mb-3 flex gap-2">
          <Input placeholder="Add a word" value={word} onChange={(e) => setWord(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addWord()} />
          <Button onClick={addWord}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(data?.words ?? []).map((w) => (
            <span key={w.id} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm">
              {w.word}
              <button aria-label={`Remove ${w.word}`} onClick={() => delWord(w.id)}><Trash2 className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      </section>

      <section className="glass rounded-2xl p-5">
        <h2 className="mb-3 text-2xl">Recent activity</h2>
        <ul className="grid gap-1 text-sm">
          {(data?.log ?? []).map((l) => (
            <li key={l.id} className="flex gap-3">
              <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
              <span className="truncate">{emailOf(l.user_id)} — {l.action}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
