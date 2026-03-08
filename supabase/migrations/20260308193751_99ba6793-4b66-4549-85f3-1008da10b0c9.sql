
-- ============================================================
-- SECURITY UPGRADE: Fix all RLS policies
-- ============================================================

-- 1. Create helper function to check if user is agent assigned to a complaint
CREATE OR REPLACE FUNCTION public.is_assigned_to_complaint(_user_id uuid, _complaint_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.complaints c
    JOIN public.agents a ON a.id = c.assigned_to
    WHERE c.id = _complaint_id AND a.user_id = _user_id
  )
$$;

-- Helper: check if user has supervisor+ role
CREATE OR REPLACE FUNCTION public.has_supervisor_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'manager', 'supervisor')
  )
$$;

-- Helper: get agent id for a user
CREATE OR REPLACE FUNCTION public.get_agent_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.agents WHERE user_id = _user_id LIMIT 1
$$;

-- ============================================================
-- AGENTS TABLE - convert to PERMISSIVE
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage agents" ON public.agents;
DROP POLICY IF EXISTS "Authenticated users can read agents" ON public.agents;

CREATE POLICY "Admins can manage agents" ON public.agents
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read agents" ON public.agents
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- COMPLAINTS TABLE - scope access by role
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read complaints" ON public.complaints;
DROP POLICY IF EXISTS "Authenticated users can insert complaints" ON public.complaints;
DROP POLICY IF EXISTS "Authenticated users can update complaints" ON public.complaints;

-- Supervisors+ can read all complaints; agents only see assigned/created/unassigned
CREATE POLICY "Role-scoped read complaints" ON public.complaints
  FOR SELECT USING (
    public.has_supervisor_access(auth.uid())
    OR created_by = auth.uid()
    OR assigned_to = public.get_agent_id(auth.uid())
    OR assigned_to IS NULL
  );

CREATE POLICY "Authenticated users can insert complaints" ON public.complaints
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only assigned agent, creator, or supervisor+ can update
CREATE POLICY "Scoped update complaints" ON public.complaints
  FOR UPDATE USING (
    public.has_supervisor_access(auth.uid())
    OR created_by = auth.uid()
    OR assigned_to = public.get_agent_id(auth.uid())
  );

-- ============================================================
-- CUSTOMERS TABLE - scope reads
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;

CREATE POLICY "Admins can manage customers" ON public.customers
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

-- Supervisors+ can read all; agents can read customers linked to their complaints
CREATE POLICY "Scoped read customers" ON public.customers
  FOR SELECT USING (
    public.has_supervisor_access(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.complaints
      WHERE complaints.customer_id = customers.id
      AND (complaints.assigned_to = public.get_agent_id(auth.uid()) OR complaints.created_by = auth.uid())
    )
  );

-- ============================================================
-- MESSAGES TABLE - scope internal notes, restrict inserts
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.messages;

-- All authenticated can read non-internal messages; internal notes only for supervisor+ or assigned agent
CREATE POLICY "Scoped read messages" ON public.messages
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
      is_internal_note = false
      OR public.has_supervisor_access(auth.uid())
      OR public.is_assigned_to_complaint(auth.uid(), complaint_id)
    )
  );

-- Only assigned agent or supervisor+ can insert messages
CREATE POLICY "Scoped insert messages" ON public.messages
  FOR INSERT WITH CHECK (
    public.has_supervisor_access(auth.uid())
    OR public.is_assigned_to_complaint(auth.uid(), complaint_id)
    OR EXISTS (
      SELECT 1 FROM public.complaints WHERE id = complaint_id AND created_by = auth.uid()
    )
  );

-- ============================================================
-- AUDIT_LOG - restrict inserts to server-side or assigned users
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Authenticated users can read audit_log" ON public.audit_log;

-- Only supervisor+ can read audit logs; agents see logs for their complaints
CREATE POLICY "Scoped read audit_log" ON public.audit_log
  FOR SELECT USING (
    public.has_supervisor_access(auth.uid())
    OR public.is_assigned_to_complaint(auth.uid(), complaint_id)
    OR EXISTS (
      SELECT 1 FROM public.complaints WHERE id = complaint_id AND created_by = auth.uid()
    )
  );

-- Only users related to the complaint can insert audit entries
CREATE POLICY "Scoped insert audit_log" ON public.audit_log
  FOR INSERT WITH CHECK (
    public.has_supervisor_access(auth.uid())
    OR public.is_assigned_to_complaint(auth.uid(), complaint_id)
    OR EXISTS (
      SELECT 1 FROM public.complaints WHERE id = complaint_id AND created_by = auth.uid()
    )
  );

-- ============================================================
-- PROFILES TABLE - convert to PERMISSIVE
-- ============================================================
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- SLA_RULES TABLE - convert to PERMISSIVE
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage sla_rules" ON public.sla_rules;
DROP POLICY IF EXISTS "Authenticated users can read sla_rules" ON public.sla_rules;

CREATE POLICY "Admins can manage sla_rules" ON public.sla_rules
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Authenticated users can read sla_rules" ON public.sla_rules
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- USER_ROLES TABLE - convert to PERMISSIVE
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
