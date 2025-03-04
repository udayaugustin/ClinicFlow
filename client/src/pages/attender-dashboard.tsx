import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { User, Appointment } from "@shared/schema";
import { NavHeader } from "@/components/nav-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

type DoctorWithAppointments = {
  doctor: User;
  appointments: (Appointment & { patient?: User })[];
};

export default function AttenderDashboard() {
  const { user } = useAuth();

  const { data: managedDoctors, isLoading, error } = useQuery<DoctorWithAppointments[]>({
    queryKey: [`/api/attender/${user?.id}/doctors/appointments`],
    enabled: !!user?.id,
  });

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

        <Tabs defaultValue={managedDoctors[0]?.doctor?.id?.toString()}>
          <TabsList className="mb-4">
            {managedDoctors.map((item) => (
              <TabsTrigger 
                key={item.doctor.id} 
                value={item.doctor.id.toString()}
              >
                {item.doctor.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {managedDoctors.map((item) => (
            <TabsContent 
              key={item.doctor.id} 
              value={item.doctor.id.toString()}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-xl font-semibold">{item.doctor.name}</h2>
                      <p className="text-muted-foreground">{item.doctor.specialty}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-4 px-4">Token #</th>
                          <th className="text-left py-4 px-4">Patient</th>
                          <th className="text-left py-4 px-4">Date & Time</th>
                          <th className="text-left py-4 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.appointments.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center py-8 text-muted-foreground">
                              No appointments scheduled
                            </td>
                          </tr>
                        ) : (
                          item.appointments.map((appointment) => (
                            <tr key={appointment.id} className="border-b">
                              <td className="py-4 px-4">
                                {String(appointment.tokenNumber).padStart(3, '0')}
                              </td>
                              <td className="py-4 px-4">
                                {appointment.patient?.name || 'Unknown Patient'}
                              </td>
                              <td className="py-4 px-4">
                                {format(new Date(appointment.date), "PPP p")}
                              </td>
                              <td className="py-4 px-4">
                                <Badge
                                  variant={
                                    appointment.status === "scheduled"
                                      ? "default"
                                      : appointment.status === "completed"
                                      ? "outline"
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
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}