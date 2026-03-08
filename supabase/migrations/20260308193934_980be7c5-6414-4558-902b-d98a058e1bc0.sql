
-- Fix 1: Remove unassigned complaints visibility for regular agents
DROP POLICY IF EXISTS "Role-scoped read complaints" ON public.complaints;
CREATE POLICY "Role-scoped read complaints" ON public.complaints
  FOR SELECT USING (
    public.has_supervisor_access(auth.uid())
    OR created_by = auth.uid()
    OR assigned_to = public.get_agent_id(auth.uid())
  );

-- Fix 2: Scope ALL message reads (not just internal notes) to related users
DROP POLICY IF EXISTS "Scoped read messages" ON public.messages;
CREATE POLICY "Scoped read messages" ON public.messages
  FOR SELECT USING (
    public.has_supervisor_access(auth.uid())
    OR public.is_assigned_to_complaint(auth.uid(), complaint_id)
    OR EXISTS (
      SELECT 1 FROM public.complaints WHERE id = messages.complaint_id AND created_by = auth.uid()
    )
  );

-- Fix 3: Restrict agent table - create a limited view for non-supervisors
DROP POLICY IF EXISTS "Authenticated users can read agents" ON public.agents;

-- Supervisors+ can read all agent data
CREATE POLICY "Supervisors can read all agents" ON public.agents
  FOR SELECT USING (public.has_supervisor_access(auth.uid()));

-- Regular agents can only see their own record
CREATE POLICY "Agents can read own record" ON public.agents
  FOR SELECT USING (user_id = auth.uid());
