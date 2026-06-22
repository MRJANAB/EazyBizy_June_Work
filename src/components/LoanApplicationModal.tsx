import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, IndianRupee, Calendar, Calculator, FileText, ArrowRight, ArrowLeft } from "lucide-react";
import * as RechartsPrimitive from "recharts";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { ChartContainer } from "@/components/ui/chart";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import LoanDocumentUpload from "./LoanDocumentUpload";
import { numberToWords } from "@/lib/numberToWords";

interface LoanType {
  id: string;
  name: string;
  min_amount: number;
  max_amount: number;
  interest_rate: number;
  tenure_months_min: number;
  tenure_months_max: number;
}

interface LoanApplicationModalProps {
  loan: LoanType | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "details" | "documents" | "complete";

const LoanApplicationModal = ({ loan, isOpen, onClose, onSuccess }: LoanApplicationModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loanAmount, setLoanAmount] = useState(loan?.min_amount || 100000);
  const [tenure, setTenure] = useState(loan?.tenure_months_min || 12);
  const [step, setStep] = useState<Step>("details");
  const [applicationId, setApplicationId] = useState<string | null>(null);

  // Reset state when modal opens with new loan
  useEffect(() => {
    if (loan && isOpen) {
      setLoanAmount(loan.min_amount);
      setTenure(loan.tenure_months_min);
      setStep("details");
      setApplicationId(null);
    }
  }, [loan, isOpen]);

  // EMI Calculation
  const calculateEMI = () => {
    if (!loan || loanAmount <= 0 || tenure <= 0) {
      return {
        displayEMI: 0,
        displayTotal: 0,
        displayInterest: 0,
      };
    }

    const principal = loanAmount;
    const monthlyRate = loan.interest_rate / 12 / 100;
    const n = tenure;
    const toSixDecimals = (value: number) => Number(value.toFixed(6));

    const emiExact = toSixDecimals(
      monthlyRate === 0
        ? principal / n
        : (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) /
          (Math.pow(1 + monthlyRate, n) - 1)
    );

    const totalExact = toSixDecimals(emiExact * n);
    const interestExact = toSixDecimals(totalExact - principal);

    return {
      displayEMI: Math.round(emiExact),
      displayTotal: Math.round(totalExact),
      displayInterest: Math.round(interestExact),
    };
  };

  const { displayEMI, displayTotal, displayInterest } = calculateEMI();
  const totalInterest = displayInterest;
  const totalPayment = displayTotal;
  const chartData = [
    { name: "Loan", value: loanAmount },
    { name: "Interest", value: totalInterest },
    { name: "Payment", value: totalPayment },
  ];

