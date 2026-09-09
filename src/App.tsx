import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RouteHistoryTracker } from "@/hooks/useBackNavigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import ChatBot from "./components/ChatBot";

// Route pages are lazy-loaded so each becomes its own chunk (heavy deps like
// apexcharts on the loan dashboard split out of the main bundle).
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const LoanManagementDashboard = lazy(() => import("./pages/LoanManagementDashboard"));
const LoanDetails = lazy(() => import("./pages/LoanDetails"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Learning = lazy(() => import("./pages/Learning"));
const LearningAccessGate = lazy(() => import("./components/learning/LearningAccessGate (1)"));
const LearningSegmentModules = lazy(() => import("./pages/LearningSegmentModules"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const CreditAnalystDashboard = lazy(() => import("./pages/credit-analyst/CreditAnalystDashboard"));
const ConsultantDashboard = lazy(() => import("./pages/consultant/ConsultantDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const LoanSchemes = lazy(() => import("./pages/LoanSchemes"));
const Features = lazy(() => import("./pages/Features"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const About = lazy(() => import("./pages/About"));
const MudraLoan = lazy(() => import("./pages/MudraLoan"));
const PMEGP = lazy(() => import("./pages/PMEGP"));
const MSMELoan = lazy(() => import("./pages/MSMELoan"));
const OtherSchemes = lazy(() => import("./pages/OtherScheme"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Terms = lazy(() => import("./pages/Term"));
const Privacy = lazy(() => import("./pages/Privacy"));

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
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#07111f]"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#22d3ee]" /></div>}>
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
          </Suspense>
          <ChatBot />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
