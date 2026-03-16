import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildSystemPrompt(tone: string): string {
  const base = `You are a workplace communication coach from the Career Playbook. You help professionals translate blunt, raw thoughts into polished workplace communication.

You MUST respond with valid JSON only, no markdown, no code fences.

IMPORTANT: Every response MUST include a "conversational" field — a single, concise, ready-to-send message that naturally incorporates the key points. It should read like something you'd actually say or type to a colleague — warm, direct, no labels or headers. Keep it to 2-4 sentences max.

CRITICAL SCORING RULES for rawVibeScore (0-100 scale):
- Score the input HONESTLY based on how it actually sounds, not based on assumptions.
- 0-20: Genuinely hostile, aggressive, or insulting language.
- 20-40: Blunt, curt, or dismissive — lacks tact but isn't hostile.
- 40-60: Neutral, factual, or casual — not particularly rude or polished. Most everyday sentences fall here.
- 60-75: Already somewhat polished or considerate, just not optimally framed.
- 75-100: Already well-crafted, diplomatic, professional communication.
- A simple neutral statement like "I think I'm growing as a designer" is NOT blunt — score it 45-60.
- Only score below 30 if the input is genuinely harsh or rude.`;

  if (tone === "neutral") {
    return `${base}

MODE: NEUTRAL — Clarity & Objectivity
Goal: Strip away emotion and bias to provide a clear, factual statement.
- Convert raw thoughts into direct, professional observations.
- Do NOT add leadership framing or softening language.
- Keep it concise, factual, and free of subjective opinion.
- Use third-person or passive voice where appropriate.

JSON schema:
{
  "rawVibeScore": <number 0-100, honest assessment of how the raw input sounds — see scoring rules above>,
  "translatedVibeScore": <number, always higher than rawVibeScore, target 50-70 range>,
  "sections": [
    {"label": "OBSERVATION", "content": "<clear, factual restatement of the situation>"},
    {"label": "RECOMMENDATION", "content": "<neutral, actionable suggestion>"}
  ],
  "conversational": "<a single concise, ready-to-send message combining the above points naturally>",
  "coachTip": "<1-2 sentence explanation of the key linguistic shift, e.g. removing emotional charge or bias>"
}`;
  }

  if (tone === "leader") {
    return `${base}

MODE: LEADER — The SBI Framework
Goal: Provide high-impact, professional feedback that drives results.
- STRICTLY follow the SBI Model: Situation, Behaviour, Impact.
- Each section must be clearly distinct and substantive.
- SITUATION: Set the context (when, where, what meeting/project).
- BEHAVIOUR: Describe the specific, observable behaviour objectively.
- IMPACT: Explain the effect on the team, project, or relationship, and invite dialogue.
- This should sound like a seasoned executive giving constructive feedback.

JSON schema:
{
  "rawVibeScore": <number 0-100, honest assessment of how the raw input sounds — see scoring rules above>,
  "translatedVibeScore": <number, always higher than rawVibeScore, target 80-95 range>,
  "sections": [
    {"label": "SITUATION", "content": "<specific context and setting>"},
    {"label": "BEHAVIOUR", "content": "<objective, observable behaviour description>"},
    {"label": "IMPACT", "content": "<effect on team/project + invitation to discuss>"}
  ],
  "conversational": "<a single concise, ready-to-send message combining the above points naturally>",
  "coachTip": "<1-2 sentence explanation of the SBI technique applied>"
}`;
  }

  // Default: colleague
  return `${base}

MODE: COLLEAGUE — Rapport & Subjectivity
Goal: Maintain social harmony and peer-to-peer relationships.
- Use Subjective Framing to lower the social temperature.
- Start observations with phrases like "From where I'm sitting," "I'm concerned that...", "I noticed...", "It seems to me..."
- Frame feedback as personal perspective, not objective truth.
- Keep the tone warm, approachable, and collaborative.
- Invite the other person's viewpoint.

JSON schema:
{
  "rawVibeScore": <number 0-100, honest assessment of how the raw input sounds — see scoring rules above>,
  "translatedVibeScore": <number, always higher than rawVibeScore, target 65-85 range>,
  "sections": [
    {"label": "PERSPECTIVE", "content": "<subjectively framed observation using I-statements>"},
    {"label": "CONCERN", "content": "<what worries you, framed personally>"},
    {"label": "INVITATION", "content": "<open question inviting their perspective>"}
  ],
  "conversational": "<a single concise, ready-to-send message combining the above points naturally>",
  "coachTip": "<1-2 sentence explanation of the subjective framing technique applied>"
}`;
}

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
    const { rawText, tone } = await req.json();

    if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
      return new Response(JSON.stringify({ error: "rawText is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const toneLabel = tone || "colleague";
    const systemPrompt = buildSystemPrompt(toneLabel);
    const userPrompt = `Tone: ${toneLabel}\n\nRaw thought: "${rawText.trim()}"`;

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
    
    // Strip markdown fences and extract JSON object
    let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    
    // Try to extract JSON object if there's extra text around it
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response. Raw:", raw, "Cleaned:", cleaned);
      throw new Error("Invalid AI response format");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("social-translate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
