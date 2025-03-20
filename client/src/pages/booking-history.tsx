import { useQuery } from "@tanstack/react-query";
import { Appointment, User } from "@shared/schema";
import { NavHeader } from "@/components/nav-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Clock, ArrowRight, Users, Ticket, CheckCircle2 } from "lucide-react";
import { AppointmentStatusBadge } from "@/components/appointment-status-badge";
import { apiRequest } from "@/lib/queryClient";
import React, { useEffect, useState, useRef, useCallback } from "react";

// Assuming this function exists in the appointment-status-badge component
const appointmentStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "scheduled": return "default";
    case "start": return "secondary";
    case "hold": return "secondary";
    case "pause": return "destructive";
    case "cancel": return "destructive";
    default: return "outline";
  }
};

type AppointmentWithDoctor = Appointment & {
  doctor: User;
};

type TokenProgress = {
  currentToken: number;
  status: 'start' | 'completed' | 'scheduled' | 'hold' | 'pause' | 'cancel' | 'not_started' | 'no_appointments';
  appointment?: Appointment;
  walkInPatients?: number;
};

// Helper function to calculate tokens ahead of a patient
const calculateTokensAhead = (
  appointment: AppointmentWithDoctor,
  progress: TokenProgress | undefined,
  allAppointments: AppointmentWithDoctor[]
) => {
  if (!progress?.currentToken) return null;
  
  // Filter out appointments that should be counted
  const validAppointments = allAppointments.filter(apt => {
    // Only count appointments with active statuses
    return apt.status !== "cancel" && 
           apt.status !== "pause" && 
           apt.status !== "hold" &&
           // Only count appointments between current token and patient token
           apt.tokenNumber > progress.currentToken && 
           apt.tokenNumber < appointment.tokenNumber;
  });
  
  // Count of regular appointments between current token and patient token
  const appointmentsAhead = validAppointments.length;
  
  // Add walk-in patients count
  const walkInCount = progress.walkInPatients || 0;
  
  return appointmentsAhead + walkInCount;
};

