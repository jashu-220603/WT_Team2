import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import UserDashboard from "./pages/UserDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

// Officer pages
import OfficerLayout from "./pages/officer/OfficerLayout";
import OfficerDashboardPage from "./pages/officer/OfficerDashboardPage";
import OfficerCasesPage from "./pages/officer/OfficerCasesPage";
import OfficerCaseDetailPage from "./pages/officer/OfficerCaseDetailPage";
import OfficerActivityPage from "./pages/officer/OfficerActivityPage";

// Admin pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminComplaintsPage from "./pages/admin/AdminComplaintsPage";
import AdminOfficersPage from "./pages/admin/AdminOfficersPage";
import AdminDepartmentsPage from "./pages/admin/AdminDepartmentsPage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/create" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />

            {/* Officer routes */}
            <Route path="/officer" element={<ProtectedRoute requiredRole="officer"><OfficerLayout /></ProtectedRoute>}>
              <Route index element={<OfficerDashboardPage />} />
              <Route path="cases" element={<OfficerCasesPage />} />
              <Route path="cases/:caseId" element={<OfficerCaseDetailPage />} />
              <Route path="activity" element={<OfficerActivityPage />} />
            </Route>

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="complaints" element={<AdminComplaintsPage />} />
              <Route path="officers" element={<AdminOfficersPage />} />
              <Route path="departments" element={<AdminDepartmentsPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
