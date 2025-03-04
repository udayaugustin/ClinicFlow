import { useState } from "react";
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
import { format, startOfDay, addMinutes, setHours, setMinutes } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Clock, UserCheck, UserX } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Hardcoded time slots (9 AM to 5 PM, 30-minute intervals)
const generateTimeSlots = (baseDate: Date) => {
  const slots = [];
  const startTime = setHours(setMinutes(baseDate, 0), 9); // 9 AM
  const endTime = setHours(setMinutes(baseDate, 0), 17); // 5 PM

  let currentSlot = startTime;
  while (currentSlot < endTime) {
    slots.push(new Date(currentSlot));
    currentSlot = addMinutes(currentSlot, 30);
  }
  return slots;
};

export default function PatientBookingPage() {
  const { doctorId } = useParams();
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);

  const { data: doctor, isLoading: isLoadingDoctor } = useQuery<User>({
    queryKey: [`/api/doctors/${doctorId}`],
    enabled: !!doctorId,
  });

  const { data: availability } = useQuery({
    queryKey: [`/api/doctors/${doctorId}/availability`, selectedDate.toISOString()],
    enabled: !!doctorId,
  });

  const bookAppointmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTime) throw new Error("Please select a time slot");

      const appointmentDate = new Date(selectedTime);
      const res = await apiRequest("POST", "/api/appointments", {
        doctorId: parseInt(doctorId!),
        date: appointmentDate.toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patient/appointments"] });
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

  const timeSlots = generateTimeSlots(selectedDate);

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
                {availability?.isAvailable ? (
                  <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                    <UserCheck className="h-4 w-4" />
                    <span>Available today</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-yellow-600 mt-2">
                    <UserX className="h-4 w-4" />
                    <span>May not be available today</span>
                  </div>
                )}
              </div>

              <h3 className="text-sm font-medium mb-2">Select Date</h3>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date || new Date());
                  setSelectedTime(null);
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
              <h2 className="text-lg font-semibold mb-4">Available Time Slots</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {timeSlots.map((slot) => (
                  <Button
                    key={slot.toISOString()}
                    variant={selectedTime?.toISOString() === slot.toISOString() ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setSelectedTime(slot)}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {format(slot, "h:mm a")}
                  </Button>
                ))}
              </div>

              {selectedTime && (
                <div className="mt-6">
                  <Button
                    className="w-full"
                    onClick={() => bookAppointmentMutation.mutate()}
                    disabled={bookAppointmentMutation.isPending}
                  >
                    Book for {format(selectedTime, "h:mm a")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}