export default function BookingHistoryPage() {
  // State to store doctor arrival status
  const [doctorArrivals, setDoctorArrivals] = useState<Record<string, boolean>>({});
  // Ref to track if we've already fetched arrivals
  const arrivedFetchedRef = useRef(false);
  // Ref to store interval ID
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Create a stable string representation of today's scheduled appointments to use in dependency array
  const scheduledAppointmentsKey = todayAppointments
    .filter(apt => apt.status === "scheduled")
    .map(apt => `${apt.doctorId}-${apt.clinicId}`)
    .sort()
    .join('|');

  // Fetch doctor arrival status - memoize this function to avoid recreating it on every render
  const fetchDoctorArrivals = useCallback(async () => {
    // Skip if no scheduled appointments
    const scheduledAppts = todayAppointments.filter(apt => apt.status === "scheduled");
    if (scheduledAppts.length === 0) return;
    
    const arrivalsMap: Record<string, boolean> = {};
    
    // Create a Set to track unique doctor-clinic pairs to avoid duplicate requests
    const processed = new Set<string>();
    
    for (const appointment of scheduledAppts) {
      const key = `${appointment.doctorId}-${appointment.clinicId}`;
      
      // Skip if we've already processed this doctor-clinic pair
      if (processed.has(key)) continue;
      processed.add(key);
      
      try {
        const res = await fetch(
          `/api/doctors/${appointment.doctorId}/arrival?clinicId=${appointment.clinicId}&date=${new Date().toISOString()}`
        );
        const data = await res.json();
        arrivalsMap[key] = data.hasArrived;
      } catch (error) {
        console.error("Error fetching doctor arrival:", error);
      }
    }
    
    setDoctorArrivals(arrivalsMap);
  }, [todayAppointments]);

  // Setup the initial fetch and interval
  useEffect(() => {
    // Only run this effect if we have scheduled appointments and haven't fetched yet
    const hasScheduledAppointments = todayAppointments.some(apt => apt.status === "scheduled");
    
    if (hasScheduledAppointments) {
      // Run the initial fetch if we haven't already
      if (!arrivedFetchedRef.current) {
        fetchDoctorArrivals();
        arrivedFetchedRef.current = true;
      }
      
      // Clear any existing interval before setting a new one
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Set up interval for periodic refresh (every 30 seconds)
      intervalRef.current = setInterval(fetchDoctorArrivals, 30000);
      
      // Clean up interval on unmount or when dependencies change
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [fetchDoctorArrivals, scheduledAppointmentsKey]);

  // Helper function to check if a doctor has arrived
  const hasDoctorArrived = (doctorId: number, clinicId: number) => {
    return doctorArrivals[`${doctorId}-${clinicId}`] || false;
  };

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
                      {todayAppointments
                        // Sort appointments by status priority
                        .sort((a, b) => {
                          // Define status priority (higher number = higher priority)
                          const getStatusPriority = (status: string): number => {
                            switch (status) {
                              case "start": return 5;     // Currently in consultation (highest priority)
                              case "scheduled": return 4; // Scheduled but not started (next in line)
                              case "hold": return 3;      // On hold (temporarily waiting)
                              case "pause": return 2;     // Paused (longer wait)
                              case "completed": return 1; // Completed (low priority)
                              case "cancel": return 0;    // Canceled (lowest priority)
                              default: return 0;
                            }
                          };
                          
                          // Compare based on status priority
                          const priorityDiff = getStatusPriority(b.status) - getStatusPriority(a.status);
                          
                          // If same status, sort by token number (lower number first)
                          if (priorityDiff === 0) {
                            return a.tokenNumber - b.tokenNumber;
                          }
                          
                          return priorityDiff;
                        })
                        .map((appointment) => {
                        const progress = tokenProgressMap?.[`${appointment.doctorId}-${appointment.clinicId}`];

                        // Get all appointments for this doctor at this clinic today
                        const doctorClinicAppointments = todayAppointments.filter(
                          apt => apt.doctorId === appointment.doctorId && apt.clinicId === appointment.clinicId
                        );

                        const maxTokenNumber = Math.max(
                          ...doctorClinicAppointments.map(apt => apt.tokenNumber)
                        );

                        // Use our helper function to calculate tokens ahead
                        const tokensAhead = calculateTokensAhead(
                          appointment, 
                          progress, 
                          doctorClinicAppointments
                        );

                        // Check if doctor has arrived using the helper function
                        const doctorHasArrived = hasDoctorArrived(appointment.doctorId, appointment.clinicId);

                        return (
                          <Card key={appointment.id} className="overflow-hidden">
                            <CardContent className="p-4">
                              {appointment.status === "start" && (
                                <div className="bg-blue-100 -mx-4 -mt-4 px-4 py-2 mb-3">
                                  <p className="text-blue-700 font-medium text-sm text-center">
                                    Currently in consultation
                                  </p>
                                </div>
                              )}
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <h3 className="font-medium">{appointment.doctor.name}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {appointment.doctor.specialty}
                                  </p>
                                </div>
                                <Badge
                                  variant={
                                    appointment.status === "completed" ? "outline" :
                                    appointmentStatusBadgeVariant(appointment.status)
                                  }
                                >
                                  <AppointmentStatusBadge status={appointment.status} />
                                </Badge>
                              </div>
                              
                              <div className="space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span>{format(new Date(appointment.date), "h:mm a")}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Ticket className="h-4 w-4 text-muted-foreground" />
                                    <span>Token #{appointment.tokenNumber}</span>
                                  </div>
                                </div>
                                
                                {appointment.status === "cancel" ? (
                                  <div className="text-sm text-center text-red-600 font-medium mt-1">
                                    Appointment cancelled
                                  </div>
                                ) : appointment.status === "completed" ? (
                                  <div>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="text-muted-foreground">Current token: {appointment.tokenNumber}</span>
                                      <span className="text-muted-foreground">Your token: {appointment.tokenNumber}</span>
                                    </div>
                                    <Progress value={100} className="h-2" />
                                    <div className="text-sm text-center mt-1">
                                      <span className="text-gray-600 font-medium">Consultation completed</span>
                                    </div>
                                  </div>
                                ) : progress?.currentToken !== undefined && (
                                  <div>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="text-muted-foreground">Current token: {progress.currentToken}</span>
                                      <span className="text-muted-foreground">Your token: {appointment.tokenNumber}</span>
                                    </div>
                                    <Progress value={(progress.currentToken / maxTokenNumber) * 100} className="h-2" />
                                    <div className="text-sm text-center mt-1">
                                      {appointment.status === "start" ? (
                                        <span className="text-blue-600 font-medium">Currently being consulted</span>
                                      ) : appointment.status === "hold" ? (
                                        <span className="text-yellow-600 font-medium">Appointment on hold</span>
                                      ) : appointment.status === "pause" ? (
                                        <span className="text-orange-600 font-medium">Appointment paused</span>
                                      ) : tokensAhead === 0 ? (
                                        <span className="text-green-600 font-medium">You're next!</span>
                                      ) : tokensAhead && tokensAhead > 0 ? (
                                        <span>
                                          {tokensAhead} token{tokensAhead > 1 ? 's' : ''} ahead of you
                                          {progress?.walkInPatients && progress.walkInPatients > 0 ? 
                                            ` (includes ${progress.walkInPatients} walk-in patient${progress.walkInPatients > 1 ? 's' : ''})` : 
                                            ''}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">Waiting for your appointment</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {doctorHasArrived && (
                                  <div className="text-sm text-center text-green-600 font-medium mt-2 flex items-center justify-center gap-2">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Your doctor has arrived at the clinic
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
                              <AppointmentStatusBadge 
                                status={appointment.status}
                                statusNotes={appointment.statusNotes} 
                              />
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