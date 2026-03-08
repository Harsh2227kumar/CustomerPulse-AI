
-- Tighten INSERT/UPDATE policies to require authenticated user context
DROP POLICY "Authenticated users can insert complaints" ON public.complaints;
DROP POLICY "Authenticated users can update complaints" ON public.complaints;
DROP POLICY "Authenticated users can insert messages" ON public.messages;
DROP POLICY "Authenticated users can insert audit_log" ON public.audit_log;

CREATE POLICY "Authenticated users can insert complaints" ON public.complaints FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update complaints" ON public.complaints FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
