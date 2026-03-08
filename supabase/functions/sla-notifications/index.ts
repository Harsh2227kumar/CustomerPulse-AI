import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { type, complaint_id, agent_email, agent_name, ticket_id, subject, customer_name, sla_hours_remaining } = await req.json();

    if (type === "sla_warning") {
      // Log SLA warning to audit log
      await fetch(`${SUPABASE_URL}/rest/v1/audit_log`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          complaint_id,
          actor_name: "System",
          action: "sla_warning",
          description: `SLA warning: ${ticket_id} has ${sla_hours_remaining}h remaining. Assigned to ${agent_name || 'unassigned'}. Customer: ${customer_name}, Subject: ${subject}`,
        }),
      });

      // Update SLA status to at_risk if approaching breach
      if (sla_hours_remaining !== undefined && sla_hours_remaining <= 4 && sla_hours_remaining > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/complaints?id=eq.${complaint_id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ sla_status: "at_risk" }),
        });
      }

      // Mark as breached
      if (sla_hours_remaining !== undefined && sla_hours_remaining <= 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/complaints?id=eq.${complaint_id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ sla_status: "breached" }),
        });
      }

      console.log(`SLA notification logged for ${ticket_id} — ${sla_hours_remaining}h remaining`);

      return new Response(JSON.stringify({ 
        success: true, 
        message: `SLA warning processed for ${ticket_id}`,
        notification: {
          type: "sla_warning",
          ticket_id,
          agent_name,
          agent_email,
          customer_name,
          subject,
          sla_hours_remaining,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "assignment") {
      // Log assignment notification to audit log
      await fetch(`${SUPABASE_URL}/rest/v1/audit_log`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          complaint_id,
          actor_name: "System",
          action: "assignment_notification",
          description: `Assignment notification sent to ${agent_name} (${agent_email}) for ${ticket_id}: ${subject}`,
        }),
      });

      console.log(`Assignment notification logged for ${ticket_id} to ${agent_name}`);

      return new Response(JSON.stringify({
        success: true,
        message: `Assignment notification processed for ${ticket_id}`,
        notification: {
          type: "assignment",
          ticket_id,
          agent_name,
          agent_email,
          customer_name,
          subject,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid notification type" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sla-notifications error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
