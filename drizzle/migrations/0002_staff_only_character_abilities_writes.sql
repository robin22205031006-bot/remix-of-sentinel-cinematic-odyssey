DROP POLICY IF EXISTS "members delete character_abilities" ON public.character_abilities;
DROP POLICY IF EXISTS "members insert character_abilities" ON public.character_abilities;
DROP POLICY IF EXISTS "members update character_abilities" ON public.character_abilities;
CREATE POLICY "staff insert character_abilities" ON public.character_abilities FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update character_abilities" ON public.character_abilities FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff delete character_abilities" ON public.character_abilities FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));