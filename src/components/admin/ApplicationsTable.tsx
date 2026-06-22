import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileText,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LoanApplication {
  id: string;
  amount: number;
  tenure_months: number;
  status: string;
  decision_status: string;
  created_at: string;
  rejection_reason: string | null;
  approval_notes: string | null;
  ai_recommendation: string | null;
  bank_formatted_report: string | null;
  user_id: string;
  loan_types: { name: string };
  profiles: { full_name: string; email: string; client_id: string } | null;
}

interface ApplicationsTableProps {
  onUpdate: () => void;
}

const ApplicationsTable = ({ onUpdate }: ApplicationsTableProps) => {
  const { toast } = useToast();
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<LoanApplication | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    
    // First fetch applications with loan types
    const { data: appsData, error: appsError } = await supabase
      .from("loan_applications")
      .select(`
        *,
        loan_types (name)
      `)
      .order("created_at", { ascending: false });

    if (appsError) {
      console.error("Error fetching applications:", appsError);
      setLoading(false);
      return;
    }

    if (!appsData || appsData.length === 0) {
      setApplications([]);
      setLoading(false);
      return;
    }

    // Fetch profiles separately
    const userIds = [...new Set(appsData.map((a) => a.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, client_id")
      .in("user_id", userIds);

    const profilesMap = new Map(
      profilesData?.map((p) => [p.user_id, p]) || []
    );

    const enrichedData = appsData.map((app) => ({
      ...app,
      profiles: profilesMap.get(app.user_id) || null,
    }));

    setApplications(enrichedData as unknown as LoanApplication[]);
    setLoading(false);
  };

  const handleReview = (app: LoanApplication) => {
    setSelectedApp(app);
    setReviewNotes(app.approval_notes || app.rejection_reason || "");
    setIsReviewModalOpen(true);
  };

  const processApplication = async (decision: "approved" | "rejected") => {
    if (!selectedApp) return;

    setIsProcessing(true);

    try {
      // Call the edge function to process the loan
      const { data, error } = await supabase.functions.invoke("process-loan", {
        body: {
          applicationId: selectedApp.id,
          decision,
          notes: reviewNotes,
        },
      });

      if (error) throw error;

      toast({
        title: decision === "approved" ? "Loan Approved" : "Loan Rejected",
        description: `Application has been ${decision} successfully.`,
      });

      setIsReviewModalOpen(false);
      fetchApplications();
      onUpdate();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to process application",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateBankReport = async (app: LoanApplication) => {
    setIsGeneratingReport(true);
    setSelectedApp(app);

    try {
      const { data, error } = await supabase.functions.invoke("format-report", {
        body: { applicationId: app.id },
      });

      if (error) throw error;

      toast({
        title: "Report Generated",
        description: "Bank-formatted report has been created successfully.",
      });

      fetchApplications();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate report",
      });
    } finally {
      setIsGeneratingReport(false);
      setSelectedApp(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" /> Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Loan Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No applications found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client ID</TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Loan Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Tenure</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied On</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-mono text-sm">
                        {app.profiles?.client_id || "N/A"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {app.profiles?.full_name || "Unknown"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {app.profiles?.email || "N/A"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{app.loan_types?.name}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(app.amount)}
                      </TableCell>
                      <TableCell>{app.tenure_months} months</TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell>
                        {new Date(app.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReview(app)}
                          >
                            <Eye className="h-4 w-4 mr-1" /> Review
                          </Button>
                          {app.status === "approved" && !app.bank_formatted_report && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => generateBankReport(app)}
                              disabled={isGeneratingReport && selectedApp?.id === app.id}
                            >
                              {isGeneratingReport && selectedApp?.id === app.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-1" /> AI Report
                                </>
                              )}
                            </Button>
                          )}
                          {app.bank_formatted_report && (
                            <Badge variant="outline" className="text-green-400">
                              Report Ready
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Application</DialogTitle>
            <DialogDescription>
              Review the loan application and provide your decision
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Applicant</p>
                  <p className="font-medium">{selectedApp.profiles?.full_name || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Client ID</p>
                  <p className="font-mono">{selectedApp.profiles?.client_id || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Loan Type</p>
                  <p className="font-medium">{selectedApp.loan_types?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium">{formatCurrency(selectedApp.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tenure</p>
                  <p className="font-medium">{selectedApp.tenure_months} months</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Status</p>
                  {getStatusBadge(selectedApp.status)}
                </div>
              </div>

              {selectedApp.ai_recommendation && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-medium">AI Recommendation</span>
                  </div>
                  <p className="text-sm">{selectedApp.ai_recommendation}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Review Notes / Reason
                </label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Enter notes for approval or reason for rejection..."
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsReviewModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => processApplication("rejected")}
              disabled={isProcessing || selectedApp?.status !== "submitted"}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Reject
            </Button>
            <Button
              variant="hero"
              onClick={() => processApplication("approved")}
              disabled={isProcessing || selectedApp?.status !== "submitted"}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApplicationsTable;
