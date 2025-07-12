import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import React from "react";

interface SchedulesToday {
  schedules: Array<{
    id: number;
    doctorName: string;
    timeSlot: string;
    appointmentCount: number;
    status: 'token_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'inactive_hidden' | 'inactive_visible' | 'schedule_completed' | 'booking_closed';
  }>;
  summary: {
    totalSchedules: number;
    activeSchedules: number;
    totalAppointments: number;
  };
}

const statusColors = {
  token_started: "default",
  in_progress: "default", 
  paused: "warning",
  completed: "outline",
  cancelled: "destructive",
  inactive_hidden: "secondary",
  inactive_visible: "outline",
  schedule_completed: "outline",
  booking_closed: "secondary",
} as const;

export function SchedulesTodayCard() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();

  const { data: schedulesToday, isLoading, error } = useQuery<SchedulesToday>({
    queryKey: ["schedulesToday", user.id],
    queryFn: async () => {
      const response = await fetch(`/api/attender/schedules-today`);
      if (!response.ok) {
        throw new Error("Failed to fetch today's schedules");
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-md">
        <CardContent className="p-6">
          <p className="text-red-500">Failed to load schedules</p>
        </CardContent>
      </Card>
    );
  }

  if (!schedulesToday) return null;

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="mr-2 h-6 w-6" />
          Today's Schedules
        </CardTitle>
        <CardDescription>
          View and manage today's appointments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-lg font-semibold">{schedulesToday.summary.totalSchedules}</p>
            <p className="text-xs text-gray-600">Total</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{schedulesToday.summary.activeSchedules}</p>
            <p className="text-xs text-gray-600">Active</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{schedulesToday.summary.totalAppointments}</p>
            <p className="text-xs text-gray-600">Appointments</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {schedulesToday.schedules.slice(0, 4).map((schedule) => (
            <div key={schedule.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{schedule.doctorName}</p>
                <p className="text-sm text-gray-600">{schedule.timeSlot}</p>
              </div>
              <div className="text-right">
                <Badge variant={statusColors[schedule.status]}>
                  {schedule.status === 'token_started' ? 'Token Started' :
                   schedule.status === 'in_progress' ? 'In Progress' :
                   schedule.status === 'inactive_hidden' ? 'Inactive/Hidden' :
                   schedule.status === 'inactive_visible' ? 'Inactive/Visible' :
                   schedule.status === 'schedule_completed' ? 'Schedule Completed' :
                   schedule.status === 'booking_closed' ? 'Booking Closed' :
                   schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                </Badge>
                <p className="text-sm text-gray-600 mt-1">
                  {schedule.appointmentCount}/20 appointments
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full"
          onClick={() => navigate("/schedules")}
        >
          Manage Schedule
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
