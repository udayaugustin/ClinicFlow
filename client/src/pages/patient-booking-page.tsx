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
import { AlertCircle, Clock, UserCheck, UserX, Building } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Define types
type Clinic = {
  id: number;
  name: string;
};

type DoctorSchedule = {
  id: number;
  doctorId: number;
  clinicId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  maxTokens: number;
  clinic: Clinic;
  currentTokenCount?: number;
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

  const bookAppointmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSchedule) throw new Error("Please select a clinic schedule");

      // Create appointment date by combining selected date with schedule start time
      const [hours, minutes] = selectedSchedule.startTime.split(':').map(Number);
      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(hours, minutes, 0, 0);

      const res = await apiRequest("POST", "/api/appointments", {
        doctorId: parseInt(doctorId!),
        date: appointmentDate.toISOString(),
        clinicId: selectedSchedule.clinicId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patient/appointments"] });
      // Also invalidate the available slots query to refresh token counts
      queryClient.invalidateQueries({ 
        queryKey: [`/api/doctors/${doctorId}/available-slots`]
      });
      // Force an immediate refetch
      refetchSlots();
      toast({
        title: "Success",
        description: "Appointment booked successfully",
      });
      navigate("/appointments");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
              Please log in to book appointments.
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
        <h1 className="text-2xl font-bold mb-6">Book Appointment</h1>

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
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <AlertDescription>
                    No schedules available on this date. Please select another date.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="space-y-3">
                    {availableSlotsData.schedules.map((schedule) => {
                      const isAtCapacity = schedule.maxTokens > 0 && 
                        schedule.currentTokenCount !== undefined && 
                        schedule.currentTokenCount >= schedule.maxTokens;
                      
                      return (
                        <Button
                          key={schedule.id}
                          variant={selectedSchedule?.id === schedule.id ? "default" : "outline"}
                          className="w-full flex justify-between items-center h-auto py-4 px-4"
                          onClick={() => setSelectedSchedule(schedule)}
                          disabled={isAtCapacity}
                        >
                          <div className="flex flex-col items-start">
                            <div className="font-medium text-base">{schedule.clinic.name}</div>
                            <div className="flex items-center text-sm mt-1">
                              <Clock className="mr-1 h-4 w-4" />
                              {schedule.startTime} - {schedule.endTime}
                            </div>
                            {schedule.maxTokens > 0 && (
                              <div className="text-xs mt-1 flex items-center">
                                <span className={isAtCapacity ? "text-red-500" : "text-green-600"}>
                                  Tokens: {schedule.currentTokenCount || 0}/{schedule.maxTokens}
                                  {isAtCapacity && " (Full)"}
                                </span>
                              </div>
                            )}
                          </div>
                          <Badge variant="outline">
                            {isAtCapacity ? "Full" : "Select"}
                          </Badge>
                        </Button>
                      );
                    })}
                  </div>

                  {selectedSchedule && (
                    <div className="mt-6">
                      <Button
                        className="w-full"
                        onClick={() => bookAppointmentMutation.mutate()}
                        disabled={
                          bookAppointmentMutation.isPending || 
                          (selectedSchedule.maxTokens > 0 && 
                           selectedSchedule.currentTokenCount !== undefined && 
                           selectedSchedule.currentTokenCount >= selectedSchedule.maxTokens)
                        }
                      >
                        {selectedSchedule.maxTokens > 0 && 
                         selectedSchedule.currentTokenCount !== undefined && 
                         selectedSchedule.currentTokenCount >= selectedSchedule.maxTokens
                          ? "Schedule is full"
                          : `Book an appointment at ${selectedSchedule.clinic.name}`
                        }
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}