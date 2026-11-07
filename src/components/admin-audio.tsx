import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Music, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { sfx, ambientStart, ambientStop, ambientPlaying } from "@/lib/scu-audio";
import type { Json } from "@/integrations/supabase/types";

const KEY = "audio_settings";

interface AudioSettings {
  masterVolume: number; // 0-100
  ambientEnabled: boolean;
  sfxEnabled: boolean;
}

const DEFAULTS: AudioSettings = { masterVolume: 70, ambientEnabled: true, sfxEnabled: true };

/** Admin audio control center — persisted to app_settings['audio_settings']. */
export function AdminAudio() {
  const qc = useQueryClient();
  const [s, setS] = useState<AudioSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const cur = s ?? DEFAULTS;

  const save = async (next: AudioSettings) => {
    setS(next);
    setSaving(true);
    try {
      const { error } = await supabase.from("app_settings").upsert({ key: KEY, value: next as unknown as Json, updated_at: new Date().toISOString() });
      if (error) throw error;
      // Apply live: ambient respects toggle immediately.
      if (!next.ambientEnabled && ambientPlaying()) ambientStop();
      else if (next.ambientEnabled && !ambientPlaying()) ambientStart();
      toast.success("Audio settings saved.");
      void qc.invalidateQueries({ queryKey: ["app-settings"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save audio settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl"><Volume2 className="h-5 w-5 text-accent" />Audio Control</h2>
          <p className="text-xs text-muted-foreground">Ambient bed, SFX engine and tier sounds — live for all visitors.</p>
        </div>
        <Button size="sm" onClick={() => void save(cur)} disabled={saving}>{saving ? "Saving…" : "Save audio"}</Button>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Master volume — {cur.masterVolume}%</Label>
          <input type="range" min={0} max={100} value={cur.masterVolume} onChange={(e) => setS({ ...cur, masterVolume: Number(e.target.value) })} className="h-1.5 w-full accent-rose-500" />
        </div>
        <div className="flex items-end gap-4 pb-1">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={cur.ambientEnabled} onChange={(e) => setS({ ...cur, ambientEnabled: e.target.checked })} className="accent-rose-500" />
            Ambient bed
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={cur.sfxEnabled} onChange={(e) => setS({ ...cur, sfxEnabled: e.target.checked })} className="accent-rose-500" />
            UI &amp; tier SFX
          </label>
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button size="sm" variant="secondary" onClick={() => sfx.click()}>Preview click</Button>
          <Button size="sm" variant="secondary" onClick={() => sfx.angel()}>Preview Angel chime</Button>
          <Button size="sm" variant="secondary" onClick={() => sfx.mythic()}>Preview Mythic pulse</Button>
          <Button size="sm" variant="secondary" onClick={() => sfx.whoosh()}>Preview whoosh</Button>
          <Button size="sm" variant="secondary" onClick={() => (ambientPlaying() ? ambientStop() : ambientStart())}>
            <Music className="h-4 w-4" /> {ambientPlaying() ? "Stop ambient" : "Play ambient"}
          </Button>
        </div>
      </div>
    </section>
  );
}
