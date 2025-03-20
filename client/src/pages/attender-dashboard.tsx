import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { User, Appointment } from "@shared/schema";
import { NavHeader } from "@/components/nav-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, isSameDay } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, XCircle, Clock, Calendar as CalendarIcon, Building, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger,
  TooltipProvider 
} from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";
import { AppointmentActions } from "@/components/appointment-actions";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Updated type definition without presence info in schedules
type DoctorSchedule = {
  id: number;
  doctorId: number;
  clinicId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  maxTokens?: number;
  createdAt?: string;
  updatedAt?: string;
  appointments: (Appointment & { patient?: User })[];
};

type DoctorWithAppointments = {
  doctor: User;
  appointments: (Appointment & { patient?: User })[];
  clinicId: number;
  schedules: DoctorSchedule[];
};

export default function AttenderDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isWalkInDialogOpen, setIsWalkInDialogOpen] = useState(false);
  const [walkInFormValues, setWalkInFormValues] = useState({
    doctorId: 0,
    clinicId: 0,
    scheduleId: 0,
    guestName: "",
    guestPhone: ""
  });
  const [walkInCurrentDoctor, setWalkInCurrentDoctor] = useState<{
    doctorId: number;
    doctorName: string;
    clinicId: number;
    scheduleId: number;
    date: Date;
  } | null>(null);

  // Main query for fetching doctor data with schedules and appointments
  const { data: managedDoctors, isLoading, error } = useQuery<DoctorWithAppointments[]>({
    queryKey: [`/api/attender/${user?.id}/doctors/appointments`, selectedDate],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/attender/${user?.id}/doctors/appointments`);
      const data = await res.json();
      
      // Ensure each doctor has schedules initialized as an array
      return data.map((doctorData: any) => ({
        ...doctorData,
        schedules: doctorData.schedules || [],
        appointments: doctorData.appointments || []
      }));
    }
  });

  // Mutations for appointment status updates
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ 
      appointmentId, 
      status, 
      statusNotes 
    }: { 
      appointmentId: number; 
      status: string; 
      statusNotes?: string 
    }) => {
      const res = await apiRequest("PATCH", `/api/appointments/${appointmentId}/status`, { 
        status, 
        statusNotes 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/attender/${user?.id}/doctors/appointments`] });
      toast({
        title: "Success",
        description: "Appointment status updated successfully",
      });
    },
  });

  // Add a mutation for updating doctor arrival status
  const updateDoctorArrivalMutation = useMutation({
    mutationFn: async ({ 
      doctorId, 
      clinicId, 
      scheduleId, 
      hasArrived 
    }: { 
      doctorId: number; 
      clinicId: number; 
      scheduleId: number | null; 
      hasArrived: boolean; 
    }) => {
      const res = await apiRequest("PATCH", `/api/doctors/${doctorId}/arrival`, { 
        hasArrived, 
        clinicId, 
        scheduleId, 
        date: selectedDate.toISOString() 
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/attender/${user?.id}/doctors/appointments`] });
      toast({
        title: "Success",
        description: data.hasArrived ? "Doctor marked as arrived" : "Doctor marked as not arrived",
      });
    },
  });

  // Add a query for fetching doctor presence data for the selected date
  const { data: doctorPresences } = useQuery({
    queryKey: ['doctorPresences', managedDoctors, selectedDate],
    enabled: !!managedDoctors && managedDoctors.length > 0,
    queryFn: async () => {
      // Collect all doctor IDs and their schedules
      const presenceData: Record<number, Record<number, { hasArrived: boolean }>> = {};
      
      if (!managedDoctors) return presenceData;
      
      // Create a map of doctor ID -> schedule ID -> presence data
      for (const doctorData of managedDoctors) {
        const { doctor, schedules, clinicId } = doctorData;
        
        // Skip if no schedules
        if (!schedules || schedules.length === 0) continue;
        
        // Initialize record for this doctor
        presenceData[doctor.id] = {};
        
        // For each schedule, fetch presence data with schedule ID
        for (const schedule of schedules) {
          try {
            const res = await apiRequest("GET", 
              `/api/doctors/${doctor.id}/arrival?clinicId=${clinicId}&date=${selectedDate.toISOString()}`
            );
            const presence = await res.json();
            
            // Check if the presence record explicitly matches this schedule
            if (presence.scheduleId === schedule.id) {
              presenceData[doctor.id][schedule.id] = {
                hasArrived: presence.hasArrived
              };
            } else {
              // Default to not arrived for this schedule
              presenceData[doctor.id][schedule.id] = {
                hasArrived: false
              };
            }
          } catch (error) {
            console.error("Error fetching presence data:", error);
            presenceData[doctor.id][schedule.id] = {
              hasArrived: false
            };
          }
        }
      }
      
      return presenceData;
    }
  });

  // Helper function to get presence data for a doctor's schedule
  const getPresenceData = (doctorId: number, scheduleId: number) => {
    if (!doctorPresences || !doctorPresences[doctorId] || !doctorPresences[doctorId][scheduleId]) {
      return { hasArrived: false };
    }
    return doctorPresences[doctorId][scheduleId];
  };

  // Handler functions for updating status
  const handleUpdateStatus = (appointmentId: number, status: string, notes?: string) => {
    updateAppointmentMutation.mutate({ 
      appointmentId, 
      status, 
      statusNotes: notes 
    });
  };

  // Status update handlers
  const handleMarkAsCompleted = (appointmentId: number) => {
    handleUpdateStatus(appointmentId, "completed");
  };

  const handleMarkInProgress = (appointmentId: number) => {
    handleUpdateStatus(appointmentId, "start");
  };

  const handleHoldAppointment = (appointmentId: number) => {
    const notes = prompt("Please enter reason for holding:");
    if (notes !== null) {
      handleUpdateStatus(appointmentId, "hold", notes);
    }
  };
  
  const handlePauseAppointment = (appointmentId: number) => {
    const notes = prompt("Please enter reason for pausing:");
    if (notes !== null) {
      handleUpdateStatus(appointmentId, "pause", notes);
    }
  };
  
  const handleCancelAppointment = (appointmentId: number) => {
    const notes = prompt("Please enter reason for cancellation:");
    if (notes !== null) {
      handleUpdateStatus(appointmentId, "cancel", notes);
    }
  };

  // Handler for doctor arrival toggle
  const handleToggleDoctorArrival = (
    doctorId: number, 
    clinicId: number, 
    scheduleId: number | null, 
    hasArrived: boolean = true
  ) => {
    // Create a cache key for this specific doctor/schedule
    const cacheKey = `doctorPresence-${doctorId}-${scheduleId}`;
    
    // Optimistically update the UI
    queryClient.setQueryData(['doctorPresences', managedDoctors, selectedDate], (oldData: any) => {
      const newData = { ...oldData };
      if (!newData[doctorId]) {
        newData[doctorId] = {};
      }
      if (!newData[doctorId][scheduleId]) {
        newData[doctorId][scheduleId] = {};
      }
      newData[doctorId][scheduleId] = { hasArrived };
      return newData;
    });
    
    // Make the API call
    updateDoctorArrivalMutation.mutate({ 
      doctorId, 
      clinicId, 
      scheduleId, 
      hasArrived
    }, {
      onError: () => {
        // Revert optimistic update on error
        queryClient.setQueryData(['doctorPresences', managedDoctors, selectedDate], (oldData: any) => {
          const newData = { ...oldData };
          if (newData[doctorId] && newData[doctorId][scheduleId]) {
            newData[doctorId][scheduleId] = { hasArrived: !hasArrived };
          }
          return newData;
        });
        
        // Show error toast
        toast({
          title: "Error",
          description: "Failed to update doctor arrival status. Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  // Add this mutation
  const createWalkInAppointmentMutation = useMutation({
    mutationFn: async ({ 
      doctorId, 
      clinicId, 
      scheduleId, 
      date, 
      guestName, 
      guestPhone 
    }: { 
      doctorId: number;
      clinicId: number;
      scheduleId: number;
      date: Date;
      guestName: string;
      guestPhone?: string;
    }) => {
      const res = await apiRequest("POST", "/api/attender/walk-in-appointments", {
        doctorId,
        clinicId,
        scheduleId,
        date,
        guestName,
        guestPhone
      });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/attender/doctors"] });
      toast({
        title: "Success",
        description: "Walk-in appointment created successfully",
      });
      // Close the dialog
      setIsWalkInDialogOpen(false);
      // Reset the form
      setWalkInFormValues({
        doctorId: 0,
        clinicId: 0,
        scheduleId: 0,
        guestName: "",
        guestPhone: ""
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Add this handler function
  const handleCreateWalkInAppointment = () => {
    if (!walkInCurrentDoctor) return;
    
    if (!walkInFormValues.guestName.trim()) {
      toast({
        title: "Error",
        description: "Patient name is required",
        variant: "destructive",
      });
      return;
    }
    
    createWalkInAppointmentMutation.mutate({
      doctorId: walkInCurrentDoctor.doctorId,
      clinicId: walkInCurrentDoctor.clinicId,
      scheduleId: walkInCurrentDoctor.scheduleId,
      date: walkInCurrentDoctor.date,
      guestName: walkInFormValues.guestName,
      guestPhone: walkInFormValues.guestPhone
    });
  };

  // Add this function to open the walk-in dialog with doctor info
  const openWalkInDialog = (doctorId: number, doctorName: string, clinicId: number, scheduleId: number) => {
    // Create a date object for the current date
    const appointmentDate = new Date(selectedDate);
    
    // Set the doctor info
    setWalkInCurrentDoctor({
      doctorId,
      doctorName,
      clinicId,
      scheduleId,
      date: appointmentDate
    });
    
    // Update form values
    setWalkInFormValues({
      doctorId,
      clinicId,
      scheduleId,
      guestName: "",
      guestPhone: ""
    });
    
    // Open the dialog
    setIsWalkInDialogOpen(true);
  };

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
      <TooltipProvider>
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6">Doctor Appointments Dashboard</h1>

          <div className="grid md:grid-cols-[300px,1fr] gap-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Select Date</h2>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => setSelectedDate(date || new Date())}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue={managedDoctors?.[0]?.doctor?.id?.toString()}>
                  <TabsList className="mb-4">
                    {managedDoctors?.map((item) => (
                      <TabsTrigger 
                        key={item.doctor.id} 
                        value={item.doctor.id.toString()}
                      >
                        {item.doctor.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {managedDoctors?.map((doctorData) => {
                    // Filter schedules for the selected date
                    const dayOfWeek = selectedDate.getDay();
                    const schedulesForDay = doctorData.schedules?.filter(
                      schedule => schedule.dayOfWeek === dayOfWeek
                    ) || [];
                    
                    // Filter appointments for the selected date
                    const appointmentsForDay = doctorData.appointments?.filter(
                      apt => isSameDay(new Date(apt.date), selectedDate)
                    ) || [];
                    
                    return (
                      <TabsContent 
                        key={doctorData.doctor.id} 
                        value={doctorData.doctor.id.toString()}
                      >
                        <div className="flex justify-between items-center mb-6">
                          <div>
                            <h2 className="text-xl font-semibold">{doctorData.doctor.name}</h2>
                            <p className="text-muted-foreground">{doctorData.doctor.specialty}</p>
                          </div>
                        </div>

                        {schedulesForDay.length === 0 ? (
                          <div className="bg-muted p-6 rounded-lg text-center">
                            <CalendarIcon className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">No schedules for this doctor on {format(selectedDate, "EEEE")}.</p>
                          </div>
                        ) : (
                          // Implement nested tabs for schedules
                          <Tabs defaultValue={schedulesForDay[0]?.id?.toString()} className="w-full">
                            <div className="overflow-x-auto py-4">
                              <TabsList className="flex space-x-4 p-1 min-w-max bg-transparent">
                                {schedulesForDay.map(schedule => {
                                  // Get presence status for visual indication
                                  const hasArrived = getPresenceData(doctorData.doctor.id, schedule.id).hasArrived;
                                  
                                  // Count appointments for this schedule that are not canceled
                                  const activeAppointments = schedule.appointments
                                    .filter(apt => 
                                      isSameDay(new Date(apt.date), selectedDate) && 
                                      apt.status !== "cancel"
                                    ).length;
                                  
                                  return (
                                    <TabsTrigger 
                                      key={schedule.id} 
                                      value={schedule.id.toString()}
                                      className="min-w-[240px] flex-col items-start px-4 py-3 rounded-lg border data-[state=active]:border-blue-300 data-[state=active]:bg-blue-50 data-[state=active]:shadow-sm"
                                    >
                                      <div className="flex items-center w-full mb-2">
                                        <Clock className="h-5 w-5 text-blue-500 mr-2" />
                                        <span className="text-base font-medium">{schedule.startTime} - {schedule.endTime}</span>
                                      </div>
                                      <div className="flex items-center gap-3 w-full">
                                        {hasArrived ? (
                                          <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Doctor Present</div>
                                        ) : (
                                          <div className="px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Awaiting Doctor</div>
                                        )}
                                        <div className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                          {activeAppointments} Patient{activeAppointments !== 1 ? 's' : ''}
                                        </div>
                                      </div>
                                    </TabsTrigger>
                                  );
                                })}
                              </TabsList>
                            </div>

                            {schedulesForDay.map(schedule => {
                              // Filter appointments that belong to this schedule
                              const scheduleAppointments = schedule.appointments
                                .filter(apt => isSameDay(new Date(apt.date), selectedDate))
                                .sort((a, b) => a.tokenNumber - b.tokenNumber);
                                
                              return (
                                <TabsContent 
                                  key={schedule.id} 
                                  value={schedule.id.toString()}
                                >
                                  <Card>
                                    <CardHeader className="pb-0">
                                      <div className="flex justify-between items-center">
                                        <div>
                                          <CardTitle className="flex items-center gap-2">
                                            <Building className="h-5 w-5" />
                                            Clinic Hours: {schedule.startTime} - {schedule.endTime}
                                          </CardTitle>
                                          <p className="text-sm text-muted-foreground mt-1">
                                            Maximum Tokens: {schedule.maxTokens || "Unlimited"}
                                          </p>
                                        </div>
                                        <div className="flex gap-2 items-center mt-2">
                                          <Button
                                            variant={getPresenceData(doctorData.doctor.id, schedule.id).hasArrived ? "default" : "outline"}
                                            className="gap-2"
                                            onClick={() => handleToggleDoctorArrival(
                                              doctorData.doctor.id,
                                              schedule.clinicId,
                                              schedule.id,
                                              !getPresenceData(doctorData.doctor.id, schedule.id).hasArrived
                                            )}
                                          >
                                            {getPresenceData(doctorData.doctor.id, schedule.id).hasArrived ? (
                                              <>
                                                <CheckCircle2 className="h-4 w-4" />
                                                Doctor Present
                                              </>
                                            ) : (
                                              <>
                                                <Clock className="h-4 w-4" />
                                                Mark as Arrived
                                              </>
                                            )}
                                          </Button>
                                          
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2"
                                            onClick={() => openWalkInDialog(
                                              doctorData.doctor.id, 
                                              doctorData.doctor.name, 
                                              schedule.clinicId, 
                                              schedule.id
                                            )}
                                          >
                                            <Plus className="h-4 w-4" />
                                            New Walk-in
                                          </Button>
                                        </div>
                                      </div>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                      <div className="overflow-x-auto">
                                        <table className="w-full">
                                          <thead>
                                            <tr className="border-b">
                                              <th className="text-left py-4 px-4">Token #</th>
                                              <th className="text-left py-4 px-4">Patient</th>
                                              <th className="text-left py-4 px-4">Time</th>
                                              <th className="text-left py-4 px-4">Status</th>
                                              <th className="text-left py-4 px-4">Actions</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {scheduleAppointments.length === 0 ? (
                                              <tr>
                                                <td colSpan={5} className="text-center py-8 text-muted-foreground">
                                                  No appointments scheduled for {format(selectedDate, "PPP")}
                                                </td>
                                              </tr>
                                            ) : (
                                              scheduleAppointments.map((appointment) => (
                                                <tr 
                                                  key={appointment.id} 
                                                  className={`border-b ${appointment.status === "in_progress" ? "bg-blue-50" : ""}`}
                                                >
                                                  <td className="py-4 px-4">{appointment.tokenNumber}</td>
                                                  <td className="py-4 px-4">
                                                    {appointment.isWalkIn ? (
                                                      <div>
                                                        <div className="font-medium">{appointment.guestName}</div>
                                                        <Badge variant="outline" className="mt-1">Walk-in</Badge>
                                                      </div>
                                                    ) : (
                                                      <div className="font-medium">{appointment.patient?.name}</div>
                                                    )}
                                                  </td>
                                                  <td className="py-4 px-4">{format(new Date(appointment.date), "hh:mm a")}</td>
                                                  <td className="py-4 px-4">
                                                    <Badge
                                                      variant={
                                                        appointment.status === "completed" ? "outline" :
                                                        appointment.status === "start" ? "default" :
                                                        appointment.status === "hold" ? "secondary" :
                                                        appointment.status === "pause" ? "destructive" :
                                                        appointment.status === "cancel" ? "destructive" :
                                                        "outline"
                                                      }
                                                    >
                                                      {appointment.status === "scheduled" ? "Scheduled" :
                                                      appointment.status === "start" ? "In Progress" :
                                                      appointment.status === "hold" ? "On Hold" :
                                                      appointment.status === "pause" ? "Paused" :
                                                      appointment.status === "cancel" ? "Cancelled" :
                                                      appointment.status === "completed" ? "Completed" :
                                                      "Unknown"}
                                                    </Badge>
                                                    {appointment.statusNotes && (
                                                      <Tooltip>
                                                        <TooltipTrigger asChild>
                                                          <InfoIcon className="inline-block ml-2 h-4 w-4 text-muted-foreground cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                          <p>{appointment.statusNotes}</p>
                                                        </TooltipContent>
                                                      </Tooltip>
                                                    )}
                                                  </td>
                                                  <td className="py-4 px-4">
                                                    <AppointmentActions
                                                      appointment={appointment}
                                                      onMarkAsStarted={() => handleMarkInProgress(appointment.id)}
                                                      onMarkAsCompleted={() => handleMarkAsCompleted(appointment.id)}
                                                      onHold={() => handleHoldAppointment(appointment.id)}
                                                      onPause={() => handlePauseAppointment(appointment.id)}
                                                      onCancel={() => handleCancelAppointment(appointment.id)}
                                                    />
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
                              );
                            })}
                          </Tabs>
                        )}
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </main>
      </TooltipProvider>
      <Dialog open={isWalkInDialogOpen} onOpenChange={setIsWalkInDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Walk-in Appointment</DialogTitle>
            <DialogDescription>
              {walkInCurrentDoctor && (
                <p>Creating appointment for Dr. {walkInCurrentDoctor.doctorName} on {format(selectedDate, "PPP")}</p>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="guestName" className="text-right col-span-1">
                Patient Name
              </Label>
              <Input
                id="guestName"
                placeholder="Enter patient name"
                className="col-span-3"
                value={walkInFormValues.guestName}
                onChange={(e) => setWalkInFormValues({
                  ...walkInFormValues,
                  guestName: e.target.value
                })}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="guestPhone" className="text-right col-span-1">
                Phone Number
              </Label>
              <Input
                id="guestPhone"
                placeholder="Enter phone number (optional)"
                className="col-span-3"
                value={walkInFormValues.guestPhone}
                onChange={(e) => setWalkInFormValues({
                  ...walkInFormValues,
                  guestPhone: e.target.value
                })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleCreateWalkInAppointment}
              disabled={createWalkInAppointmentMutation.isPending}
            >
              {createWalkInAppointmentMutation.isPending ? "Creating..." : "Create Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}