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

    const { applicationId } = await req.json();

    if (!applicationId) {
      return new Response(JSON.stringify({ error: "Application ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch application with all related data
    const { data: application, error: appError } = await supabase
      .from("loan_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch loan type
    const { data: loanType } = await supabase
      .from("loan_types")
      .select("*")
      .eq("id", application.loan_type_id)
      .single();

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", application.user_id)
      .single();

    // Fetch uploaded documents
    const { data: documents } = await supabase
      .from("user_loan_documents")
      .select("document_type, document_name, status")
      .eq("loan_application_id", applicationId);

    // Generate bank-formatted report using AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const documentsList = documents?.map(d => `${d.document_name} (${d.status})`).join(", ") || "None uploaded";
    
    // Calculate EMI
    const principal = Number(application.amount);
    const rate = Number(loanType?.interest_rate || 10) / 12 / 100;
    const tenure = Number(application.tenure_months);
    const emi = Math.round((principal * rate * Math.pow(1 + rate, tenure)) / (Math.pow(1 + rate, tenure) - 1));
    const totalAmount = emi * tenure;
    const totalInterest = totalAmount - principal;

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
            content: `You are a professional loan documentation specialist for Indian banks and NBFCs. Generate formal, bank-standard loan approval reports that comply with RBI guidelines. 

The report should include:
1. Application Summary Header
2. Applicant Details Section
3. Loan Details Section
4. Financial Assessment
5. Document Verification Status
6. Risk Assessment
7. Recommendation
8. Terms and Conditions
9. Declaration and Authorization sections

Use formal banking terminology. Format as a structured document with clear sections.`,
          },
          {
            role: "user",
            content: `Generate a formal bank loan approval report for:

APPLICATION DETAILS:
- Application ID: ${applicationId}
- Application Date: ${new Date(application.created_at).toLocaleDateString("en-IN")}
- Status: ${application.status.toUpperCase()}
- Review Date: ${application.reviewed_at ? new Date(application.reviewed_at).toLocaleDateString("en-IN") : "N/A"}

APPLICANT INFORMATION:
- Client ID: ${profile?.client_id || "N/A"}
- Full Name: ${profile?.full_name || "N/A"}
- Email: ${profile?.email || "N/A"}
- Phone: ${profile?.phone || "N/A"}
- Address: ${profile?.address || "N/A"}
- Business Type: ${profile?.business_type || "Individual"}
- Collateral Details: ${profile?.collateral_details || "None provided"}

LOAN INFORMATION:
- Loan Type: ${loanType?.name || "N/A"}
- Principal Amount: ₹${principal.toLocaleString("en-IN")}
- Interest Rate: ${loanType?.interest_rate}% per annum
- Tenure: ${tenure} months
- EMI: ₹${emi.toLocaleString("en-IN")}
- Total Interest: ₹${totalInterest.toLocaleString("en-IN")}
- Total Repayment: ₹${totalAmount.toLocaleString("en-IN")}

DOCUMENTS SUBMITTED:
${documentsList}

APPROVAL NOTES:
${application.approval_notes || "Standard processing"}

AI RISK ASSESSMENT:
${application.ai_recommendation || "No automated assessment available"}

Generate a comprehensive, formal bank-standard loan document.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted, please add funds" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Failed to generate report");
    }

    const aiData = await aiResponse.json();
    const bankReport = aiData.choices?.[0]?.message?.content || "";

    if (!bankReport) {
      throw new Error("No report generated");
    }

    // Update the application with the bank-formatted report
    const { error: updateError } = await supabase
      .from("loan_applications")
      .update({ bank_formatted_report: bankReport })
      .eq("id", applicationId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        report: bankReport,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error generating report:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
