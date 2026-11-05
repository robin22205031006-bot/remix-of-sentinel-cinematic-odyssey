import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildUpdatePatch, filterGrounded, normalize, validLoreStatus } from "./lore-merge";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { loreExtractionPrompt, loreJsonSchema, parseLoreExtraction } from "./lore-extraction";

const kinds = ["character", "organization", "clan", "bloodline", "faction"] as const;

async function assertAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Only the admin can do this.");
}

export const analyzeLore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ text: z.string().min(20).max(400_000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: existing, error } = await context.supabase.from("entities").select("name, kind");
    if (error) throw new Error("The archive could not be loaded. Please try again.");
    const names = (existing ?? []).map((e) => `${e.name} (${e.kind})`).join("; ") || "none";

    const { generateGemini } = await import("./gemini.server");
    const raw = await generateGemini(process.env['GOOGLE_API_KEY'], {
      contents: [{ role: "user", parts: [{ text: `Existing archive entries: ${names}\n\nSTORY TEXT:\n${data.text}` }] }],
      config: {
        systemInstruction: loreExtractionPrompt,
        responseMimeType: "application/json",
        responseJsonSchema: loreJsonSchema,
      },
    });
    try {
      return parseLoreExtraction(raw, data.text);
    } catch {
      throw new Error("Gemini returned invalid lore data. Nothing was saved; analyze the PDF again.");
    }
  });

const applySchema = z.object({
  filename: z.string().max(300),
  source_text: z.string().min(20).max(400_000),
  new_entities: z.array(
    z.object({
      kind: z.enum(kinds),
      name: z.string(),
      alias: z.string().nullable(),
      role: z.string().nullable(),
      status: z.string().nullable(),
      description: z.string(),
      quote: z.string(),
    }),
  ),
  updates: z.array(
    z.object({ existing_name: z.string(), new_facts: z.string(), status: z.string().nullable(), quote: z.string() }),
  ),
  events: z.array(z.object({ title: z.string(), era: z.string().nullable(), description: z.string(), quote: z.string() })),
});

export const applyLore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => applySchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await assertAdmin(sb, context.userId);
    const src = data.filename;
    const grounded = filterGrounded(data, data.source_text);
    if (grounded.new_entities.length !== data.new_entities.length || grounded.updates.length !== data.updates.length || grounded.events.length !== data.events.length) {
      throw new Error("Some selected lore is no longer supported by the PDF. Analyze it again.");
    }
    const archive = await sb.from("entities").select("id, name, kind, status, locked_fields");
    if (archive.error) throw new Error("The archive could not be loaded. Nothing was saved.");
    const byName = new Map<string, NonNullable<typeof archive.data>>();
    for (const entry of archive.data ?? []) {
      const key = normalize(entry.name);
      byName.set(key, [...(byName.get(key) ?? []), entry]);
    }
    const find = (name: string) => {
      const matches = byName.get(normalize(name)) ?? [];
      if (matches.length > 1) throw new Error(`Multiple entries named ${name}. Resolve them before importing.`);
      return matches[0];
    };
    const checked = <T,>(result: { data: T; error: unknown }) => {
      if (result.error) throw new Error("The import could not finish. Some entries may have saved; review the archive before retrying.");
      return result.data;
    };
    // Resolve ambiguous names before performing any writes.
    for (const e of grounded.new_entities) find(e.name);
    for (const u of grounded.updates) find(u.existing_name);
    let created = 0, updated = 0, events = 0;

    for (const e of grounded.new_entities) {
      const dup = find(e.name);
      if (dup) {
        checked(await sb.from("lore_notes").insert({ entity_id: dup.id, text: e.description, source: src }));
        updated++;
        continue;
      }
      const isChar = e.kind === "character";
      const entry = checked(await sb.from("entities").insert({
        kind: e.kind,
        name: e.name,
        alias: e.alias,
        role: e.role,
        status: validLoreStatus(e.kind, e.status) ?? (isChar ? "Alive" : "Active"),
        description: e.description,
        image_url: null,
      }).select("id, name, kind, status, locked_fields").single());
      if (entry) byName.set(normalize(entry.name), [entry]);
      created++;
    }

    for (const u of grounded.updates) {
      const target = find(u.existing_name);
      if (!target) throw new Error(`The entry ${u.existing_name} no longer exists. Some entries may have saved; review the archive before retrying.`);
      if (u.new_facts.trim()) checked(await sb.from("lore_notes").insert({ entity_id: target.id, text: u.new_facts, source: src }));
      const patch = buildUpdatePatch(target, u);
      if (Object.keys(patch).length) checked(await sb.from("entities").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", target.id));
      updated++;
    }

    const last = checked(await sb.from("timeline_events").select("sort_order").order("sort_order", { ascending: false }).limit(1));
    let order = last?.[0]?.sort_order ?? 0;
    for (const ev of grounded.events) {
      checked(await sb.from("timeline_events").insert({
        title: ev.title, era: ev.era, description: ev.description, source: src, sort_order: ++order,
      }));
      events++;
    }

    checked(await sb.from("ingest_jobs").insert({ filename: src, summary: { created, updated, events } }));
    return { created, updated, events };
  });
