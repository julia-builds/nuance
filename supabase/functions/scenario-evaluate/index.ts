import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  // Server-side rate limiting for authenticated users
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user } } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (user) {
      const limit = parseInt(Deno.env.get("REQUESTS_LIMIT_REGISTERED") ?? "15", 10);
      const { data: allowed, error } = await supabaseAdmin.rpc(
        "check_and_increment_ai_requests",
        { p_user_id: user.id, p_limit: limit },
      );
      if (!error && allowed === false) {
        return new Response(
          JSON.stringify({ error: "daily_limit_reached", limit }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }
  }

  try {
    const { moduleTitle, moduleNumber, scenario, userResponse } = await req.json();

    if (!userResponse || typeof userResponse !== "string" || userResponse.trim().length === 0) {
      return new Response(JSON.stringify({ error: "userResponse is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const systemPrompt = `You are a workplace communication coach evaluating a learner's response to a situational exercise from the Career Playbook program.

Module ${moduleNumber}: "${moduleTitle}"

You MUST respond with valid JSON only, no markdown, no code fences. The JSON schema:

{
  "vibeScore": <number 10-95, how nuanced and effective the response is. 10=very blunt/inappropriate, 60=adequate, 80+=excellent>,
  "feedback": "<2-3 sentences evaluating the overall quality of their response, what they did well, and what could improve>",
  "strengths": ["<specific thing they did well>", "<another strength if applicable>"],
  "coachTips": ["<actionable tip using techniques from this module>", "<second tip if needed>"]
}

Evaluation criteria:
- Does the response use appropriate professional language?
- Does it apply techniques taught in Module ${moduleNumber} (${moduleTitle})?
- Is it empathetic and non-confrontational?
- Does it achieve the communication goal of the scenario?
- Is it specific rather than vague?

Be encouraging but honest. A score below 60 means they should try again. A score of 60+ means they pass.
Strengths should highlight specific phrases or approaches they used well.
Coach tips should reference specific communication techniques from the Career Playbook without giving the exact answer.`;

    const userPrompt = `Scenario: ${scenario.title}
Context: ${scenario.context}
Challenge: ${scenario.prompt}

Learner's response:
"${userResponse.trim()}"`;

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);
      throw new Error("OpenAI API error");
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", raw);
      throw new Error("Invalid AI response format");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scenario-evaluate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
