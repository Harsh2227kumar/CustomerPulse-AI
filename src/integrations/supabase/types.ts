export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_load: number
          department: string | null
          email: string
          id: string
          is_active: boolean
          max_complaints: number
          name: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_load?: number
          department?: string | null
          email: string
          id?: string
          is_active?: boolean
          max_complaints?: number
          name: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_load?: number
          department?: string | null
          email?: string
          id?: string
          is_active?: boolean
          max_complaints?: number
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_name: string
          complaint_id: string
          created_at: string
          description: string
          id: string
        }
        Insert: {
          action: string
          actor_name: string
          complaint_id: string
          created_at?: string
          description: string
          id?: string
        }
        Update: {
          action?: string
          actor_name?: string
          complaint_id?: string
          created_at?: string
          description?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          account_number: string | null
          ai_draft_response: string | null
          ai_key_issues: string[] | null
          ai_summary: string | null
          assigned_agent_name: string | null
          assigned_to: string | null
          body: string
          category: Database["public"]["Enums"]["complaint_category"]
          channel: Database["public"]["Enums"]["complaint_channel"]
          closed_at: string | null
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          first_response_at: string | null
          id: string
          priority: Database["public"]["Enums"]["complaint_priority"]
          product: string | null
          resolution_notes: string | null
          resolved_at: string | null
          sentiment: Database["public"]["Enums"]["sentiment_type"] | null
          sentiment_score: number | null
          severity_score: number | null
          sla_deadline: string | null
          sla_hours_remaining: number | null
          sla_status: Database["public"]["Enums"]["sla_status_type"]
          status: Database["public"]["Enums"]["complaint_status"]
          sub_category: string | null
          subject: string
          tags: string[] | null
          ticket_id: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          ai_draft_response?: string | null
          ai_key_issues?: string[] | null
          ai_summary?: string | null
          assigned_agent_name?: string | null
          assigned_to?: string | null
          body: string
          category?: Database["public"]["Enums"]["complaint_category"]
          channel?: Database["public"]["Enums"]["complaint_channel"]
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          first_response_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["complaint_priority"]
          product?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          sentiment?: Database["public"]["Enums"]["sentiment_type"] | null
          sentiment_score?: number | null
          severity_score?: number | null
          sla_deadline?: string | null
          sla_hours_remaining?: number | null
          sla_status?: Database["public"]["Enums"]["sla_status_type"]
          status?: Database["public"]["Enums"]["complaint_status"]
          sub_category?: string | null
          subject: string
          tags?: string[] | null
          ticket_id: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          ai_draft_response?: string | null
          ai_key_issues?: string[] | null
          ai_summary?: string | null
          assigned_agent_name?: string | null
          assigned_to?: string | null
          body?: string
          category?: Database["public"]["Enums"]["complaint_category"]
          channel?: Database["public"]["Enums"]["complaint_channel"]
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          first_response_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["complaint_priority"]
          product?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          sentiment?: Database["public"]["Enums"]["sentiment_type"] | null
          sentiment_score?: number | null
          severity_score?: number | null
          sla_deadline?: string | null
          sla_hours_remaining?: number | null
          sla_status?: Database["public"]["Enums"]["sla_status_type"]
          status?: Database["public"]["Enums"]["complaint_status"]
          sub_category?: string | null
          subject?: string
          tags?: string[] | null
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          account_number: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          channel: Database["public"]["Enums"]["complaint_channel"]
          complaint_id: string
          content: string
          direction: string
          id: string
          is_ai_drafted: boolean
          is_internal_note: boolean
          sender_name: string
          sender_type: string
          sent_at: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["complaint_channel"]
          complaint_id: string
          content: string
          direction?: string
          id?: string
          is_ai_drafted?: boolean
          is_internal_note?: boolean
          sender_name: string
          sender_type?: string
          sent_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["complaint_channel"]
          complaint_id?: string
          content?: string
          direction?: string
          id?: string
          is_ai_drafted?: boolean
          is_internal_note?: boolean
          sender_name?: string
          sender_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sla_rules: {
        Row: {
          category: Database["public"]["Enums"]["complaint_category"] | null
          created_at: string
          first_response_hours: number
          id: string
          is_active: boolean
          name: string
          priority: Database["public"]["Enums"]["complaint_priority"] | null
          resolution_hours: number
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["complaint_category"] | null
          created_at?: string
          first_response_hours?: number
          id?: string
          is_active?: boolean
          name: string
          priority?: Database["public"]["Enums"]["complaint_priority"] | null
          resolution_hours?: number
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["complaint_category"] | null
          created_at?: string
          first_response_hours?: number
          id?: string
          is_active?: boolean
          name?: string
          priority?: Database["public"]["Enums"]["complaint_priority"] | null
          resolution_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "supervisor" | "agent"
      complaint_category:
        | "loan"
        | "account"
        | "card"
        | "transfer"
        | "kyc"
        | "fraud"
        | "other"
      complaint_channel:
        | "email"
        | "whatsapp"
        | "phone"
        | "branch"
        | "app"
        | "web"
        | "api"
        | "manual"
      complaint_priority: "low" | "medium" | "high" | "critical"
      complaint_status:
        | "new"
        | "assigned"
        | "in_progress"
        | "pending_customer"
        | "resolved"
        | "closed"
      sentiment_type: "positive" | "neutral" | "negative" | "angry"
      sla_status_type: "on_track" | "at_risk" | "breached"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "supervisor", "agent"],
      complaint_category: [
        "loan",
        "account",
        "card",
        "transfer",
        "kyc",
        "fraud",
        "other",
      ],
      complaint_channel: [
        "email",
        "whatsapp",
        "phone",
        "branch",
        "app",
        "web",
        "api",
        "manual",
      ],
      complaint_priority: ["low", "medium", "high", "critical"],
      complaint_status: [
        "new",
        "assigned",
        "in_progress",
        "pending_customer",
        "resolved",
        "closed",
      ],
      sentiment_type: ["positive", "neutral", "negative", "angry"],
      sla_status_type: ["on_track", "at_risk", "breached"],
    },
  },
} as const
