import React from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import DoctorPage from "@/pages/doctor-page";
import PatientBookingPage from "@/pages/patient-booking-page";
import DoctorBookingPage from "@/pages/doctor-booking-page";
import BookingHistoryPage from "@/pages/booking-history";
import AttenderDashboard from "@/pages/attender-dashboard";
import { useAuth } from "./hooks/use-auth";
import SuperAdminDashboard from "@/pages/super-admin-dashboard";
import DoctorCreation from "@/pages/doctor-creation";
import ClinicCreation from "@/pages/clinic-creation";
import ClinicView from "@/pages/clinic-view";
import DoctorManagementPage from "./pages/doctor-management";
import { ProtectedRoute } from "./components/ProtectedRoute";
import DoctorSchedulesPage from "./pages/doctor-schedules";
import ClinicAdminDashboard from "@/pages/clinic-admin-dashboard";

// Wrap DoctorManagementPage with ProtectedRoute
const ProtectedDoctorManagement = () => (
  <ProtectedRoute allowedRoles={["hospital_admin", "attender"]}>
    <DoctorManagementPage />
  </ProtectedRoute>
);

const ProtectedDoctorSchedules = () => (
  <ProtectedRoute allowedRoles={["hospital_admin", "attender", "doctor"]}>
    <DoctorSchedulesPage />
  </ProtectedRoute>
);

const ProtectedClinicAdminDashboard = () => (
  <ProtectedRoute allowedRoles={["clinic_admin", "hospital_admin", "clinicadmin"]}>
    <ClinicAdminDashboard />
  </ProtectedRoute>
);

function Router() {
  const { user } = useAuth();

  // Debug user role
  if (user) {
    console.log('Current user role:', user.role);
    console.log('User details:', user);
  }
  
  // No redirects needed - all users go to the home page
  // The home page will conditionally render the appropriate dashboard based on user role

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={HomePage} />
      <Route path="/doctors/:id" component={DoctorPage} />
      <Route path="/book/:doctorId" component={PatientBookingPage} />
      <Route path="/doctor/bookings" component={DoctorBookingPage} />
      <Route path="/appointments" component={BookingHistoryPage} />
      <Route path="/attender-dashboard" component={AttenderDashboard} />
      {/* <Route path="/super-admin-dashboard" component={SuperAdminDashboard} /> */}
      <Route path="/doctor-creation" component={DoctorCreation} />
      <Route path="/clinic-creation" component={ClinicCreation} />
      <Route path="/clinic/:id" component={ClinicView} />
      <Route path="/doctor-management" component={ProtectedDoctorManagement} />
      <Route path="/schedules" component={ProtectedDoctorSchedules} />
      {/* <Route path="/clinic-admin-dashboard" component={ProtectedClinicAdminDashboard} /> */}
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