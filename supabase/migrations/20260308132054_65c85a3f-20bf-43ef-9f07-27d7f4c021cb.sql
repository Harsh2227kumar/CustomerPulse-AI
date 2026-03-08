
-- Complaint status enum
CREATE TYPE public.complaint_status AS ENUM ('new', 'assigned', 'in_progress', 'pending_customer', 'resolved', 'closed');
CREATE TYPE public.complaint_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.complaint_channel AS ENUM ('email', 'whatsapp', 'phone', 'branch', 'app', 'web', 'api', 'manual');
CREATE TYPE public.complaint_category AS ENUM ('loan', 'account', 'card', 'transfer', 'kyc', 'fraud', 'other');
CREATE TYPE public.sentiment_type AS ENUM ('positive', 'neutral', 'negative', 'angry');
CREATE TYPE public.sla_status_type AS ENUM ('on_track', 'at_risk', 'breached');

-- Customers table
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  account_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Agents table
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  role app_role NOT NULL DEFAULT 'agent',
  department text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  current_load integer NOT NULL DEFAULT 0,
  max_complaints integer NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Complaints table
CREATE TABLE public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id text NOT NULL UNIQUE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  account_number text,
  channel complaint_channel NOT NULL DEFAULT 'manual',
  status complaint_status NOT NULL DEFAULT 'new',
  priority complaint_priority NOT NULL DEFAULT 'medium',
  category complaint_category NOT NULL DEFAULT 'other',
  sub_category text,
  product text,
  subject text NOT NULL,
  body text NOT NULL,
  sentiment sentiment_type DEFAULT 'neutral',
  sentiment_score numeric(4,2) DEFAULT 0,
  severity_score integer DEFAULT 0,
  ai_summary text,
  ai_key_issues text[] DEFAULT '{}',
  ai_draft_response text,
  assigned_to uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  assigned_agent_name text,
  sla_deadline timestamptz,
  sla_status sla_status_type NOT NULL DEFAULT 'on_track',
  sla_hours_remaining numeric(6,1) DEFAULT 48,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  resolution_notes text,
  tags text[] DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Messages table
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  channel complaint_channel NOT NULL DEFAULT 'email',
  sender_name text NOT NULL,
  sender_type text NOT NULL DEFAULT 'customer' CHECK (sender_type IN ('customer', 'agent', 'system', 'ai')),
  content text NOT NULL,
  is_internal_note boolean NOT NULL DEFAULT false,
  is_ai_drafted boolean NOT NULL DEFAULT false,
  sent_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Audit log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  actor_name text NOT NULL,
  action text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- SLA Rules table
CREATE TABLE public.sla_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category complaint_category,
  priority complaint_priority,
  resolution_hours integer NOT NULL DEFAULT 48,
  first_response_hours integer NOT NULL DEFAULT 4,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sla_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Authenticated users can read all, only admins/managers can modify
CREATE POLICY "Authenticated users can read customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage customers" ON public.customers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Authenticated users can read agents" ON public.agents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage agents" ON public.agents FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read complaints" ON public.complaints FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert complaints" ON public.complaints FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update complaints" ON public.complaints FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read messages" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read audit_log" ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read sla_rules" ON public.sla_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sla_rules" ON public.sla_rules FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Triggers for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sla_rules_updated_at BEFORE UPDATE ON public.sla_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ticket ID sequence function
CREATE OR REPLACE FUNCTION public.generate_ticket_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_id FROM 'CMP-\d{4}-(\d+)') AS integer)), 0) + 1
  INTO next_num
  FROM public.complaints;
  
  NEW.ticket_id := 'CMP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_num::text, 6, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_complaint_ticket_id
BEFORE INSERT ON public.complaints
FOR EACH ROW
WHEN (NEW.ticket_id IS NULL OR NEW.ticket_id = '')
EXECUTE FUNCTION generate_ticket_id();
