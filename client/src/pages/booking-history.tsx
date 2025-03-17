import { useQuery } from "@tanstack/react-query";
import { Appointment, User } from "@shared/schema";
import { NavHeader } from "@/components/nav-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Clock, ArrowRight, Users, Ticket } from "lucide-react";

type AppointmentWithDoctor = Appointment & {
  doctor: User;
};

type TokenProgress = {
  currentToken: number;
  status: 'in_progress' | 'completed' | 'not_started' | 'no_appointments';
  appointment?: Appointment;
};

export default function BookingHistoryPage() {
  const { data: appointments, isLoading } = useQuery<AppointmentWithDoctor[]>({
    queryKey: ["/api/patient/appointments"],
    // Refresh every 30 seconds to keep token status current
    refetchInterval: 30000
  });

  const todayAppointments = appointments?.filter(
    apt => format(new Date(apt.date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  ) || [];

  // Group today's appointments by doctor and clinic
  const doctorClinicPairs = todayAppointments.map(apt => ({
    doctorId: apt.doctorId,
    clinicId: apt.clinicId
  }));

  // Create a unique key for each doctor-clinic pair
  const uniquePairs = Array.from(new Set(doctorClinicPairs.map(p => `${p.doctorId}-${p.clinicId}`)))
    .map(key => {
      const [doctorId, clinicId] = key.split('-').map(Number);
      return { doctorId, clinicId };
    });

  // Fetch token progress for each doctor-clinic pair
  const { data: tokenProgressMap } = useQuery<Record<string, TokenProgress>>({
    queryKey: ["token-progress", uniquePairs],
    queryFn: async () => {
      const progressPromises = uniquePairs.map(async ({ doctorId, clinicId }) => {
        const res = await fetch(`/api/doctors/${doctorId}/token-progress?clinicId=${clinicId}`);
        if (!res.ok) throw new Error('Failed to fetch token progress');
        const progress = await res.json();
        return { key: `${doctorId}-${clinicId}`, progress };
      });

      const progressResults = await Promise.all(progressPromises);
      return Object.fromEntries(progressResults.map(({ key, progress }) => [key, progress]));
    },
    enabled: uniquePairs.length > 0,
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
                        const progress = tokenProgressMap?.[`${appointment.doctorId}-${appointment.clinicId}`];

                        // Get all appointments for this doctor at this clinic today
                        const doctorClinicAppointments = todayAppointments.filter(
                          apt => apt.doctorId === appointment.doctorId && apt.clinicId === appointment.clinicId
                        );

                        const maxTokenNumber = Math.max(
                          ...doctorClinicAppointments.map(apt => apt.tokenNumber)
                        );

                        const tokensAhead = progress?.currentToken !== undefined
                          ? Math.max(0, appointment.tokenNumber - progress.currentToken - 1)
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
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span>{format(new Date(appointment.date), "p")}</span>
                                  </div>
                                  <div className="flex items-center gap-2 justify-end">
                                    <Ticket className="h-4 w-4" />
                                    <span className="font-medium">
                                      Token {String(progress?.currentToken || 0).padStart(3, '0')}/{String(maxTokenNumber).padStart(3, '0')}
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-1">
                                      <span>Your Token:</span>
                                      <span className="font-medium">
                                        #{String(appointment.tokenNumber).padStart(3, '0')}
                                      </span>
                                    </div>
                                    {/* <div className="text-sm text-muted-foreground">
                                      Status: {progress?.status ? progress.status.charAt(0).toUpperCase() + progress.status.slice(1) : 'Unknown'}
                                    </div> */}
                                  </div>

                                  <Progress 
                                    value={
                                      maxTokenNumber > 0 && progress?.currentToken !== undefined
                                        ? (progress.currentToken / maxTokenNumber) * 100
                                        : 0
                                    } 
                                    className="h-2"
                                  />

                                  {appointment.status === "completed" ? (
                                    <div className="text-sm text-center text-muted-foreground mt-2">
                                      Consultation completed
                                    </div>
                                  ) : appointment.status === "in_progress" ? (
                                    <div className="text-sm text-center text-primary font-medium mt-2">
                                      You are currently being consulted
                                    </div>
                                  ) : tokensAhead !== null && tokensAhead > 0 ? (
                                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-2">
                                      <Users className="h-4 w-4" />
                                      <span>
                                        {tokensAhead} {tokensAhead === 1 ? 'patient' : 'patients'} ahead of you
                                      </span>
                                    </div>
                                  ) : tokensAhead === 0 ? (
                                    <div className="text-sm text-center text-primary font-medium mt-2">
                                      You're next! Please be ready.
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-4">Past Appointments</h2>
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
                        {appointments?.filter(apt => 
                          format(new Date(apt.date), "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd")
                        ).map((appointment) => (
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