  const handleSubmitApplication = async () => {
    if (!loan || !user) return;

    setIsSubmitting(true);
    const { data, error } = await supabase
      .from("loan_applications")
      .insert({
        user_id: user.id,
        loan_type_id: loan.id,
        amount: loanAmount,
        tenure_months: tenure,
        status: "submitted",
      })
      .select()
      .single();
    setIsSubmitting(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Application failed",
        description: error.message,
      });
    } else if (data) {
      setApplicationId(data.id);
      setStep("documents");
      toast({
        title: "Application created!",
        description: "Now please upload the required documents.",
      });
    }
  };

  const handleDocumentsComplete = () => {
    setStep("complete");
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 2000);
  };

  const handleSkipDocuments = () => {
    toast({
      title: "Application submitted!",
      description: "You can upload documents later from your applications.",
    });
    onSuccess();
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!loan) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg glass-card rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {step === "documents" && (
                    <button
                      onClick={() => setStep("details")}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  )}
                  <h2 className="text-2xl font-bold text-foreground">
                    {step === "details" && `Apply for ${loan.name}`}
                    {step === "documents" && "Upload Documents"}
                    {step === "complete" && "Application Complete"}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Step Indicator */}
              <div className="flex items-center gap-2 mb-6">
                {["details", "documents", "complete"].map((s, i) => (
                  <div key={s} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step === s
                          ? "bg-primary text-primary-foreground"
                          : ["details", "documents", "complete"].indexOf(step) > i
                          ? "bg-green-500 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </div>
                    {i < 2 && (
                      <div
                        className={`w-8 h-0.5 mx-1 ${
                          ["details", "documents", "complete"].indexOf(step) > i
                            ? "bg-green-500"
                            : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              <AnimatePresence mode="wait">
                {step === "details" && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    {/* Loan Amount Slider */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                          <IndianRupee className="h-4 w-4" />
                          Loan Amount
                        </label>
                        <span className="text-lg font-bold text-primary">
                          {formatCurrency(loanAmount)}
                        </span>
                      </div>

                      <div className="grid gap-3 mb-1 sm:grid-cols-[1fr_auto]">
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={loan.min_amount}
                          max={loan.max_amount}
                          step={1000}
                          value={loanAmount}
                          onChange={(event) => {
                            const raw = event.currentTarget.value.replace(/[^0-9]/g, "");
                            const parsed = raw ? Number(raw) : loan.min_amount;
                            const clamped = Math.min(Math.max(parsed, loan.min_amount), loan.max_amount);
                            setLoanAmount(clamped);
                          }}
                          onFocus={(event) => event.currentTarget.select()}
                          className="w-full"
                        />
                        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                          Step 1,000
                        </div>
                      </div>
                      {loanAmount > 0 && (
                        <p className="text-xs font-medium text-primary/80 mb-2">₹ {numberToWords(loanAmount)}</p>
                      )}

                      <Slider
                        value={[loanAmount]}
                        onValueChange={(value) => setLoanAmount(value[0])}
                        min={loan.min_amount}
                        max={loan.max_amount}
                        step={1000}
                        className="mb-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(loan.min_amount)}</span>
                        <span>{formatCurrency(loan.max_amount)}</span>
                      </div>
                    </div>

                    {/* Tenure Slider */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Loan Tenure
                        </label>
                        <span className="text-lg font-bold text-primary">
                          {tenure} months
                        </span>
                      </div>
                      <Slider
                        value={[tenure]}
                        onValueChange={(value) => setTenure(value[0])}
                        min={loan.tenure_months_min}
                        max={loan.tenure_months_max}
                        step={1}
                        className="mb-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{loan.tenure_months_min} months</span>
                        <span>{loan.tenure_months_max} months</span>
                      </div>
                    </div>

                    {/* EMI Summary */}
                    <div className="glass rounded-xl p-4 mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Calculator className="h-5 w-5 text-primary" />
                        <span className="font-medium text-foreground">EMI Summary</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Monthly EMI</p>
                          <p className="text-xl font-bold text-foreground">
                            {formatCurrency(displayEMI)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Interest Rate</p>
                          <p className="text-xl font-bold text-foreground">
                            {loan.interest_rate}% p.a.
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Interest</p>
                          <p className="text-lg font-semibold text-muted-foreground">
                            {formatCurrency(totalInterest)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Amount</p>
                          <p className="text-lg font-semibold text-muted-foreground">
                            {formatCurrency(totalPayment)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-border bg-muted p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm font-semibold text-foreground">EMI Breakdown</p>
                            <p className="text-xs text-muted-foreground">Live graph of loan, interest and total payment</p>
                          </div>
                        </div>
                        <ChartContainer config={{ value: { color: "#22c55e" } }} className="h-56">
                          <RechartsPrimitive.BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                            <RechartsPrimitive.XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                            <RechartsPrimitive.YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                            <RechartsPrimitive.Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                            <RechartsPrimitive.Bar dataKey="value" fill="var(--color-value)" radius={[8, 8, 0, 0]} />
                          </RechartsPrimitive.BarChart>
                        </ChartContainer>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      variant="hero"
                      className="w-full"
                      onClick={handleSubmitApplication}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Creating..." : "Continue to Documents"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </motion.div>
                )}

                {step === "documents" && user && (
                  <motion.div
                    key="documents"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <LoanDocumentUpload
                      loanTypeId={loan.id}
                      applicationId={applicationId}
                      userId={user.id}
                      onComplete={handleDocumentsComplete}
                    />

                    <Button
                      variant="ghost"
                      className="w-full mt-4"
                      onClick={handleSkipDocuments}
                    >
                      Skip for now
                    </Button>
                  </motion.div>
                )}

                {step === "complete" && (
                  <motion.div
                    key="complete"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      Application Submitted!
                    </h3>
                    <p className="text-muted-foreground">
                      We'll review your application and documents. You'll receive an update soon.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="text-xs text-center text-muted-foreground mt-4">
                By submitting, you agree to our terms and conditions
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LoanApplicationModal;
