import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import ComplaintDetailPage from "./pages/ComplaintDetailPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ReportsPage from "./pages/ReportsPage";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import NewComplaintPage from "./pages/NewComplaintPage";
import TrackComplaintPage from "./pages/TrackComplaintPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/complaint/:id" element={<ProtectedRoute><ComplaintDetailPage /></ProtectedRoute>} />
            <Route path="/new-complaint" element={<ProtectedRoute><NewComplaintPage /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute requiredRole={['admin', 'manager', 'supervisor']}><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute requiredRole={['admin', 'manager', 'supervisor']}><ReportsPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requiredRole={['admin', 'manager']}><AdminPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
