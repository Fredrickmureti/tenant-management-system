import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Tenants from "./pages/Tenants";
import Billing from "./pages/Billing";
import Payments from "./pages/Payments";
import Communications from "./pages/Communications";
import TenantLayout from "@/components/tenant/TenantLayout";
import Overview from "@/pages/tenant/Overview";
import TenantBills from "@/pages/tenant/Bills";
import TenantPayments from "@/pages/tenant/Payments";
import TenantProfile from "@/pages/tenant/Profile";
import TenantAuth from "./pages/TenantAuth";
import MeterReadings from "./pages/MeterReadings";
import AdminInvites from "./pages/AdminInvites";
import AuditLogs from "./pages/AuditLogs";
import ResetPassword from "./pages/ResetPassword";
import { ThemeProvider } from "next-themes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/tenant-auth" element={<TenantAuth />} />
              <Route path="/tenant" element={<TenantLayout />}>
                <Route index element={<Overview />} />
                <Route path="bills" element={<TenantBills />} />
                <Route path="payments" element={<TenantPayments />} />
                <Route path="profile" element={<TenantProfile />} />
              </Route>
              <Route path="/admin" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="tenants" element={<Tenants />} />
                <Route path="meter-readings" element={<MeterReadings />} />
                <Route path="billing" element={<Billing />} />
                <Route path="payments" element={<Payments />} />
                <Route path="communications" element={<Communications />} />
                <Route path="admin-invites" element={<AdminInvites />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
