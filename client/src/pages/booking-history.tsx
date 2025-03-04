import { useQuery } from "@tanstack/react-query";
import { Appointment, User } from "@shared/schema";
import { NavHeader } from "@/components/nav-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type AppointmentWithDoctor = Appointment & {
  doctor: User;
};

export default function BookingHistoryPage() {
  const { data: appointments, isLoading } = useQuery<AppointmentWithDoctor[]>({
    queryKey: ["/api/appointments"],
  });

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
        <h1 className="text-2xl font-bold mb-6">My Appointments</h1>
        <Card>
          <CardContent className="p-6">
            {appointments?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No appointments found
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-4 px-4">Token #</th>
                      <th className="text-left py-4 px-4">Doctor</th>
                      <th className="text-left py-4 px-4">Date & Time</th>
                      <th className="text-left py-4 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments?.map((appointment, index) => (
                      <tr key={appointment.id} className="border-b">
                        <td className="py-4 px-4">
                          {String(appointment.id).padStart(4, '0')}
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-medium">{appointment.doctor.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {appointment.doctor.specialty}
                            </div>
                          </div>
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
                                ? "success"
                                : "destructive"
                            }
                          >
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
