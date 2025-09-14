import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { User, Appointment } from "@shared/schema";
import { NavHeader } from "@/components/nav-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Clock, UserCheck, UserX, Building, Calendar as CalendarIcon } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { NavigationButtons } from "@/components/navigation-buttons";

// Define types
type Clinic = {
  id: number;
  name: string;
};

type DoctorSchedule = {
  id: number;
  doctorId: number;
  clinicId: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  maxTokens: number;
  clinic: Clinic;
  currentTokenCount?: number;
  scheduleStatus?: 'active' | 'completed';
  bookingStatus?: 'open' | 'closed';
};

type AvailableSlotsResponse = {
  schedules: DoctorSchedule[];
  availableSlots: {
    startTime: string;
    endTime: string;
    clinicId: number;
    clinicName: string;
  }[];
};

export default function PatientBookingPage() {
  const { doctorId } = useParams();
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSchedule, setSelectedSchedule] = useState<DoctorSchedule | null>(null);

  const { data: doctor, isLoading: isLoadingDoctor } = useQuery<User>({
    queryKey: [`/api/doctors/${doctorId}`],
    enabled: !!doctorId,
  });

  const { data: availableSlotsData, isLoading: isLoadingSlots, refetch: refetchSlots } = useQuery<AvailableSlotsResponse>({
    queryKey: [`/api/doctors/${doctorId}/available-slots`, selectedDate.toISOString().split('T')[0]],
    enabled: !!doctorId,
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const response = await fetch(`/api/doctors/${doctorId}/available-slots?date=${selectedDate.toISOString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch available slots");
      }
      return response.json();
    },
  });

  // Fetch user's existing appointments with the selected doctor
  const { data: existingAppointments = [] } = useQuery({
    queryKey: ["user-appointments", doctorId],
    queryFn: async () => {
      if (!doctorId || !user) return [];
      const response = await fetch(`/api/patient/appointments?doctorId=${doctorId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!doctorId && !!user,
  });

  // Check if user already has an appointment for this schedule
  const hasExistingAppointment = (scheduleId: number) => {
    return existingAppointments.some((appointment: any) => 
      appointment.scheduleId === scheduleId && 
      appointment.status !== 'cancelled'
    );
  };

  const bookAppointmentMutation = useMutation({
    mutationFn: async (schedule: DoctorSchedule) => {
      if (!schedule) throw new Error("Please select a clinic schedule");

      // Create appointment date by combining selected date with schedule start time
      const [hours, minutes] = schedule.startTime.split(':').map(Number);
      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(hours, minutes, 0, 0);

      const res = await apiRequest("POST", "/api/appointments", {
        doctorId: parseInt(doctorId!),
        date: appointmentDate.toISOString(),
        clinicId: schedule.clinicId,
        scheduleId: schedule.id,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patient/appointments"] });
      // Also invalidate the available slots query to refresh token counts
      queryClient.invalidateQueries({ 
        queryKey: [`/api/doctors/${doctorId}/available-slots`]
      });
      // Invalidate user appointments to refresh duplicate checks
      queryClient.invalidateQueries({ queryKey: ["user-appointments", doctorId] });
      // Invalidate schedules to update appointment counts
      queryClient.invalidateQueries({ queryKey: ["schedulesToday"] });
      // Force an immediate refetch
      refetchSlots();
      toast({
        title: "Appointment Booked Successfully! ✅",
        description: "Your appointment has been confirmed. You cannot book another appointment for the same schedule.",
      });
    },
    onError: (error) => {
      console.error('Booking error:', error);
      toast({
        title: "Booking Failed", 
        description: error instanceof Error ? error.message : "Failed to book appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Direct booking function
  const bookAppointment = (schedule: DoctorSchedule) => {
    // Check for duplicate booking first
    if (hasExistingAppointment(schedule.id)) {
      toast({
        title: "Appointment Already Exists",
        description: "You already have an appointment booked for this schedule. Please check your existing appointments.",
        variant: "destructive",
      });
      return;
    }
    
    bookAppointmentMutation.mutate(schedule);
  };

  // Add this useEffect near the top of the component
  useEffect(() => {
    // Refetch data when component mounts
    if (doctorId) {
      refetchSlots();
    }
  }, [doctorId, refetchSlots]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavHeader />
        <main className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to book tokens.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  if (isLoadingDoctor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavHeader />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-[400px]" />
        </main>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavHeader />
        <main className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Doctor not found.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Book Appointment</h1>
          <NavigationButtons />
        </div>

        <div className="grid md:grid-cols-[300px,1fr] gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">{doctor.name}</h2>
                <p className="text-muted-foreground">{doctor.specialty}</p>
                {availableSlotsData?.schedules?.length ? (
                  <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                    <UserCheck className="h-4 w-4" />
                    <span>Available on {format(selectedDate, "EEEE, MMM d")}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-yellow-600 mt-2">
                    <UserX className="h-4 w-4" />
                    <span>Not available on {format(selectedDate, "EEEE, MMM d")}</span>
                  </div>
                )}
              </div>

              <h3 className="text-sm font-medium mb-2">Select Date</h3>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date || new Date());
                  setSelectedSchedule(null);
                }}
                className="rounded-md border"
                disabled={(date) => {
                  const today = startOfDay(new Date());
                  return date < today;
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Available Schedules</h2>
              
              {isLoadingSlots ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : !availableSlotsData?.schedules?.length ? (
                <div className="text-center py-12">
                  <div className="mb-4">
                    <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Schedules Available</h3>
                    <p className="text-gray-600 mb-4">
                      The doctor doesn't have any available schedules on {format(selectedDate, "MMMM d, yyyy")}.
                    </p>
                    <div className="space-y-2 text-sm text-gray-500">
                      <p>• Try selecting a different date</p>
                      <p>• The doctor may not be available today</p>
                      <p>• Schedules may be fully booked</p>
                    </div>
                  </div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Tip:</strong> Use the calendar on the left to select another date, or check back later as new schedules may become available.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {availableSlotsData.schedules.map((schedule) => {
                      const isAtCapacity = schedule.maxTokens > 0 && 
                        schedule.currentTokenCount !== undefined && 
                        schedule.currentTokenCount >= schedule.maxTokens;
                      
                      // Check for new status conditions
                      const isScheduleCompleted = schedule.scheduleStatus === 'completed';
                      const isBookingClosed = schedule.bookingStatus === 'closed';
                      const hasExisting = hasExistingAppointment(schedule.id);
                      const isUnavailable = isAtCapacity || isScheduleCompleted || isBookingClosed || hasExisting;
                      
                      // Determine status message and badge
                      let statusBadge = "Select";
                      let statusMessage = "";
                      let badgeVariant: "outline" | "destructive" | "secondary" = "outline";
                      
                      if (hasExisting) {
                        statusBadge = "Already Booked";
                        statusMessage = "You already have an appointment for this schedule";
                        badgeVariant = "secondary";
                      } else if (isScheduleCompleted) {
                        statusBadge = "Completed";
                        statusMessage = "Schedule completed - doctor has finished";
                        badgeVariant = "secondary";
                      } else if (isBookingClosed) {
                        statusBadge = "Booking Closed";
                        statusMessage = "New appointments not accepted";
                        badgeVariant = "secondary";
                      } else if (isAtCapacity) {
                        statusBadge = "Full";
                        statusMessage = "No tokens available";
                        badgeVariant = "destructive";
                      }
                      
                      return (
                        <Button
                          key={schedule.id}
                          variant="outline"
                          className="w-full flex justify-between items-center h-auto py-4 px-4"
                          onClick={() => !isUnavailable ? bookAppointment(schedule) : undefined}
                          disabled={isUnavailable}
                        >
                          <div className="flex flex-col items-start">
                            <div className="font-medium text-base">{schedule.clinic.name}</div>
                            <div className="flex items-center text-sm mt-1">
                              <Clock className="mr-1 h-4 w-4" />
                              {schedule.startTime} - {schedule.endTime}
                            </div>
                            {schedule.maxTokens > 0 && !isScheduleCompleted && !isBookingClosed && (
                              <div className="text-xs mt-1 flex items-center">
                                <span className={isAtCapacity ? "text-red-500" : "text-green-600"}>
                                  Tokens: {schedule.currentTokenCount || 0}/{schedule.maxTokens}
                                  {isAtCapacity && " (Full)"}
                                </span>
                              </div>
                            )}
                            {statusMessage && (
                              <div className="text-xs mt-1 text-gray-500">
                                {statusMessage}
                              </div>
                            )}
                          </div>
                          <Badge variant={isUnavailable ? badgeVariant : "default"}>
                            {isUnavailable ? statusBadge : "Book Now"}
                          </Badge>
                        </Button>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}