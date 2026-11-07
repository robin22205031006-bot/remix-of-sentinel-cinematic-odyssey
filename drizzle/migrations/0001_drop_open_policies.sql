DROP POLICY IF EXISTS "public read pdf_vault" ON public.pdf_vault;
DROP POLICY IF EXISTS "Sync insert lore_notes" ON public.lore_notes;
DROP POLICY IF EXISTS "Sync insert timeline_events" ON public.timeline_events;
DROP POLICY IF EXISTS "Sync insert entities" ON public.entities;
DROP POLICY IF EXISTS "Sync insert ingest_jobs" ON public.ingest_jobs;
DROP POLICY IF EXISTS "members insert posts" ON public.posts;
DROP POLICY IF EXISTS "public read banned_words" ON public.banned_words;
DROP POLICY IF EXISTS "members read profiles" ON public.profiles;
DROP POLICY IF EXISTS "members insert post_votes" ON public.post_votes;
DROP POLICY IF EXISTS "members insert activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "members insert comments" ON public.comments;

DROP POLICY IF EXISTS "posts insert own" ON public.posts;
CREATE POLICY "posts insert own" ON public.posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND NOT public.is_banned(auth.uid()));
DROP POLICY IF EXISTS "votes insert own" ON public.post_votes;
CREATE POLICY "votes insert own" ON public.post_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "lore staff insert" ON public.lore_notes;
CREATE POLICY "lore staff insert" ON public.lore_notes FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "timeline staff insert" ON public.timeline_events;
CREATE POLICY "timeline staff insert" ON public.timeline_events FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "pdf_vault signed-in read" ON public.pdf_vault;
DROP POLICY IF EXISTS "profiles owner or staff read" ON public.profiles;
CREATE POLICY "profiles owner or staff read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "vault files read" ON storage.objects;
CREATE POLICY "vault files read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'vault' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.vault_documents d WHERE d.file_path = objects.name AND d.is_public AND d.downloadable)));