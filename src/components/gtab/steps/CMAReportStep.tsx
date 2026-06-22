import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GTABFormData } from "@/types/gtab";
import { FileText, Download, Loader2, CheckCircle, AlertCircle, IndianRupee } from "lucide-react";
import { getFinancingPlan, getNormalizedProjectReportInputs, getPromoterEquityPct } from "@/lib/projectReport";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CMAReportStepProps {
  formData: GTABFormData;
  updateFormData: (updates: Partial<GTABFormData>) => void;
  applicationId: string | null;
  totals: {
    total_project_cost: number;
    margin_money: number;
    eligible_loan_amount: number;
    total_monthly_expenses: number;
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const CMAReportStep = ({ formData, updateFormData, applicationId, totals }: CMAReportStepProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportContent, setReportContent] = useState<string | null>(null);
  const { toast } = useToast();
  const reportInputs = getNormalizedProjectReportInputs(formData);
  const promoterEquityPct = getPromoterEquityPct(formData);
  const financingPlan = getFinancingPlan(formData);
  const projectName =
    reportInputs.business.business_name ||
    formData.products_services ||
    formData.business_entity_name ||
    "EazyBizy Application";

  const sanitizeReportContent = (content: string) => {
    return content
      .split("\n")
      .filter(
        (line) => !/credit monitoring arrangement \(cma\) report/i.test(line.trim()) &&
                  !/\bcredit monitoring arrangement\b/i.test(line.trim()) &&
                  !/\bcma report\b/i.test(line.trim())
      )
      .join("\n")
      .trim();
  };

  const generateCMAReport = async () => {
    if (!applicationId) {
      toast({
        title: "Error",
        description: "Please save your application first before generating the report.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-cma-report', {
        body: { applicationId },
      });

      if (error) throw error;

      if (data?.report) {
        const cleanedReport = sanitizeReportContent(data.report);
        setReportContent(cleanedReport);
        setReportGenerated(true);
        toast({
          title: "Report Generated!",
          description: "Your report has been generated successfully.",
        });
      }
    } catch (error: any) {
      console.error("Error generating report:", error);
      toast({
        title: "Error generating report",
        description: error.message || "Failed to generate CMA report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReportAsPDF = () => {
    if (!reportContent) return;

    // Create a printable HTML document
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups to download the report.",
        variant: "destructive",
      });
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Project Report On - ${projectName}</title>
        <style>
          body {
            font-family: 'Times New Roman', serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            line-height: 1.6;
            color: #333;
          }
          h1, h2, h3 { color: #1a365d; }
          h1 { text-align: center; border-bottom: 2px solid #1a365d; padding-bottom: 10px; }
          h2 { border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f5f5f5; }
          .highlight { background-color: #e6f3ff; font-weight: bold; }
          .amount { text-align: right; }
          pre { white-space: pre-wrap; font-family: inherit; }
          @media print {
            body { padding: 20px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Project Report On</h1>
        <h2>${projectName}</h2>
        <pre>${sanitizeReportContent(reportContent)}</pre>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-foreground">Generate CMA Report</h3>
        <p className="text-sm text-muted-foreground">
          Generate an AI-powered Credit Monitoring Arrangement report for bank submission
        </p>
      </div>

      {/* Application Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-muted/30 border border-border">
          <h4 className="font-medium text-foreground mb-3">Applicant Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium text-foreground">{formData.first_name} {formData.last_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Business:</span>
              <span className="font-medium text-foreground">{formData.business_entity_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Industry:</span>
              <span className="font-medium text-foreground capitalize">{formData.industry_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Loan Scheme:</span>
              <span className="font-medium text-foreground uppercase">{formData.loan_scheme}</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-primary" />
            Financial Summary
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Initial Project Investment:</span>
              <span className="font-medium text-foreground">{formatCurrency(totals.total_project_cost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{`Promoter's Contribution (${Number(promoterEquityPct).toFixed(1)}%):`}</span>
              <span className="font-medium text-foreground">{formatCurrency(totals.margin_money)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{`Total Bank Finance (Term ${financingPlan.termLoanBankFinancePct}% + WC ${financingPlan.wcBankFinancePct}%):`}</span>
              <span className="font-bold text-primary">{formatCurrency(totals.eligible_loan_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly Expenses:</span>
              <span className="font-medium text-foreground">{formatCurrency(totals.total_monthly_expenses)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Report Generation */}
      <div className="p-6 rounded-xl border-2 border-dashed border-border bg-card">
        {!reportGenerated ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Ready to Generate CMA Report</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Click below to generate an AI-powered bank-ready CMA report based on your application data.
              </p>
            </div>
            <Button
              variant="hero"
              onClick={generateCMAReport}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Generate CMA Report
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Report Generated Successfully!</span>
            </div>
            
            {/* Report Preview */}
            <div className="bg-muted/30 rounded-lg p-4 max-h-[300px] overflow-y-auto">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">
                {reportContent}
              </pre>
            </div>

            <div className="flex gap-3">
              <Button
                variant="hero"
                onClick={downloadReportAsPDF}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download as PDF
              </Button>
              <Button
                variant="outline"
                onClick={generateCMAReport}
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Regenerate Report
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Important Notes */}
      <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Important Notes:</p>
            <ul className="mt-2 space-y-1 text-muted-foreground list-disc list-inside">
              <li>This report is AI-generated based on your application data</li>
              <li>Bank officials may request additional documents for verification</li>
              <li>Ensure all information provided is accurate and up-to-date</li>
              <li>The report follows RBI guidelines and MSME loan standards</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CMAReportStep;
