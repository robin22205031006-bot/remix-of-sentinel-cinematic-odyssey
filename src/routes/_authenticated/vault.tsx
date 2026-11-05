import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-admin";

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "PDF Vault — Sentinels Cinematic Universe" },
      { name: "description", content: "Scripts, lore books and documents from the SCU archive." },
      { property: "og:title", content: "PDF Vault — SCU" },
      { property: "og:description", content: "Scripts, lore books and documents from the SCU archive." },
    ],
  }),
  component: Vault,
});

function Vault() {
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["vault"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vault_documents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [downloadable, setDownloadable] = useState(true);
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const up = await supabase.storage.from("vault").upload(path, file, { contentType: file.type || "application/pdf" });
    if (up.error) { setBusy(false); toast.error(up.error.message); return; }
    const { error } = await supabase.from("vault_documents").insert({ title: title.trim() || file.name, file_path: path, is_public: isPublic, downloadable });
    setBusy(false);
    if (error) {
      await supabase.storage.from("vault").remove([path]);
      toast.error(error.message); return;
    }
    setFile(null); setTitle("");
    qc.invalidateQueries({ queryKey: ["vault"] });
    qc.invalidateQueries({ queryKey: ["search-index"] });
    toast.success("Uploaded");
  };

  const open = async (path: string) => {
    const { data: s, error } = await supabase.storage.from("vault").createSignedUrl(path, 600);
    if (error || !s) { toast.error("This document isn't available for download."); return; }
    window.open(s.signedUrl, "_blank", "noopener");
  };

  const toggle = async (id: string, patch: { is_public?: boolean; downloadable?: boolean }) => {
    const { error } = await supabase.from("vault_documents").update(patch).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["vault"] });
  };

  const del = async (id: string, path: string) => {
    const removal = await supabase.storage.from("vault").remove([path]);
    if (removal.error) { toast.error(removal.error.message); return; }
    const { error } = await supabase.from("vault_documents").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["vault"] });
    qc.invalidateQueries({ queryKey: ["search-index"] });
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-5">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.25em] text-accent">Archive</p>
        <h1 className="mt-2 text-5xl font-medium glow-text">PDF Vault</h1>
      </header>

      {isAdmin && (
        <section className="glass mb-8 grid gap-3 rounded-2xl p-5">
          <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div className="flex flex-wrap items-center gap-5 text-sm">
            <Label className="flex items-center gap-2"><Switch checked={isPublic} onCheckedChange={setIsPublic} />Visible to members</Label>
            <Label className="flex items-center gap-2"><Switch checked={downloadable} onCheckedChange={setDownloadable} />Downloadable</Label>
            <Button className="ml-auto" size="sm" disabled={!file || busy} onClick={upload}><Upload className="h-4 w-4" />{busy ? "Uploading…" : "Upload"}</Button>
          </div>
        </section>
      )}

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : !data?.length ? (
        <p className="text-muted-foreground">No documents in the vault yet.</p>
      ) : (
        <ul className="grid gap-3">
          {data.map((d) => (
            <li key={d.id} className="glass flex items-center gap-3 rounded-xl p-4">
              <FileText className="h-5 w-5 shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{d.title}</p>
                {isAdmin && <p className="text-xs text-muted-foreground">{d.is_public ? "Visible" : "Hidden"} · {d.downloadable ? "Downloadable" : "View locked"}</p>}
              </div>
              {isAdmin && (
                <>
                  <Switch aria-label="Visible" checked={d.is_public} onCheckedChange={(v) => toggle(d.id, { is_public: v })} />
                  <Switch aria-label="Downloadable" checked={d.downloadable} onCheckedChange={(v) => toggle(d.id, { downloadable: v })} />
                </>
              )}
              {(isAdmin || d.downloadable) && (
                <Button size="icon" variant="ghost" aria-label="Download" onClick={() => open(d.file_path)}><Download className="h-4 w-4" /></Button>
              )}
              {isAdmin && <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => del(d.id, d.file_path)}><Trash2 className="h-4 w-4" /></Button>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
