import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardHeader } from "@/components/dashboard-header";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Edit, Trash2, Plus, Search, X, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { specialties } from "@shared/schema";
import { MultiSelect } from "@/components/ui/multi-select";

// Doctor schema
const doctorSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  specialty: z.string().min(1, "Specialty is required"),
  bio: z.string().optional(),
  imageUrl: z.string().optional(),
  clinicIds: z.array(z.number()).optional(),
});

// Update schema (no password required for updates)
const doctorUpdateSchema = doctorSchema.omit({ password: true }).partial();

type DoctorData = z.infer<typeof doctorSchema>;
type DoctorUpdateData = z.infer<typeof doctorUpdateSchema>;

interface Doctor extends DoctorData {
  id: number;
  role: string;
}

export default function DoctorCreation() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for managing doctor operations
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  
  // Fetch all clinics
  const { data: clinics = [] } = useQuery({
    queryKey: ['clinics'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/clinics');
      return await res.json();
    },
  });

  // Convert clinics to options format for MultiSelect
  const clinicOptions = clinics.map((clinic) => ({
    label: clinic.name,
    value: clinic.id,
  }));

  // Fetch all doctors
  const { data: doctors = [], isLoading, isError, error } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/doctors');
      return await res.json();
    },
  });

  // Redirect if not logged in or not a super admin
  if (!user) {
    navigate("/auth");
    return null;
  }

  if (user.role !== "super_admin") {
    navigate("/");
    return null;
  }

  // Form for creating and editing doctors
  const form = useForm<DoctorData>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      specialty: "",
      bio: "",
      imageUrl: "",
      clinicIds: [],
    },
  });
  
  // Form for editing doctors
  const editForm = useForm<DoctorUpdateData>({
    resolver: zodResolver(doctorUpdateSchema),
    defaultValues: {
      username: "",
      name: "",
      specialty: "",
      bio: "",
      imageUrl: "",
      clinicIds: [],
    },
  });

  // Create doctor mutation
  const createDoctorMutation = useMutation({
    mutationFn: async (data: DoctorData) => {
      const res = await apiRequest("POST", "/api/doctors", {
        ...data,
        role: "doctor",
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Doctor account created successfully",
      });
      form.reset();
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update doctor mutation
  const updateDoctorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: DoctorUpdateData }) => {
      const res = await apiRequest("PUT", `/api/doctors/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Doctor updated successfully",
      });
      editForm.reset();
      setIsEditDialogOpen(false);
      setSelectedDoctor(null);
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete doctor mutation
  const deleteDoctorMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/doctors/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Doctor deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedDoctor(null);
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handlers
  const onCreateSubmit = (data: DoctorData) => {
    createDoctorMutation.mutate(data);
  };
  
  const onEditSubmit = (data: DoctorUpdateData) => {
    if (selectedDoctor) {
      updateDoctorMutation.mutate({ id: selectedDoctor.id, data });
    }
  };
  
  const onDeleteConfirm = () => {
    if (selectedDoctor) {
      deleteDoctorMutation.mutate(selectedDoctor.id);
    }
  };
  
  // Handler for opening the edit dialog
  const handleEdit = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    
    // Fetch doctor's clinics
    apiRequest('GET', `/api/doctors/${doctor.id}/clinics`)
      .then(res => res.json())
      .then(clinics => {
        editForm.reset({
          username: doctor.username,
          name: doctor.name,
          specialty: doctor.specialty || "",
          bio: doctor.bio || "",
          imageUrl: doctor.imageUrl || "",
          clinicIds: clinics.map((clinic) => clinic.id),
        });
        setIsEditDialogOpen(true);
      })
      .catch(error => {
        console.error("Error fetching doctor clinics:", error);
        toast({
          title: "Error",
          description: "Failed to fetch doctor's clinics",
          variant: "destructive",
        });
        
        // Still open the dialog but without clinic data
        editForm.reset({
          username: doctor.username,
          name: doctor.name,
          specialty: doctor.specialty || "",
          bio: doctor.bio || "",
          imageUrl: doctor.imageUrl || "",
          clinicIds: [],
        });
        setIsEditDialogOpen(true);
      });
  };
  
  // Handler for opening the delete dialog
  const handleDelete = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader title="Doctor Management" />
      
      <main className="container mx-auto py-6 px-4">
        <div className="flex justify-between items-center mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate("/super-admin-dashboard")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <Button 
            onClick={() => {
              form.reset();
              setIsCreateDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Doctor
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading doctors...</span>
          </div>
        ) : isError ? (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="text-center text-destructive">
                <p>Error loading doctors: {error instanceof Error ? error.message : 'Unknown error'}</p>
                <Button 
                  variant="outline" 
                  className="mt-4" 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['doctors'] })}
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Doctors</CardTitle>
            </CardHeader>
            <CardContent>
              {doctors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No doctors found</p>
                  <Button 
                    variant="outline" 
                    className="mt-4" 
                    onClick={() => {
                      form.reset();
                      setIsCreateDialogOpen(true);
                    }}
                  >
                    Add Your First Doctor
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Specialty</TableHead>
                        <TableHead className="w-[150px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {doctors.map((doctor: Doctor) => (
                        <TableRow key={doctor.id}>
                          <TableCell>{doctor.name}</TableCell>
                          <TableCell>{doctor.username}</TableCell>
                          <TableCell>
                            {doctor.specialty ? (
                              <Badge variant="outline">{doctor.specialty}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not specified</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEdit(doctor)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-destructive"
                                onClick={() => handleDelete(doctor)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {/* Create Doctor Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Doctor</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new doctor account.  
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="specialty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialty</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a specialty" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {specialties.map((specialty) => (
                            <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter doctor's bio and qualifications"
                          className="resize-none"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile Image URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/doctor-image.jpg" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="clinicIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinics</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={clinicOptions}
                          selected={field.value || []}
                          onChange={field.onChange}
                          placeholder="Select clinics..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createDoctorMutation.isPending}
                  >
                    {createDoctorMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Create Doctor
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Edit Doctor Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Doctor</DialogTitle>
              <DialogDescription>
                Update the doctor's information.  
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="specialty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialty</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a specialty" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {specialties.map((specialty) => (
                            <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter doctor's bio and qualifications"
                          className="resize-none"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile Image URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/doctor-image.jpg" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="clinicIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinics</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={clinicOptions}
                          selected={field.value || []}
                          onChange={field.onChange}
                          placeholder="Select clinics..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateDoctorMutation.isPending}
                  >
                    {updateDoctorMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Update Doctor
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Delete Doctor Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Delete Doctor</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this doctor? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {selectedDoctor && (
                <div className="rounded-md bg-muted p-4">
                  <p><strong>Name:</strong> {selectedDoctor.name}</p>
                  <p><strong>Username:</strong> {selectedDoctor.username}</p>
                  <p><strong>Specialty:</strong> {selectedDoctor.specialty || 'Not specified'}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="destructive"
                disabled={deleteDoctorMutation.isPending}
                onClick={onDeleteConfirm}
              >
                {deleteDoctorMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Doctor
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
