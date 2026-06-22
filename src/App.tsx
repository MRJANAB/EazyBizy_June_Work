import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RouteHistoryTracker } from "@/hooks/useBackNavigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import LoanManagementDashboard from "./pages/LoanManagementDashboard";
import LoanDetails from "./pages/LoanDetails";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Learning from "./pages/Learning";
import LearningAccessGate from "./components/learning/LearningAccessGate (1)";
import LearningSegmentModules from "./pages/LearningSegmentModules";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CreditAnalystDashboard from "./pages/credit-analyst/CreditAnalystDashboard";
import ConsultantDashboard from "./pages/consultant/ConsultantDashboard";
import NotFound from "./pages/NotFound";
import SignupPage from "./pages/SignupPage";
import LoanSchemes from "./pages/LoanSchemes";
import Features from "./pages/Features";
import HowItWorks from "./pages/HowItWorks";
import About from "./pages/About";
import MudraLoan from "./pages/MudraLoan";
import PMEGP from "./pages/PMEGP";
import MSMELoan from "./pages/MSMELoan";
import OtherSchemes from "./pages/OtherScheme";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import Terms from "./pages/Term";
import Privacy from "./pages/Privacy";
import ChatBot from "./components/ChatBot";

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouteHistoryTracker />
        <ScrollToTop />
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<SignupPage />} />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <LoanManagementDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/dashboard"
              element={<Navigate to="/dashboard" replace />}
            />
            <Route
              path="/dashboard/applications"
              element={
                <ProtectedRoute>
                  <LoanManagementDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/documents"
              element={
                <ProtectedRoute>
                  <LoanManagementDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/status-tracker"
              element={
                <ProtectedRoute>
                  <LoanManagementDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/reports"
              element={
                <ProtectedRoute>
                  <LoanManagementDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/users"
              element={
                <ProtectedRoute>
                  <LoanManagementDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/settings"
              element={
                <ProtectedRoute>
                  <LoanManagementDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/loan-details"
              element={
                <ProtectedRoute>
                  <LoanDetails />
                </ProtectedRoute>
              }
            />
            <Route path="/dashboard/management" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard/management/dashboard" element={<Navigate to="/dashboard/dashboard" replace />} />
            <Route path="/dashboard/management/applications" element={<Navigate to="/dashboard/applications" replace />} />
            <Route path="/dashboard/management/documents" element={<Navigate to="/dashboard/documents" replace />} />
            <Route path="/dashboard/management/loan-details" element={<Navigate to="/dashboard/loan-details" replace />} />
            <Route path="/dashboard/management/status-tracker" element={<Navigate to="/dashboard/status-tracker" replace />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/learning" element={<LearningAccessGate redirectTo="/learning/dashboard" />} />
            <Route path="/learning/dashboard" element={<Learning />} />
            <Route path="/learning/courses" element={<Learning />} />
            <Route path="/learning/paid-courses" element={<Learning />} />
            <Route path="/learning/settings" element={<Learning />} />
            <Route path="/learning/segments/:segmentId" element={<LearningSegmentModules />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/credit-analyst" element={<CreditAnalystDashboard />} />
            <Route path="/consultant" element={<ConsultantDashboard />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/loan-schemes" element={<LoanSchemes />} />
            <Route path="/features" element={<Features />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/mudra-loan" element={<MudraLoan />} />
            <Route path="/pmegp" element={<PMEGP />} />
            <Route path="/msme-loan" element={<MSMELoan />} />
            <Route path="/other-schemes" element={<OtherSchemes />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/help-center" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ChatBot />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
