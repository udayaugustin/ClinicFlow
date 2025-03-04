import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import DoctorPage from "@/pages/doctor-page";
import BookingPage from "@/pages/booking-page";
import BookingHistoryPage from "@/pages/booking-history";
import AttenderDashboard from "@/pages/attender-dashboard";
import { useAuth } from "./hooks/use-auth";

function Router() {
  const { user } = useAuth();

  // Redirect attenders to their dashboard
  if (user?.role === "attender" && window.location.pathname === "/") {
    window.location.href = "/attender-dashboard";
    return null;
  }

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={HomePage} />
      <Route path="/doctors/:id" component={DoctorPage} />
      <Route path="/book/:doctorId" component={BookingPage} />
      <Route path="/appointments" component={BookingHistoryPage} />
      <Route path="/attender-dashboard" component={AttenderDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;