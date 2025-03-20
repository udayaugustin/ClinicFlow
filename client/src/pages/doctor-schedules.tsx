import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { NavHeader } from "@/components/nav-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Calendar, Clock } from "lucide-react";

// Define types
type Clinic = {
  id: number;
  name: string;
};

type Doctor = {
  id: number;
  name: string;
  specialty?: string;
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
  doctor?: Doctor;
  clinic?: Clinic;
};

const dayNames = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

export default function DoctorSchedulesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("list");
  const [selectedSchedule, setSelectedSchedule] = useState<DoctorSchedule | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  
  // Form state
  const [formData, setFormData] = useState({
    clinicId: 0,
    dayOfWeek: 1, // Default to Monday
    startTime: "09:00",
    endTime: "17:00",
    isActive: true,
    maxTokens: 20,
  });

  // Fetch clinics
  const { data: clinics, isLoading: isLoadingClinics } = useQuery<Clinic[]>({
    queryKey: ["/api/clinics"],
  });

  // Fetch doctors
  const { data: doctors, isLoading: isLoadingDoctors } = useQuery<Doctor[]>({
    queryKey: ["/api/doctors"],
  });
  
  // Fetch doctor schedules
  const { data: schedules, isLoading: isLoadingSchedules } = useQuery<DoctorSchedule[]>({
    queryKey: ["/api/doctors", selectedDoctor, "schedules"],
    enabled: selectedDoctor !== null,
    queryFn: async () => {
      const response = await fetch(`/api/doctors/${selectedDoctor}/schedules`);
      if (!response.ok) {
        throw new Error("Failed to fetch schedules");
      }
      return response.json();
    },
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (data: typeof formData & { doctorId: number }) => {
      const response = await fetch(`/api/doctors/${data.doctorId}/schedules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create schedule");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors", selectedDoctor, "schedules"] });
      toast({
        title: "Success",
        description: "Schedule created successfully",
      });
      resetForm();
      setActiveTab("list");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async (data: { id: number, schedule: Partial<typeof formData> }) => {
      const response = await fetch(`/api/doctors/schedules/${data.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data.schedule),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update schedule");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors", selectedDoctor, "schedules"] });
      toast({
        title: "Success",
        description: "Schedule updated successfully",
      });
      resetForm();
      setActiveTab("list");
      setSelectedSchedule(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/doctors/schedules/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete schedule");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors", selectedDoctor, "schedules"] });
      toast({
        title: "Success",
        description: "Schedule deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'maxTokens') {
      setFormData({ ...formData, [name]: parseInt(value) || 0 });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    // Convert string values to numbers for number fields
    if (name === 'clinicId' || name === 'dayOfWeek') {
      setFormData({ ...formData, [name]: parseInt(value, 10) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData({ ...formData, [name]: checked });
  };

  const handleEditSchedule = (schedule: DoctorSchedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      clinicId: schedule.clinicId,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      isActive: schedule.isActive,
      maxTokens: schedule.maxTokens,
    });
    setActiveTab("create");
  };

  const handleDeleteSchedule = (id: number) => {
    if (window.confirm("Are you sure you want to delete this schedule?")) {
      deleteScheduleMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDoctor) {
      toast({
        title: "Error",
        description: "Please select a doctor",
        variant: "destructive",
      });
      return;
    }

    // Create a copy of formData with number values properly converted
    const processedData = {
      ...formData,
      clinicId: Number(formData.clinicId),
      dayOfWeek: Number(formData.dayOfWeek),
      doctorId: selectedDoctor,
    };

    if (selectedSchedule) {
      updateScheduleMutation.mutate({
        id: selectedSchedule.id,
        schedule: processedData,
      });
    } else {
      createScheduleMutation.mutate(processedData);
    }
  };

  const resetForm = () => {
    setFormData({
      clinicId: 0,
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
      maxTokens: 20,
    });
    setSelectedSchedule(null);
  };

  const getClinicName = (clinicId: number) => {
    if (!clinics) return "Unknown";
    const clinic = clinics.find(c => c.id === clinicId);
    return clinic ? clinic.name : "Unknown";
  };

  useEffect(() => {
    if (selectedSchedule === null && activeTab === "create") {
      resetForm();
    }
  }, [activeTab, selectedSchedule]);

  return (
    <div className="container mx-auto py-4">
      <NavHeader />
      <div className="flex justify-between items-center my-6">
        <h1 className="text-3xl font-bold">Doctor Schedules</h1>
        <div className="flex items-center space-x-4">
          <Label htmlFor="doctor-select">Select Doctor:</Label>
          <Select
            value={selectedDoctor?.toString() || ""}
            onValueChange={(value) => setSelectedDoctor(Number(value))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select doctor" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingDoctors ? (
                <SelectItem value="loading" disabled>Loading...</SelectItem>
              ) : (
                doctors?.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id.toString()}>
                    {doctor.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedDoctor && (
            <Button onClick={() => setActiveTab("create")}>
              <Plus className="mr-2 h-4 w-4" /> Add Schedule
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Schedules List</TabsTrigger>
          <TabsTrigger value="create" disabled={!selectedDoctor}>
            {selectedSchedule ? "Edit Schedule" : "Create Schedule"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {!selectedDoctor ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-10">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Doctor Selected</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Please select a doctor to view their schedules.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : isLoadingSchedules ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-10">Loading schedules...</div>
              </CardContent>
            </Card>
          ) : (schedules && schedules.length > 0) ? (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableCaption>List of doctor schedules</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Clinic</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Max Tokens</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell>{dayNames[schedule.dayOfWeek]}</TableCell>
                        <TableCell>{getClinicName(schedule.clinicId)}</TableCell>
                        <TableCell>{schedule.startTime}</TableCell>
                        <TableCell>{schedule.endTime}</TableCell>
                        <TableCell>{schedule.maxTokens}</TableCell>
                        <TableCell>
                          {schedule.isActive ? (
                            <span className="text-green-600">Active</span>
                          ) : (
                            <span className="text-red-600">Inactive</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditSchedule(schedule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSchedule(schedule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-10">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Schedules Found</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    This doctor doesn't have any schedules yet.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setActiveTab("create")}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>{selectedSchedule ? "Edit Schedule" : "Create New Schedule"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="clinicId">Clinic</Label>
                    <Select
                      value={formData.clinicId.toString()}
                      onValueChange={(value) => handleSelectChange("clinicId", value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select clinic" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingClinics ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : (
                          clinics?.map((clinic) => (
                            <SelectItem key={clinic.id} value={clinic.id.toString()}>
                              {clinic.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="dayOfWeek">Day of Week</Label>
                    <Select
                      value={formData.dayOfWeek.toString()}
                      onValueChange={(value) => handleSelectChange("dayOfWeek", value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {dayNames.map((day, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input
                        id="startTime"
                        name="startTime"
                        type="time"
                        value={formData.startTime}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="endTime">End Time</Label>
                      <Input
                        id="endTime"
                        name="endTime"
                        type="time"
                        value={formData.endTime}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => handleSwitchChange("isActive", checked)}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>

                  <div>
                    <Label htmlFor="maxTokens">Max Tokens</Label>
                    <Input
                      id="maxTokens"
                      name="maxTokens"
                      type="number"
                      value={formData.maxTokens.toString()}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setActiveTab("list");
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}>
                    {selectedSchedule ? "Update Schedule" : "Create Schedule"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 