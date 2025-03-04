import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"
];

export default function BookingPage() {
  const { doctorId } = useParams();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();

  const { data: doctors } = useQuery<User[]>({
    queryKey: ["/api/doctors"],
  });

  const doctor = doctors?.find(d => d.id === parseInt(doctorId));

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !selectedTime) return;
      const date = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(":");
      date.setHours(parseInt(hours), parseInt(minutes));

      const res = await apiRequest("POST", "/api/appointments", {
        doctorId: parseInt(doctorId),
        date: date.toISOString(),
        status: "scheduled",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Success",
        description: "Your appointment has been booked successfully.",
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!doctor) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <h1 className="text-2xl font-bold mb-6">
                Book Appointment with {doctor.name}
              </h1>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-lg font-semibold mb-4">Select Date</h2>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => 
                      date < new Date() || 
                      date.getDay() === 0 || 
                      date.getDay() === 6
                    }
                    className="rounded-md border"
                  />
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-4">Select Time</h2>
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? "default" : "outline"}
                        onClick={() => setSelectedTime(time)}
                        className="w-full"
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/doctors/${doctorId}`)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => bookingMutation.mutate()}
                  disabled={!selectedDate || !selectedTime || bookingMutation.isPending}
                >
                  {bookingMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Confirm Booking
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}