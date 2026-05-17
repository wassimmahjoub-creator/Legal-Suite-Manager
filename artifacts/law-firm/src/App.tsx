import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KeypadProvider } from "@/context/KeypadContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import AcceptInvitation from "@/pages/AcceptInvitation";
import Dashboard from "@/pages/Dashboard";
import Cases from "@/pages/Cases";
import CaseDetail from "@/pages/CaseDetail";
import Clients from "@/pages/Clients";
import Billing from "@/pages/Billing";
import CalendarView from "@/pages/Calendar";
import Documents from "@/pages/Documents";
import Settings from "@/pages/Settings";
import TimeTracking from "@/pages/TimeTracking";
import Expenses from "@/pages/Expenses";
import Reports from "@/pages/Reports";
import VoiceDictation from "@/pages/VoiceDictation";
import Opponents from "@/pages/Opponents";
import Consultations from "@/pages/Consultations";
import Templates from "@/pages/Templates";
import Courts from "@/pages/Courts";
import Communications from "@/pages/Communications";
import InsuranceCompanies from "@/pages/InsuranceCompanies";
import BankAccounts from "@/pages/BankAccounts";
import LegalConfig from "@/pages/LegalConfig";
import AuditLogs from "@/pages/AuditLogs";
import Trash from "@/pages/Trash";
import Correspondances from "@/pages/Correspondances";
import UserManagement from "@/pages/UserManagement";
import Subscription from "@/pages/Subscription";
import Pricing from "@/pages/Pricing";

const queryClient = new QueryClient();
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) { window.location.replace(`${BASE}/`); return null; }
  return <>{children}</>;
}

function Redirect({ to }: { to: string }) {
  const [, navigate] = useLocation();
  useEffect(() => { navigate(to, { replace: true }); }, [to]);
  return null;
}

function Router() {
  const { user, loading, hasUsers } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public-only routes (unauthenticated) */}
      <Route path="/register">
        <PublicOnly><Register /></PublicOnly>
      </Route>
      <Route path="/forgot-password">
        <PublicOnly><ForgotPassword /></PublicOnly>
      </Route>
      <Route path="/reset-password/:token">
        <ResetPassword />
      </Route>
      <Route path="/invite/:token">
        <AcceptInvitation />
      </Route>
      <Route path="/pricing">
        <Pricing />
      </Route>

      {/* Legacy / alias redirects */}
      <Route path="/adversaries">
        <Redirect to="/opponents" />
      </Route>

      {/* Auth gate */}
      <Route>
        {!user || hasUsers === false ? (
          hasUsers === false ? <Register /> : <Login />
        ) : (
          <Layout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/cases" component={Cases} />
              <Route path="/cases/:id" component={CaseDetail} />
              <Route path="/clients" component={Clients} />
              <Route path="/billing" component={Billing} />
              <Route path="/calendar" component={CalendarView} />
              <Route path="/documents" component={Documents} />
              <Route path="/time-tracking" component={TimeTracking} />
              <Route path="/expenses" component={Expenses} />
              <Route path="/reports" component={Reports} />
              <Route path="/voice-dictation" component={VoiceDictation} />
              <Route path="/opponents" component={Opponents} />
              <Route path="/consultations" component={Consultations} />
              <Route path="/templates" component={Templates} />
              <Route path="/courts" component={Courts} />
              <Route path="/communications" component={Communications} />
              <Route path="/correspondances" component={Correspondances} />
              <Route path="/insurance-companies" component={InsuranceCompanies} />
              <Route path="/bank-accounts" component={BankAccounts} />
              <Route path="/legal-config" component={LegalConfig} />
              <Route path="/audit-logs" component={AuditLogs} />
              <Route path="/trash" component={Trash} />
              <Route path="/settings" component={Settings} />
              <Route path="/users" component={UserManagement} />
              <Route path="/subscription" component={Subscription} />
              <Route path="/pricing" component={Pricing} />
              <Route path="/login">
                {() => { window.location.replace(`${BASE}/`); return null; }}
              </Route>
              <Route component={NotFound} />
            </Switch>
          </Layout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <KeypadProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </KeypadProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
