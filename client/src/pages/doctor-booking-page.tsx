import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { User, Appointment } from "@shared/schema";
import { NavHeader } from "@/components/nav-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AppointmentWithPatient = Appointment & {
  patient: User;
};

export default function DoctorBookingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: appointments, isLoading } = useQuery<AppointmentWithPatient[]>({
    queryKey: ["/api/doctor/appointments", selectedDate],
    enabled: !!user?.id,
  });

  const { data: availability } = useQuery({
    queryKey: ["/api/doctors/availability", user?.id, selectedDate],
    enabled: !!user?.id,
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: async ({ isAvailable }: { isAvailable: boolean }) => {
      const res = await apiRequest("PATCH", `/api/doctors/${user?.id}/availability`, {
        isAvailable,
        date: selectedDate.toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors/availability"] });
      toast({
        title: "Success",
        description: "Availability updated successfully",
      });
    },
  });

  if (!user || user.role !== "doctor") {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavHeader />
        <main className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Access denied. This page is only for doctors.
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

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Manage Appointments</h1>

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

              <div className="mt-6 space-y-4">
                <Button
                  className="w-full"
                  variant={availability?.isAvailable ? "outline" : "default"}
                  onClick={() => updateAvailabilityMutation.mutate({ isAvailable: !availability?.isAvailable })}
                >
                  {availability?.isAvailable ? (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Mark as Unavailable
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mark as Available
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Appointments</h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-4 px-4">Token #</th>
                      <th className="text-left py-4 px-4">Patient</th>
                      <th className="text-left py-4 px-4">Time</th>
                      <th className="text-left py-4 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments?.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-muted-foreground">
                          No appointments scheduled for {format(selectedDate, "PPP")}
                        </td>
                      </tr>
                    ) : (
                      appointments?.map((appointment) => (
                        <tr key={appointment.id} className="border-b">
                          <td className="py-4 px-4">
                            {String(appointment.tokenNumber).padStart(3, '0')}
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-medium">{appointment.patient.name}</div>
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
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
