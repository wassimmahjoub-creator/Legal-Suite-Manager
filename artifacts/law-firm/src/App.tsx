import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KeypadProvider } from "@/context/KeypadContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import { AdminGuard } from "./components/AdminGuard";
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
const Today              = lazy(() => import("@/pages/Today"));
const Dashboard          = lazy(() => import("@/pages/Dashboard"));
const Cases              = lazy(() => import("@/pages/Cases"));
const NewCasePage        = lazy(() => import("@/pages/NewCasePage"));
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
      staleTime: 1000 * 60 * 5,   // 5 min — données fraîches
      gcTime:    1000 * 60 * 15,  // 15 min — garde en cache après stale
      retry: 1,
      refetchOnWindowFocus: false,
      placeholderData: (prev: unknown) => prev,  // affiche données précédentes pendant refetch
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

function PrefetchOnAuth() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => {
      void import("@/pages/Dashboard");
      void import("@/pages/Cases");
      void import("@/pages/Clients");
      void import("@/pages/Billing");
      void import("@/pages/Calendar");
    }, 1500);
    return () => clearTimeout(t);
  }, [user]);
  return null;
}

function PageContentSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-44 bg-muted rounded-lg" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
        <div className="h-9 w-28 bg-muted rounded-lg" />
      </div>
      <div className="h-px bg-border" />
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="h-14 bg-muted/50 rounded-xl" />
      ))}
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
            <Suspense fallback={<PageContentSkeleton />}>
            <Switch>
                  <Route path="/today"                  component={Today} />
                  <Route path="/"                      component={Dashboard} />
                  <Route path="/cases"                 component={Cases} />
                  <Route path="/cases/new"             component={NewCasePage} />
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
                  <Route path="/legal-config">
                    <AdminGuard><LegalConfig /></AdminGuard>
                  </Route>
                  <Route path="/audit-logs">
                    <AdminGuard><AuditLogs /></AdminGuard>
                  </Route>
                  <Route path="/trash"                 component={Trash} />
                  <Route path="/settings"              component={Settings} />
                  <Route path="/users">
                    <AdminGuard><UserManagement /></AdminGuard>
                  </Route>
                  <Route path="/conflicts"             component={Conflicts} />
                  <Route path="/data-privacy">
                    <AdminGuard><DataPrivacy /></AdminGuard>
                  </Route>
                  <Route path="/subscription"          component={Subscription} />
                  <Route path="/pricing"               component={Pricing} />
                  {ComponentsDevPage && (
                    <Route path="/dev/components" component={ComponentsDevPage} />
                  )}
                  <Route component={NotFound} />
                </Switch>
            </Suspense>
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
            <PrefetchOnAuth />
            <Toaster />
          </TooltipProvider>
        </KeypadProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
