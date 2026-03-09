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

    const headers = {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    };

    // Fetch all complaints for analysis
    const [complaintsRes, agentsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/complaints?order=created_at.desc&limit=200&select=id,ticket_id,subject,body,category,priority,status,sentiment,sentiment_score,severity_score,sla_status,sla_hours_remaining,assigned_agent_name,customer_name,created_at,resolved_at,closed_at,ai_key_issues,tags,channel`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/agents?is_active=eq.true&select=id,name,department,current_load,max_complaints,role`, { headers }),
    ]);

    const complaints = complaintsRes.ok ? await complaintsRes.json() : [];
    const agents = agentsRes.ok ? await agentsRes.json() : [];

    if (complaints.length === 0) {
      return new Response(JSON.stringify({ success: true, insights: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build comprehensive context
    const categoryDist: Record<string, number> = {};
    const sentimentDist: Record<string, number> = {};
    const priorityDist: Record<string, number> = {};
    const statusDist: Record<string, number> = {};
    const channelDist: Record<string, number> = {};
    const allIssues: string[] = [];
    let totalSeverity = 0;
    let breachedCount = 0;
    let resolvedCount = 0;
    const resolutionTimes: number[] = [];

    for (const c of complaints) {
      categoryDist[c.category] = (categoryDist[c.category] || 0) + 1;
      sentimentDist[c.sentiment || 'neutral'] = (sentimentDist[c.sentiment || 'neutral'] || 0) + 1;
      priorityDist[c.priority] = (priorityDist[c.priority] || 0) + 1;
      statusDist[c.status] = (statusDist[c.status] || 0) + 1;
      channelDist[c.channel] = (channelDist[c.channel] || 0) + 1;
      totalSeverity += c.severity_score || 0;
      if (c.sla_status === 'breached') breachedCount++;
      if (c.status === 'resolved' || c.status === 'closed') resolvedCount++;
      if (c.ai_key_issues) allIssues.push(...c.ai_key_issues);
      if (c.resolved_at && c.created_at) {
        const hours = (new Date(c.resolved_at).getTime() - new Date(c.created_at).getTime()) / 3600000;
        resolutionTimes.push(hours);
      }
    }

    const avgResolution = resolutionTimes.length > 0
      ? (resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length).toFixed(1)
      : 'N/A';

    // Issue frequency
    const issueFreq: Record<string, number> = {};
    allIssues.forEach(i => { issueFreq[i] = (issueFreq[i] || 0) + 1; });
    const topIssues = Object.entries(issueFreq).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const prompt = `You are a senior banking complaint analytics expert. Analyze this complaint data and provide actionable insights.

DATA SUMMARY (${complaints.length} total complaints):
- Categories: ${JSON.stringify(categoryDist)}
- Sentiments: ${JSON.stringify(sentimentDist)}
- Priorities: ${JSON.stringify(priorityDist)}
- Statuses: ${JSON.stringify(statusDist)}
- Channels: ${JSON.stringify(channelDist)}
- Avg severity: ${(totalSeverity / complaints.length).toFixed(1)}/10
- SLA breached: ${breachedCount}/${complaints.length} (${((breachedCount / complaints.length) * 100).toFixed(1)}%)
- Resolution rate: ${resolvedCount}/${complaints.length}
- Avg resolution time: ${avgResolution}h
- Top recurring issues: ${topIssues.map(([issue, count]) => `"${issue}" (${count}x)`).join(', ')}
- Active agents: ${agents.length}, avg load: ${agents.length > 0 ? (agents.reduce((sum: number, a: any) => sum + a.current_load, 0) / agents.length).toFixed(1) : 0}

RECENT COMPLAINT SAMPLES (last 10):
${complaints.slice(0, 10).map((c: any) => `- [${c.ticket_id}] ${c.category}/${c.priority}: "${c.subject}" | Sentiment: ${c.sentiment} | SLA: ${c.sla_status}`).join('\n')}

Provide:
1. Executive summary of complaint landscape
2. Top 3-5 emerging trends with evidence
3. Root cause analysis for recurring issues
4. Actionable recommendations ranked by impact
5. Risk alerts for potential systemic problems
6. Agent workload optimization suggestions`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a banking complaint analytics expert. Provide structured, data-driven insights with specific numbers and actionable recommendations." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "report_insights",
            description: "Return structured analytics insights",
            parameters: {
              type: "object",
              properties: {
                executive_summary: { type: "string", description: "2-3 sentence overview of the complaint landscape" },
                trends: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      severity: { type: "string", enum: ["info", "warning", "critical"] },
                      metric: { type: "string", description: "Key metric supporting this trend" },
                    },
                    required: ["title", "description", "severity", "metric"],
                    additionalProperties: false,
                  },
                },
                root_causes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      issue: { type: "string" },
                      cause: { type: "string" },
                      affected_count: { type: "integer" },
                      recommendation: { type: "string" },
                    },
                    required: ["issue", "cause", "affected_count", "recommendation"],
                    additionalProperties: false,
                  },
                },
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      action: { type: "string" },
                      impact: { type: "string", enum: ["high", "medium", "low"] },
                      effort: { type: "string", enum: ["high", "medium", "low"] },
                      rationale: { type: "string" },
                    },
                    required: ["action", "impact", "effort", "rationale"],
                    additionalProperties: false,
                  },
                },
                risk_alerts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      alert: { type: "string" },
                      severity: { type: "string", enum: ["warning", "critical"] },
                      details: { type: "string" },
                    },
                    required: ["alert", "severity", "details"],
                    additionalProperties: false,
                  },
                },
                workload_suggestions: { type: "string", description: "Brief agent workload optimization advice" },
              },
              required: ["executive_summary", "trends", "root_causes", "recommendations", "risk_alerts", "workload_suggestions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "report_insights" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const insights = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
