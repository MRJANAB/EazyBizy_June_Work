import { useMemo, useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { ArrowRight, Calculator, Sparkles } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const CTASection = () => {
  const [loanAmount, setLoanAmount] = useState("");
  const [interestRate, setInterestRate] = useState(9.5);
  const [tenureMonths, setTenureMonths] = useState(60);

  const loanAmountNumber = useMemo(() => Number(loanAmount || 0), [loanAmount]);

  const emiSummary = useMemo(() => {
    const principal = Math.max(loanAmountNumber, 0);
    const months = Math.max(Math.floor(tenureMonths), 1);
    const yearlyRate = Math.max(interestRate, 0);
    const monthlyRate = yearlyRate / 1200;

    const monthlyEmi =
      monthlyRate === 0
        ? principal / months
        : (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
          (Math.pow(1 + monthlyRate, months) - 1);

    const totalPayment = monthlyEmi * months;
    const totalInterest = totalPayment - principal;

    return { monthlyEmi, totalPayment, totalInterest };
  }, [interestRate, loanAmountNumber, tenureMonths]);

  const amortizationData = useMemo(() => {
    const principal = Math.max(loanAmountNumber, 0);
    const months = Math.max(Math.floor(tenureMonths), 1);
    const monthlyRate = Math.max(interestRate, 0) / 1200;
    const monthlyEmi =
      monthlyRate === 0
        ? principal / months
        : (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
          (Math.pow(1 + monthlyRate, months) - 1);

    if (principal === 0 || months === 0) {
      return [];
    }

    let balance = principal;
    let cumulativePrincipal = 0;
    let cumulativeInterest = 0;

    return Array.from({ length: months }, (_, index) => {
      const interestPaid = monthlyRate === 0 ? 0 : balance * monthlyRate;
      const principalPaid = monthlyEmi - interestPaid;
      balance = Math.max(balance - principalPaid, 0);
      cumulativePrincipal += principalPaid;
      cumulativeInterest += interestPaid;

      return {
        month: index + 1,
        cumulativePrincipal: Number(cumulativePrincipal.toFixed(0)),
        cumulativeInterest: Number(cumulativeInterest.toFixed(0)),
        totalPaid: Number((cumulativePrincipal + cumulativeInterest).toFixed(0)),
      };
    });
  }, [interestRate, loanAmountNumber, tenureMonths]);

  const formatCurrency = (value: number) => INR_FORMATTER.format(Number.isFinite(value) ? value : 0);

  const handleLoanAmountInput = (event: ChangeEvent<HTMLInputElement>) => {
    // Extract only numeric characters
    const rawValue = event.target.value.replace(/\D/g, "");
    
    // Remove leading zeros, but allow "0" if it's the only digit
    let sanitized = rawValue.replace(/^0+/, "");
    
    // If all zeros were removed, keep it empty (user will continue typing or it'll be handled on blur)
    if (sanitized === "" && rawValue !== "") {
      sanitized = "";
    }
    
    setLoanAmount(sanitized);
  };

  const handleLoanAmountBlur = () => {
    // If empty on blur, set to minimum value or keep empty based on UX preference
    // Keeping empty here allows user to see placeholder text
    if (loanAmount === "") {
      setLoanAmount("");
    }
  };

  const handleNumberInput =
    (setter: (value: number) => void) => (event: ChangeEvent<HTMLInputElement>) => {
      const parsed = Number(event.target.value);
      setter(Number.isFinite(parsed) ? Math.max(parsed, 0) : 0);
    };

  return (
    <section className="py-24 gradient-hero relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 gradient-glow opacity-50" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] gradient-glow animate-pulse-glow blur-3xl" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-8"
          >
            <Sparkles className="w-4 h-4 text-secondary" />
            <span className="text-sm text-muted-foreground">Government Backed Schemes</span>
          </motion.div>

          <h2 className="text-3xl md:text-4xl lg:text-6xl font-bold mb-6">
            Plan Smarter:
            <br />
            <span className="text-gradient-gold">view your montly EMI Schedule Instantly</span>
          </h2>

          <p className="text-muted-foreground text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            Apply for PMEGP and get up to 35% subsidy on your project cost. 
            Auto-generate bank-ready reports and fast-track your approval.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="gold" size="xl" className="group" asChild>
              <Link to="/signup">
                Start Application
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="glass" size="xl" className="min-w-[220px]">
                  <Calculator className="w-5 h-5" />
                  EMI Calculator
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full max-w-[440px] max-h-[90vh] overflow-y-auto rounded-[1.75rem] border border-border/40 bg-slate-950/95 shadow-2xl shadow-black/20 px-4 py-4 sm:px-5 sm:py-5">
                <DialogHeader>
                  <DialogTitle>EMI Calculator</DialogTitle>
                  <DialogDescription>
                    Estimate your monthly loan payment before you apply.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="emi-loan-amount">Loan Amount (INR)</Label>
                    <Input
                      id="emi-loan-amount"
                      type="number"
                      inputMode="numeric"
                      min={1000}
                      max={10000000}
                      step={1000}
                      value={loanAmount}
                      placeholder="Enter loan amount"
                      onChange={handleLoanAmountInput}
                      onBlur={handleLoanAmountBlur}
                    />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="emi-interest-rate">Interest Rate (% p.a.)</Label>
                      <Input
                        id="emi-interest-rate"
                        type="number"
                        min={0}
                        max={30}
                        step={0.1}
                        value={interestRate}
                        onChange={handleNumberInput(setInterestRate)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="emi-tenure-months">Tenure (Months)</Label>
                      <Input
                        id="emi-tenure-months"
                        type="number"
                        min={1}
                        max={360}
                        step={1}
                        value={tenureMonths}
                        onChange={handleNumberInput(setTenureMonths)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/35 p-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Monthly EMI</p>
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(emiSummary.monthlyEmi)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                        <p className="text-xs text-muted-foreground">Total Interest</p>
                        <p className="font-semibold text-foreground">{formatCurrency(emiSummary.totalInterest)}</p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                        <p className="text-xs text-muted-foreground">Total Payment</p>
                        <p className="font-semibold text-foreground">{formatCurrency(emiSummary.totalPayment)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-border bg-muted p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Principal vs Interest over time</p>
                        <p className="text-xs text-muted-foreground">Monthly cumulative loan amortization</p>
                      </div>
                    </div>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={amortizationData}
                          margin={{ top: 10, right: 14, left: -10, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="principalGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.08} />
                            </linearGradient>
                            <linearGradient id="interestGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.08} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                          <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#9ca3af", fontSize: 12 }}
                            tickFormatter={(value) => `M${value}`}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#9ca3af", fontSize: 12 }}
                            tickFormatter={(value) => `${value / 1000}k`}
                          />
                          <Tooltip
                            formatter={(value: number) => formatCurrency(Number(value))}
                            labelFormatter={(label) => `Month ${label}`}
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              borderColor: "#374151",
                              borderRadius: 12,
                              color: "#fff",
                            }}
                            itemStyle={{ color: "#fff" }}
                          />
                          <Area
                            type="monotone"
                            dataKey="cumulativePrincipal"
                            stackId="1"
                            stroke="#22c55e"
                            fill="url(#principalGradient)"
                            strokeWidth={2}
                            animationDuration={900}
                          />
                          <Area
                            type="monotone"
                            dataKey="cumulativeInterest"
                            stackId="1"
                            stroke="#f59e0b"
                            fill="url(#interestGradient)"
                            strokeWidth={2}
                            animationDuration={900}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-border/50"
          >
            {[
              { end: 50, prefix: "", suffix: "K+", label: "MSME Loans" },
              { end: 500, prefix: "₹", suffix: "Cr+", label: "Disbursed" },
              { end: 94, prefix: "", suffix: "%", label: "Success Rate" },
            ].map((stat, i) => (
              <div key={stat.label}>
                <motion.p
                  initial={{ rotateX: 90, opacity: 0 }}
                  whileInView={{ rotateX: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55, delay: 0.5 + i * 0.15 }}
                  style={{ transformPerspective: 600 }}
                  className="text-2xl md:text-3xl lg:text-4xl font-bold text-gradient-primary"
                >
                  {stat.prefix}
                  <CountUp
                    start={0}
                    end={stat.end}
                    duration={2.5}
                    suffix={stat.suffix}
                    enableScrollSpy
                    scrollSpyOnce
                  />
                </motion.p>
                <p className="text-muted-foreground text-sm md:text-base">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
