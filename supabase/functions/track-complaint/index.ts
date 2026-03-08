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

    const { ticket_id } = await req.json();
    if (!ticket_id || typeof ticket_id !== 'string') {
      return new Response(JSON.stringify({ error: "Valid ticket_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize: only allow CMP-YYYY-NNNNNN format
    if (!/^CMP-\d{4}-\d{6}$/.test(ticket_id)) {
      return new Response(JSON.stringify({ error: "Invalid ticket ID format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch complaint (only safe public fields)
    const complaintResp = await fetch(
      `${SUPABASE_URL}/rest/v1/complaints?ticket_id=eq.${encodeURIComponent(ticket_id)}&select=ticket_id,customer_name,subject,category,priority,status,sla_status,sla_hours_remaining,created_at,updated_at,resolved_at,closed_at`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    if (!complaintResp.ok) throw new Error("Failed to fetch complaint");
    const complaints = await complaintResp.json();

    if (complaints.length === 0) {
      return new Response(JSON.stringify({ error: "Complaint not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const complaint = complaints[0];

    // Fetch public messages only (exclude internal notes)
    const msgResp = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?complaint_id=eq.${encodeURIComponent(complaint.ticket_id)}&is_internal_note=eq.false&order=sent_at.asc&select=direction,sender_name,sender_type,content,sent_at`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    // Messages need complaint_id (uuid), not ticket_id
    // Fetch complaint ID first
    const idResp = await fetch(
      `${SUPABASE_URL}/rest/v1/complaints?ticket_id=eq.${encodeURIComponent(ticket_id)}&select=id`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    const idData = await idResp.json();
    const complaintUuid = idData[0]?.id;

    let messages: any[] = [];
    if (complaintUuid) {
      const messagesResp = await fetch(
        `${SUPABASE_URL}/rest/v1/messages?complaint_id=eq.${complaintUuid}&is_internal_note=eq.false&order=sent_at.asc&select=direction,sender_name,sender_type,content,sent_at`,
        {
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
          },
        }
      );
      if (messagesResp.ok) {
        messages = await messagesResp.json();
      }
    }

    return new Response(JSON.stringify({
      success: true,
      complaint: {
        ...complaint,
        // Mask customer name for privacy (show first name + initial)
        customer_name: complaint.customer_name?.split(' ').map((n: string, i: number) => i === 0 ? n : n[0] + '.').join(' '),
      },
      messages: messages.map((m: any) => ({
        direction: m.direction,
        sender_name: m.sender_type === 'customer' ? m.sender_name : 'Support Agent',
        content: m.content,
        sent_at: m.sent_at,
      })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("track-complaint error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
