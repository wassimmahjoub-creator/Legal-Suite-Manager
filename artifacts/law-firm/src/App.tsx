import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KeypadProvider } from "@/context/KeypadContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";

// ── Pages publiques ───────────────────────────────────────────────────────────
const Login            = lazy(() => import("@/pages/Login"));
const Register         = lazy(() => import("@/pages/Register"));
const ForgotPassword   = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword    = lazy(() => import("@/pages/ResetPassword"));
const AcceptInvitation = lazy(() => import("@/pages/AcceptInvitation"));
const Pricing          = lazy(() => import("@/pages/Pricing"));

// ── Pages authentifiées ───────────────────────────────────────────────────────
const Dashboard          = lazy(() => import("@/pages/Dashboard"));
const Cases              = lazy(() => import("@/pages/Cases"));
const CaseDetail         = lazy(() => import("@/pages/CaseDetail"));
const Clients            = lazy(() => import("@/pages/Clients"));
const ClientPage         = lazy(() => import("@/pages/ClientPage"));
const Billing            = lazy(() => import("@/pages/Billing"));
const InvoiceForm        = lazy(() => import("@/pages/InvoiceForm"));
const InvoicePage        = lazy(() => import("@/pages/InvoicePage"));
const CalendarView       = lazy(() => import("@/pages/Calendar"));
const Documents          = lazy(() => import("@/pages/Documents"));
const Settings           = lazy(() => import("@/pages/Settings"));
const TimeTracking       = lazy(() => import("@/pages/TimeTracking"));
const Expenses           = lazy(() => import("@/pages/Expenses"));
const Reports            = lazy(() => import("@/pages/Reports"));
const VoiceDictation     = lazy(() => import("@/pages/VoiceDictation"));
const Opponents          = lazy(() => import("@/pages/Opponents"));
const Consultations      = lazy(() => import("@/pages/Consultations"));
const Templates          = lazy(() => import("@/pages/Templates"));
const Courts             = lazy(() => import("@/pages/Courts"));
const Communications     = lazy(() => import("@/pages/Communications"));
const InsuranceCompanies = lazy(() => import("@/pages/InsuranceCompanies"));
const BankAccounts       = lazy(() => import("@/pages/BankAccounts"));
const LegalConfig        = lazy(() => import("@/pages/LegalConfig"));
const AuditLogs          = lazy(() => import("@/pages/AuditLogs"));
const Trash              = lazy(() => import("@/pages/Trash"));
const Correspondances    = lazy(() => import("@/pages/Correspondances"));
const UserManagement     = lazy(() => import("@/pages/UserManagement"));
const Subscription       = lazy(() => import("@/pages/Subscription"));
const Conflicts          = lazy(() => import("@/pages/Conflicts"));
const DataPrivacy        = lazy(() => import("@/pages/DataPrivacy"));

// Page dev : chargée uniquement en mode développement
const ComponentsDevPage = import.meta.env.DEV
  ? lazy(() => import("@/pages/dev/Components"))
  : null;

// ── QueryClient ───────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // données fraîches 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ── Spinner de chargement ─────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
      <div className="text-center space-y-3">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm">جاري التحميل...</p>
      </div>
    </div>
  );
}

// ── Guards ────────────────────────────────────────────────────────────────────
function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading]);
  if (loading || user) return null;
  return <>{children}</>;
}

function Redirect({ to }: { to: string }) {
  const [, navigate] = useLocation();
  useEffect(() => { navigate(to, { replace: true }); }, [to]);
  return null;
}

// ── Router ────────────────────────────────────────────────────────────────────
function Router() {
  const { user, loading, hasUsers } = useAuth();

  if (loading) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Routes publiques */}
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

        {/* Redirections */}
        <Route path="/adversaries"><Redirect to="/opponents" /></Route>
        <Route path="/login"><Redirect to="/" /></Route>

        {/* Zone authentifiée */}
        <Route>
          {!user || hasUsers === false ? (
            hasUsers === false ? <Register /> : <Login />
          ) : (
            <ErrorBoundary>
              <Layout>
                <Switch>
                  <Route path="/"                      component={Dashboard} />
                  <Route path="/cases"                 component={Cases} />
                  <Route path="/cases/:id"             component={CaseDetail} />
                  <Route path="/clients"               component={Clients} />
                  <Route path="/clients/:id"           component={ClientPage} />
                  <Route path="/billing/new"           component={InvoiceForm} />
                  <Route path="/billing/:id/edit"      component={InvoiceForm} />
                  <Route path="/billing/:id"           component={InvoicePage} />
                  <Route path="/billing"               component={Billing} />
                  <Route path="/calendar"              component={CalendarView} />
                  <Route path="/documents"             component={Documents} />
                  <Route path="/time-tracking"         component={TimeTracking} />
                  <Route path="/expenses"              component={Expenses} />
                  <Route path="/reports"               component={Reports} />
                  <Route path="/voice-dictation"       component={VoiceDictation} />
                  <Route path="/opponents"             component={Opponents} />
                  <Route path="/consultations"         component={Consultations} />
                  <Route path="/templates"             component={Templates} />
                  <Route path="/courts"                component={Courts} />
                  <Route path="/communications"        component={Communications} />
                  <Route path="/correspondances"       component={Correspondances} />
                  <Route path="/insurance-companies"   component={InsuranceCompanies} />
                  <Route path="/bank-accounts"         component={BankAccounts} />
                  <Route path="/legal-config"          component={LegalConfig} />
                  <Route path="/audit-logs"            component={AuditLogs} />
                  <Route path="/trash"                 component={Trash} />
                  <Route path="/settings"              component={Settings} />
                  <Route path="/users"                 component={UserManagement} />
                  <Route path="/conflicts"             component={Conflicts} />
                  <Route path="/data-privacy"          component={DataPrivacy} />
                  <Route path="/subscription"          component={Subscription} />
                  <Route path="/pricing"               component={Pricing} />
                  {ComponentsDevPage && (
                    <Route path="/dev/components" component={ComponentsDevPage} />
                  )}
                  <Route component={NotFound} />
                </Switch>
              </Layout>
            </ErrorBoundary>
          )}
        </Route>
      </Switch>
    </Suspense>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
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
