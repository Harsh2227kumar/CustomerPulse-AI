// Types for BankComplain AI

export type ComplaintStatus = 'new' | 'assigned' | 'in_progress' | 'pending_customer' | 'resolved' | 'closed';
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical';
export type ComplaintChannel = 'email' | 'whatsapp' | 'phone' | 'branch' | 'app' | 'web' | 'api' | 'manual';
export type ComplaintCategory = 'loan' | 'account' | 'card' | 'transfer' | 'kyc' | 'fraud' | 'other';
export type Sentiment = 'positive' | 'neutral' | 'negative' | 'angry';
export type SLAStatus = 'on_track' | 'at_risk' | 'breached';

export interface Complaint {
  id: string;
  ticket_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  account_number: string;
  channel: ComplaintChannel;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  category: ComplaintCategory;
  sub_category: string;
  product: string;
  subject: string;
  body: string;
  sentiment: Sentiment;
  sentiment_score: number;
  severity_score: number;
  ai_summary: string;
  ai_key_issues: string[];
  ai_draft_response?: string;
  assigned_to?: string;
  assigned_agent_name?: string;
  sla_deadline: string;
  sla_status: SLAStatus;
  sla_hours_remaining: number;
  first_response_at?: string;
  resolved_at?: string;
  closed_at?: string;
  resolution_notes?: string;
  tags: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  complaint_id: string;
  direction: 'inbound' | 'outbound';
  channel: ComplaintChannel;
  sender_name: string;
  sender_type: 'customer' | 'agent' | 'system' | 'ai';
  content: string;
  is_internal_note: boolean;
  is_ai_drafted: boolean;
  sent_at: string;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  role: 'agent' | 'supervisor' | 'manager' | 'admin';
  department: string;
  avatar_url?: string;
  is_active: boolean;
  current_load: number;
  max_complaints: number;
}

export interface AuditLogEntry {
  id: string;
  complaint_id: string;
  actor_name: string;
  action: string;
  description: string;
  created_at: string;
}
