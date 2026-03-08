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
    const headers = {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    };

    // Fetch open complaints (not resolved/closed)
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/complaints?status=not.in.(resolved,closed)&select=id,ticket_id,subject,customer_name,assigned_agent_name,sla_deadline,sla_status,sla_hours_remaining`,
      { headers }
    );
    const complaints = await res.json();
    if (!Array.isArray(complaints)) {
      console.error("Unexpected response:", complaints);
      return new Response(JSON.stringify({ error: "Failed to fetch complaints" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    const now = new Date();

    for (const c of complaints) {
      if (!c.sla_deadline) continue;

      const deadline = new Date(c.sla_deadline);
      const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      const roundedHours = Math.round(hoursRemaining * 10) / 10;

      // Update sla_hours_remaining
      let newStatus = c.sla_status;
      if (hoursRemaining <= 0) newStatus = "breached";
      else if (hoursRemaining <= 4) newStatus = "at_risk";
      else newStatus = "on_track";

      if (roundedHours !== c.sla_hours_remaining || newStatus !== c.sla_status) {
        await fetch(`${SUPABASE_URL}/rest/v1/complaints?id=eq.${c.id}`, {
          method: "PATCH",
          headers: { ...headers, Prefer: "return=minimal" },
          body: JSON.stringify({
            sla_hours_remaining: roundedHours,
            sla_status: newStatus,
          }),
        });
        updated++;
      }

      // Log warning for at_risk or breached
      if ((newStatus === "at_risk" || newStatus === "breached") && newStatus !== c.sla_status) {
        await fetch(`${SUPABASE_URL}/rest/v1/audit_log`, {
          method: "POST",
          headers: { ...headers, Prefer: "return=minimal" },
          body: JSON.stringify({
            complaint_id: c.id,
            actor_name: "SLA Monitor",
            action: newStatus === "breached" ? "sla_breached" : "sla_warning",
            description: `SLA ${newStatus === "breached" ? "BREACHED" : "at risk"}: ${c.ticket_id} — ${roundedHours}h remaining. Agent: ${c.assigned_agent_name || "unassigned"}`,
          }),
        });
      }
    }

    console.log(`SLA monitor: checked ${complaints.length} complaints, updated ${updated}`);

    return new Response(JSON.stringify({
      success: true,
      checked: complaints.length,
      updated,
      timestamp: now.toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sla-monitor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});