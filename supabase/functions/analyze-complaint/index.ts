import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { complaint_id, subject, body, category, priority, customer_name } = await req.json();
    if (!complaint_id || !body) throw new Error("complaint_id and body are required");

    const prompt = `You are a banking complaint analysis AI. Analyze this customer complaint and provide structured output.

Customer: ${customer_name}
Category: ${category}
Priority: ${priority}
Subject: ${subject}
Complaint: ${body}

Analyze the complaint and call the analyze_complaint function with your analysis.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a banking complaint analysis expert. Always use the provided tool to return structured analysis." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_complaint",
              description: "Return structured complaint analysis",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "A 1-2 sentence summary of the complaint" },
                  sentiment: { type: "string", enum: ["positive", "neutral", "negative", "angry"], description: "Customer sentiment" },
                  sentiment_score: { type: "number", description: "Sentiment score from -1 (very negative) to 1 (very positive)" },
                  severity_score: { type: "integer", description: "Severity from 1 (minor) to 10 (critical)" },
                  key_issues: { type: "array", items: { type: "string" }, description: "3-5 key issues identified" },
                  draft_response: { type: "string", description: "A professional draft response to the customer (2-3 paragraphs)" },
                  suggested_priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
                },
                required: ["summary", "sentiment", "sentiment_score", "severity_score", "key_issues", "draft_response", "suggested_priority"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_complaint" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error(`AI gateway error: ${status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const analysis = JSON.parse(toolCall.function.arguments);

    // Update the complaint with AI analysis
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const updateResp = await fetch(`${SUPABASE_URL}/rest/v1/complaints?id=eq.${complaint_id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        ai_summary: analysis.summary,
        sentiment: analysis.sentiment,
        sentiment_score: analysis.sentiment_score,
        severity_score: analysis.severity_score,
        ai_key_issues: analysis.key_issues,
        ai_draft_response: analysis.draft_response,
      }),
    });

    if (!updateResp.ok) {
      const errText = await updateResp.text();
      console.error("DB update error:", errText);
      throw new Error("Failed to update complaint with analysis");
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-complaint error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
