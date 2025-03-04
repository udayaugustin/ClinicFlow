import { useQuery } from "@tanstack/react-query";
import { Appointment, User } from "@shared/schema";
import { NavHeader } from "@/components/nav-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Clock, ArrowRight, Users } from "lucide-react";

type AppointmentWithDoctor = Appointment & {
  doctor: User;
};

type DoctorAvailability = {
  id: number;
  doctorId: number;
  date: string;
  isAvailable: boolean;
  currentToken: number;
};

export default function BookingHistoryPage() {
  const { data: appointments, isLoading } = useQuery<AppointmentWithDoctor[]>({
    queryKey: ["/api/patient/appointments"],
    // Refresh every 30 seconds to keep token status current
    refetchInterval: 30000
  });

  // Fetch availability for each doctor with today's appointments
  const todayAppointments = appointments?.filter(
    apt => format(new Date(apt.date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  ) || [];

  const doctorIds = [...new Set(todayAppointments.map(apt => apt.doctorId))];

  const { data: doctorAvailabilities } = useQuery<DoctorAvailability[]>({
    queryKey: ["/api/doctors/availability", doctorIds],
    enabled: doctorIds.length > 0,
    // Refresh every 30 seconds to keep token status current
    refetchInterval: 30000
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
            {!appointments?.length ? (
              <p className="text-center text-muted-foreground py-8">
                No appointments found
              </p>
            ) : (
              <div className="space-y-6">
                {todayAppointments.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Today's Appointments</h2>
                    <div className="space-y-4">
                      {todayAppointments.map((appointment) => {
                        const availability = doctorAvailabilities?.find(
                          a => a.doctorId === appointment.doctorId
                        );
                        const tokensAhead = availability 
                          ? appointment.tokenNumber - availability.currentToken - 1
                          : null;

                        return (
                          <Card key={appointment.id} className="overflow-hidden">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <h3 className="font-medium">{appointment.doctor.name}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {appointment.doctor.specialty}
                                  </p>
                                </div>
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
                              </div>

                              <div className="bg-muted p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span>{format(new Date(appointment.date), "p")}</span>
                                  </div>
                                  <div className="text-sm">
                                    Token: #{String(appointment.tokenNumber).padStart(3, '0')}
                                  </div>
                                </div>

                                {availability && (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                      <div className="flex items-center gap-1">
                                        <span>Current:</span>
                                        <span className="font-medium">
                                          #{String(availability.currentToken).padStart(3, '0')}
                                        </span>
                                      </div>
                                      <ArrowRight className="h-4 w-4" />
                                      <div className="flex items-center gap-1">
                                        <span>Your Token:</span>
                                        <span className="font-medium">
                                          #{String(appointment.tokenNumber).padStart(3, '0')}
                                        </span>
                                      </div>
                                    </div>
                                    <Progress 
                                      value={
                                        availability.currentToken >= appointment.tokenNumber
                                          ? 100
                                          : (availability.currentToken / appointment.tokenNumber) * 100
                                      } 
                                      className="h-2"
                                    />
                                    {tokensAhead !== null && tokensAhead > 0 && (
                                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-2">
                                        <Users className="h-4 w-4" />
                                        <span>
                                          {tokensAhead} {tokensAhead === 1 ? 'patient' : 'patients'} ahead of you
                                        </span>
                                      </div>
                                    )}
                                    {tokensAhead === 0 && (
                                      <div className="text-sm text-center text-primary font-medium mt-2">
                                        You're next! Please be ready.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-4">All Appointments</h2>
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
                        {appointments?.map((appointment) => (
                          <tr key={appointment.id} className="border-b">
                            <td className="py-4 px-4">
                              {String(appointment.tokenNumber).padStart(3, '0')}
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}