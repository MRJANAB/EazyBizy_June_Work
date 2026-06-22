import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { applicationId, decision, notes } = await req.json();

    if (!applicationId || !decision) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch application details
    const { data: application, error: appError } = await supabase
      .from("loan_applications")
      .select(`
        *,
        loan_types (name, interest_rate),
        profiles:user_id (full_name, email, client_id, business_type)
      `)
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate AI recommendation using Lovable AI
    let aiRecommendation = "";
    try {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You are a loan underwriting assistant for an Indian NBFC. Analyze loan applications and provide concise risk assessments. Consider:
- Loan amount vs typical income requirements
- Tenure appropriateness
- Interest rate implications
- Business type risk (if applicable)
Keep response under 100 words.`,
              },
              {
                role: "user",
                content: `Application Details:
- Loan Type: ${application.loan_types?.name}
- Amount: ₹${application.amount.toLocaleString("en-IN")}
- Tenure: ${application.tenure_months} months
- Interest Rate: ${application.loan_types?.interest_rate}%
- Applicant: ${application.profiles?.full_name || "Unknown"}
- Business Type: ${application.profiles?.business_type || "Individual"}
- Decision: ${decision.toUpperCase()}
${notes ? `- Notes: ${notes}` : ""}

Provide a brief risk assessment and recommendation.`,
              },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiRecommendation = aiData.choices?.[0]?.message?.content || "";
        }
      }
    } catch (aiError) {
      console.error("AI recommendation error:", aiError);
    }

    // Update the application
    const updateData: Record<string, any> = {
      status: decision,
      decision_status: decision,
      reviewed_by: userData.user.id,
      reviewed_at: new Date().toISOString(),
    };

    if (decision === "approved") {
      updateData.approval_notes = notes;
    } else {
      updateData.rejection_reason = notes;
    }

    if (aiRecommendation) {
      updateData.ai_recommendation = aiRecommendation;
    }

    const { error: updateError } = await supabase
      .from("loan_applications")
      .update(updateData)
      .eq("id", applicationId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Application ${decision} successfully`,
        aiRecommendation,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error processing loan:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
