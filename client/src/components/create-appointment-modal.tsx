import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { User, DoctorSchedule } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type CreateAppointmentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorId: number;
  doctorName: string;
  scheduleId: number;
  clinicId: number;
  clinicName: string;
  selectedDate: Date;
};

export function CreateAppointmentModal({
  open,
  onOpenChange,
  doctorId,
  doctorName,
  scheduleId,
  clinicId,
  clinicName,
  selectedDate
}: CreateAppointmentModalProps) {
  const [tab, setTab] = useState<"existing" | "new">("existing");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [newPatientData, setNewPatientData] = useState({
    name: "",
    email: "",
    phone: ""
  });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Search for existing patients
  const { data: patients, isLoading: isLoadingPatients } = useQuery<User[]>({
    queryKey: ["search-patients", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 3) return [];
      const res = await apiRequest<User[]>(`/api/patients/search?q=${encodeURIComponent(searchTerm)}`);
      return res;
    },
    enabled: searchTerm.length >= 3
  });

  // Get token count for the schedule on the selected date
  const { data: tokenInfo } = useQuery({
    queryKey: ["token-count", scheduleId, selectedDate],
    queryFn: async () => {
      const res = await apiRequest<{ currentCount: number; maxTokens: number }>(
        `/api/schedules/${scheduleId}/token-count?date=${selectedDate.toISOString()}`
      );
      return res;
    }
  });

  // Create new patient mutation
  const createPatientMutation = useMutation({
    mutationFn: async (patientData: typeof newPatientData) => {
      const res = await apiRequest<User>("/api/patients", {
        method: "POST",
        body: JSON.stringify(patientData)
      });
      return res;
    },
    onSuccess: (data) => {
      toast({
        title: "Patient created",
        description: `${data.name} has been added successfully.`
      });
      setSelectedPatientId(data.id);
      queryClient.invalidateQueries({ queryKey: ["search-patients"] });
    }
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      const patientId = tab === "existing" ? selectedPatientId : createPatientMutation.data?.id;
      
      if (!patientId) {
        throw new Error("No patient selected");
      }

      const res = await apiRequest("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          doctorId,
          clinicId,
          scheduleId,
          date: selectedDate.toISOString()
        })
      });
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Appointment created",
        description: "The appointment has been booked successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["token-count"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create appointment: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setSearchTerm("");
    setSelectedPatientId(null);
    setNewPatientData({
      name: "",
      email: "",
      phone: ""
    });
    setTab("existing");
  };

  const handleCreateAppointment = async () => {
    if (tab === "new") {
      if (!newPatientData.name || !newPatientData.phone) {
        toast({
          title: "Missing information",
          description: "Please provide patient name and phone number.",
          variant: "destructive"
        });
        return;
      }
      await createPatientMutation.mutateAsync(newPatientData);
    }
    
    createAppointmentMutation.mutate();
  };

  const isAtCapacity = tokenInfo && tokenInfo.currentCount >= tokenInfo.maxTokens;
  const nextTokenNumber = tokenInfo ? tokenInfo.currentCount + 1 : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Appointment</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="space-y-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Doctor</Label>
                <div className="mt-1 text-sm">{doctorName}</div>
              </div>
              <div>
                <Label>Clinic</Label>
                <div className="mt-1 text-sm">{clinicName}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <div className="mt-1 text-sm">{format(selectedDate, "PPP")}</div>
              </div>
              <div>
                <Label>Token number</Label>
                <div className="mt-1 text-sm">
                  {isAtCapacity ? (
                    <span className="text-red-500">No tokens available</span>
                  ) : (
                    nextTokenNumber
                  )}
                </div>
              </div>
            </div>
          </div>

          <Tabs value={tab} onValueChange={(value) => setTab(value as "existing" | "new")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">Existing Patient</TabsTrigger>
              <TabsTrigger value="new">New Patient</TabsTrigger>
            </TabsList>
            
            <TabsContent value="existing" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="patientSearch">Search Patient</Label>
                  <Input
                    id="patientSearch"
                    placeholder="Search by name, email, or phone"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Type at least 3 characters to search
                  </p>
                </div>
                
                {isLoadingPatients && searchTerm.length >= 3 && (
                  <div className="text-sm">Searching patients...</div>
                )}
                
                {patients && patients.length > 0 ? (
                  <RadioGroup
                    value={selectedPatientId?.toString() || ""}
                    onValueChange={(value) => setSelectedPatientId(parseInt(value))}
                  >
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {patients.map((patient) => (
                        <div key={patient.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={patient.id.toString()} id={`patient-${patient.id}`} />
                          <Label htmlFor={`patient-${patient.id}`} className="flex-1 cursor-pointer">
                            <div className="font-medium">{patient.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {patient.phone} {patient.email ? `• ${patient.email}` : ''}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                ) : searchTerm.length >= 3 && !isLoadingPatients ? (
                  <div className="text-sm text-muted-foreground">No patients found. Try a different search or create a new patient.</div>
                ) : null}
              </div>
            </TabsContent>
            
            <TabsContent value="new" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="patientName">Patient Name*</Label>
                  <Input
                    id="patientName"
                    placeholder="Enter patient name"
                    value={newPatientData.name}
                    onChange={(e) => setNewPatientData({ ...newPatientData, name: e.target.value })}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="patientPhone">Phone Number*</Label>
                  <Input
                    id="patientPhone"
                    placeholder="Enter phone number"
                    value={newPatientData.phone}
                    onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="patientEmail">Email (Optional)</Label>
                  <Input
                    id="patientEmail"
                    placeholder="Enter email address"
                    value={newPatientData.email}
                    onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline" 
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateAppointment}
            disabled={
              isAtCapacity ||
              (tab === "existing" && !selectedPatientId) ||
              (tab === "new" && (!newPatientData.name || !newPatientData.phone)) ||
              createAppointmentMutation.isPending ||
              createPatientMutation.isPending
            }
          >
            {createAppointmentMutation.isPending || createPatientMutation.isPending
              ? "Creating..."
              : "Create Appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 