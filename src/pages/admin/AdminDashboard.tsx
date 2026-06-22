import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  IndianRupee,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import ApplicationsTable from "@/components/admin/ApplicationsTable";
import UsersTable from "@/components/admin/UsersTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Stats {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  totalUsers: number;
  totalAmount: number;
}

const AdminDashboard = () => {
  const { isAdmin, loading, user } = useAdminAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalApplications: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    totalUsers: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  const fetchStats = async () => {
    // Fetch applications stats
    const { data: applications } = await supabase
      .from("loan_applications")
      .select("status, amount");

    if (applications) {
      const pending = applications.filter((a) => a.status === "submitted").length;
      const approved = applications.filter((a) => a.status === "approved").length;
      const rejected = applications.filter((a) => a.status === "rejected").length;
      const totalAmount = applications
        .filter((a) => a.status === "approved")
        .reduce((sum, a) => sum + Number(a.amount), 0);

      setStats((prev) => ({
        ...prev,
        totalApplications: applications.length,
        pendingApplications: pending,
        approvedApplications: approved,
        rejectedApplications: rejected,
        totalAmount,
      }));
    }

    // Fetch users count
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    setStats((prev) => ({ ...prev, totalUsers: count || 0 }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">
                  Admin <span className="text-gradient-primary">Panel</span>
                </span>
              </div>
            </div>
            <span className="text-sm text-muted-foreground">{user?.email}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-8">
        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalApplications}</div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">
                {stats.pendingApplications}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {stats.approvedApplications}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Total Disbursed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Approved Amount</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500 flex items-center gap-2">
                <IndianRupee className="h-6 w-6" />
                {formatCurrency(stats.totalAmount).replace("₹", "")}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs for Applications and Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="applications" className="space-y-4">
            <TabsList className="glass">
              <TabsTrigger value="applications">
                <FileText className="h-4 w-4 mr-2" />
                Applications
              </TabsTrigger>
              <TabsTrigger value="users">
                <Users className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
            </TabsList>

            <TabsContent value="applications">
              <ApplicationsTable onUpdate={fetchStats} />
            </TabsContent>

            <TabsContent value="users">
              <UsersTable />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminDashboard;
