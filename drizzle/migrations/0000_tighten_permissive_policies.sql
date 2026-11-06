DROP POLICY IF EXISTS "Sync update lore_notes" ON public.lore_notes;
CREATE POLICY "Staff update lore_notes" ON public.lore_notes FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Sync update timeline_events" ON public.timeline_events;
CREATE POLICY "Staff update timeline_events" ON public.timeline_events FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Sync update entities" ON public.entities;
CREATE POLICY "Staff update entities" ON public.entities FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Sync update ingest_jobs" ON public.ingest_jobs;
CREATE POLICY "Staff update ingest_jobs" ON public.ingest_jobs FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "public read pdf_vault" ON public.pdf_vault;
CREATE POLICY "signed-in read pdf_vault" ON public.pdf_vault FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "members insert posts" ON public.posts;
CREATE POLICY "members insert posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND NOT public.is_banned(auth.uid()));
DROP POLICY IF EXISTS "members insert post_votes" ON public.post_votes;
CREATE POLICY "members insert post_votes" ON public.post_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "members insert activity_log" ON public.activity_log;
CREATE POLICY "members insert activity_log" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "members read profiles" ON public.profiles;
CREATE POLICY "own or staff read profiles" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "comments readable" ON public.comments;

DROP POLICY IF EXISTS "public read banned_words" ON public.banned_words;
DROP POLICY IF EXISTS "words readable" ON public.banned_words;
CREATE POLICY "staff read banned_words" ON public.banned_words FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "vault files read" ON storage.objects;
CREATE POLICY "vault files read" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'vault' AND auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.vault_documents d WHERE d.file_path = objects.name AND d.is_public AND d.downloadable)
  )
);