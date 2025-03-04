import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { User, Appointment } from "@shared/schema";
import { NavHeader } from "@/components/nav-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, isSameDay } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type DoctorWithAppointments = {
  doctor: User;
  appointments: (Appointment & { patient?: User })[];
};

export default function AttenderDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: managedDoctors, isLoading, error } = useQuery<DoctorWithAppointments[]>({
    queryKey: [`/api/attender/${user?.id}/doctors/appointments`],
    enabled: !!user?.id,
  });

  // Add mutations for updating appointment status and doctor availability
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/appointments/${appointmentId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/attender/${user?.id}/doctors/appointments`] });
      toast({
        title: "Success",
        description: "Appointment status updated successfully",
      });
    },
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: async ({ doctorId, isAvailable, currentToken }: { doctorId: number; isAvailable: boolean; currentToken?: number }) => {
      const res = await apiRequest("PATCH", `/api/doctors/${doctorId}/availability`, { isAvailable, currentToken });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/attender/${user?.id}/doctors/appointments`] });
      toast({
        title: "Success",
        description: "Doctor availability updated successfully",
      });
    },
  });

  // Handler functions for updating status
  const handleMarkAsCompleted = (appointmentId: number) => {
    updateAppointmentMutation.mutate({ appointmentId, status: "completed" });
  };

  const handleMarkInProgress = (appointmentId: number) => {
    updateAppointmentMutation.mutate({ appointmentId, status: "in_progress" });
  };

  const handleToggleDoctorAvailability = (doctorId: number, isAvailable: boolean) => {
    updateAvailabilityMutation.mutate({ doctorId, isAvailable });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavHeader />
        <main className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to access the dashboard.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavHeader />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-[400px]" />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavHeader />
        <main className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load appointments. Please try again later.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  if (!managedDoctors || managedDoctors.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavHeader />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                No doctors assigned to manage. Please contact your administrator.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Doctor Appointments Dashboard</h1>

        <div className="grid md:grid-cols-[300px,1fr] gap-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Select Date</h2>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => setSelectedDate(date || new Date())}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <Tabs defaultValue={managedDoctors?.[0]?.doctor?.id?.toString()}>
                <TabsList className="mb-4">
                  {managedDoctors?.map((item) => (
                    <TabsTrigger 
                      key={item.doctor.id} 
                      value={item.doctor.id.toString()}
                    >
                      {item.doctor.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {managedDoctors?.map((item) => {
                  const filteredAppointments = item.appointments.filter(
                    (apt) => isSameDay(new Date(apt.date), selectedDate)
                  );

                  return (
                    <TabsContent 
                      key={item.doctor.id} 
                      value={item.doctor.id.toString()}
                    >
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h2 className="text-xl font-semibold">{item.doctor.name}</h2>
                          <p className="text-muted-foreground">{item.doctor.specialty}</p>
                        </div>
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => handleToggleDoctorAvailability(item.doctor.id, true)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Mark as Available
                        </Button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-4 px-4">Token #</th>
                              <th className="text-left py-4 px-4">Patient</th>
                              <th className="text-left py-4 px-4">Time</th>
                              <th className="text-left py-4 px-4">Status</th>
                              <th className="text-left py-4 px-4">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAppointments.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="text-center py-8 text-muted-foreground">
                                  No appointments scheduled for {format(selectedDate, "PPP")}
                                </td>
                              </tr>
                            ) : (
                              filteredAppointments.map((appointment) => (
                                <tr key={appointment.id} className="border-b">
                                  <td className="py-4 px-4">
                                    {String(appointment.tokenNumber).padStart(3, '0')}
                                  </td>
                                  <td className="py-4 px-4">
                                    {appointment.patient?.name || 'Unknown Patient'}
                                  </td>
                                  <td className="py-4 px-4">
                                    {format(new Date(appointment.date), "p")}
                                  </td>
                                  <td className="py-4 px-4">
                                    <Badge
                                      variant={
                                        appointment.status === "scheduled"
                                          ? "default"
                                          : appointment.status === "completed"
                                          ? "outline"
                                          : appointment.status === "in_progress"
                                          ? "secondary"
                                          : "destructive"
                                      }
                                    >
                                      {appointment.status.charAt(0).toUpperCase() + 
                                        appointment.status.slice(1)}
                                    </Badge>
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="flex gap-2">
                                      {appointment.status === "scheduled" && (
                                        <Button
                                          size="sm"
                                          onClick={() => handleMarkInProgress(appointment.id)}
                                        >
                                          Start
                                        </Button>
                                      )}
                                      {appointment.status === "in_progress" && (
                                        <Button
                                          size="sm"
                                          onClick={() => handleMarkAsCompleted(appointment.id)}
                                        >
                                          Complete
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}