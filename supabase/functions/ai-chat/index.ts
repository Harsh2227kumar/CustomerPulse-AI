import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages, context_type } = await req.json();
    if (!messages || !Array.isArray(messages)) throw new Error("messages array is required");

    const headers = {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    };

    // Fetch live data for context
    const [complaintsRes, agentsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/complaints?order=created_at.desc&limit=50&select=id,ticket_id,subject,category,priority,status,sentiment,severity_score,sla_status,sla_hours_remaining,assigned_agent_name,customer_name,created_at,ai_summary,ai_key_issues`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/agents?is_active=eq.true&select=name,department,current_load,max_complaints,role`, { headers }),
    ]);

    const complaints = complaintsRes.ok ? await complaintsRes.json() : [];
    const agents = agentsRes.ok ? await agentsRes.json() : [];

    const openComplaints = complaints.filter((c: any) => !['resolved', 'closed'].includes(c.status));
    const breached = complaints.filter((c: any) => c.sla_status === 'breached');

    const systemPrompt = `You are an AI assistant for a banking complaint management system called BankComplain AI. You help agents and managers understand complaint data, find patterns, make decisions, and resolve issues faster.

LIVE DATA CONTEXT:
- Total complaints: ${complaints.length} (${openComplaints.length} open, ${breached.length} SLA breached)
- Active agents: ${agents.length}
- Agent workloads: ${agents.map((a: any) => `${a.name}: ${a.current_load}/${a.max_complaints}`).join(', ')}

RECENT COMPLAINTS:
${complaints.slice(0, 20).map((c: any) => `[${c.ticket_id}] ${c.status} | ${c.category}/${c.priority} | "${c.subject}" | Customer: ${c.customer_name} | Agent: ${c.assigned_agent_name || 'Unassigned'} | SLA: ${c.sla_status} (${c.sla_hours_remaining}h) | Sentiment: ${c.sentiment} | Severity: ${c.severity_score}/10${c.ai_summary ? ` | Summary: ${c.ai_summary}` : ''}`).join('\n')}

You can:
- Answer questions about complaints, trends, agents, SLA status
- Suggest which complaints to prioritize
- Recommend agent assignments
- Identify patterns and root causes
- Help draft escalation plans
- Provide regulatory compliance guidance (RBI guidelines)

Be concise, data-driven, and actionable. Use markdown formatting. Reference specific ticket IDs when relevant.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Payment required. Please add AI credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error(`AI gateway error: ${status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
