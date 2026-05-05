import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KeypadProvider } from "@/context/KeypadContext";
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/Dashboard";
import Cases from "@/pages/Cases";
import CaseDetail from "@/pages/CaseDetail";
import Clients from "@/pages/Clients";
import Billing from "@/pages/Billing";
import CalendarView from "@/pages/Calendar";
import Documents from "@/pages/Documents";
import Settings from "@/pages/Settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/cases" component={Cases} />
        <Route path="/cases/:id" component={CaseDetail} />
        <Route path="/clients" component={Clients} />
        <Route path="/billing" component={Billing} />
        <Route path="/calendar" component={CalendarView} />
        <Route path="/documents" component={Documents} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <KeypadProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </KeypadProvider>
    </QueryClientProvider>
  );
}

export default App;