import { useAuth } from "@/hooks/use-auth";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard-header";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Phone, Mail, Clock, Building, Plus, User, Calendar } from "lucide-react";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import React from "react";

// Attender schema
const attenderSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
});

type AttenderData = z.infer<typeof attenderSchema>;

interface Attender {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string;
  clinicId?: number;
}

interface Clinic {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  openingHours: string;
  description?: string;
  imageUrl?: string;
}

interface Doctor {
  id: number;
  name: string;
  username: string;
  specialty: string;
  bio?: string;
  imageUrl?: string;
  clinicId?: number;
}

export default function ClinicView() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const [match, params] = useRoute<{ id: string }>("/clinic/:id");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddAttenderDialogOpen, setIsAddAttenderDialogOpen] = useState(false);
  const [isEditAttenderDialogOpen, setIsEditAttenderDialogOpen] = useState(false);
  const [isDeleteAttenderDialogOpen, setIsDeleteAttenderDialogOpen] = useState(false);
  const [selectedAttender, setSelectedAttender] = useState<Attender | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  
  // Form for creating attenders
  const form = useForm<AttenderData>({
    resolver: zodResolver(attenderSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      phone: "",
    },
  });
  
  // Form for editing attenders
  const editForm = useForm<Omit<AttenderData, 'password'> & { id: number }>({
    resolver: zodResolver(attenderSchema.omit({ password: true }).extend({
      id: z.number()
    })),
    defaultValues: {
      id: 0,
      username: "",
      name: "",
      email: "",
      phone: "",
    },
  });

  // Fetch clinic details
  const { 
    data: clinic, 
    isLoading: isClinicLoading, 
    isError: isClinicError 
  } = useQuery({
    queryKey: ['clinic', params?.id],
    queryFn: async () => {
      if (!params?.id) return null;
      const res = await apiRequest('GET', `/api/clinics/${params.id}`);
      return await res.json();
    },
    enabled: !!params?.id,
  });

  // Fetch attenders for this clinic
  const {
    data: attenders = [],
    isLoading: isAttendersLoading,
    isError: isAttendersError
  } = useQuery({
    queryKey: ['clinic-attenders', params?.id],
    queryFn: async () => {
      if (!params?.id) return [];
      const res = await apiRequest('GET', `/api/attenders?clinicId=${params.id}`);
      return await res.json();
    },
    enabled: !!params?.id,
  });

  // Fetch doctors for this clinic
  const { 
    data: doctors = [], 
    isLoading: isDoctorsLoading, 
    isError: isDoctorsError 
  } = useQuery({
    queryKey: ['clinic-doctors', params?.id],
    queryFn: async () => {
      if (!params?.id) return [];
      const res = await apiRequest('GET', `/api/clinics/${params.id}/doctors`);
      return await res.json();
    },
    enabled: !!params?.id,
    refetchOnMount: 'always',  // Always refetch when component mounts
    staleTime: 0,              // Consider data stale immediately
  });

  // Create attender mutation
  const createAttenderMutation = useMutation({
    mutationFn: async (data: AttenderData) => {
      const res = await apiRequest("POST", "/api/attenders", {
        ...data,
        role: "attender",
        clinicId: Number(params?.id),
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attender account created successfully",
      });
      form.reset();
      setIsAddAttenderDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['clinic-attenders', params?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create attender account",
        variant: "destructive",
      });
    },
  });
  
  // Update attender mutation
  const updateAttenderMutation = useMutation({
    mutationFn: async (data: Omit<AttenderData, 'password'> & { id: number }) => {
      const { id, ...updateData } = data;
      const res = await apiRequest("PUT", `/api/attenders/${id}`, updateData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attender account updated successfully",
      });
      editForm.reset();
      setIsEditAttenderDialogOpen(false);
      setSelectedAttender(null);
      queryClient.invalidateQueries({ queryKey: ['clinic-attenders', params?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update attender account",
        variant: "destructive",
      });
    },
  });
  
  // Delete attender mutation
  const deleteAttenderMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/attenders/${id}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete attender");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attender account deleted successfully",
      });
      setIsDeleteAttenderDialogOpen(false);
      setSelectedAttender(null);
      queryClient.invalidateQueries({ queryKey: ['clinic-attenders', params?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete attender account",
        variant: "destructive",
      });
    },
  });

  // Form submission handlers
  const onAddAttenderSubmit = (data: AttenderData) => {
    createAttenderMutation.mutate(data);
  };
  
  const onEditAttenderSubmit = (data: Omit<AttenderData, 'password'> & { id: number }) => {
    updateAttenderMutation.mutate(data);
  };
  
  const onDeleteAttender = () => {
    if (selectedAttender) {
      deleteAttenderMutation.mutate(selectedAttender.id);
    }
  };
  
  const handleEditAttender = (attender: Attender) => {
    setSelectedAttender(attender);
    editForm.reset({
      id: attender.id,
      username: attender.username,
      name: attender.name,
      email: attender.email,
      phone: attender.phone || "",
    });
    setIsEditAttenderDialogOpen(true);
  };
  
  const handleDeleteAttender = (attender: Attender) => {
    setSelectedAttender(attender);
    setIsDeleteAttenderDialogOpen(true);
  };

  // Redirect if not logged in
  if (!user) {
    navigate("/login");
    return null;
  }

  // Loading state
  if (isClinicLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading clinic details...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (isClinicError || !clinic) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center h-64">
          <h2 className="text-xl font-bold text-red-500">Error</h2>
          <p className="text-muted-foreground">Failed to load clinic details</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate("/clinics")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clinics
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <DashboardHeader
        heading={clinic.name}
        text={`View and manage clinic details, doctors, and attenders.`}
      >
        <Button 
          variant="outline" 
          onClick={() => navigate("/clinics")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clinics
        </Button>
      </DashboardHeader>

      <main className="grid gap-6 mt-6">
        <Tabs defaultValue="details" value={activeTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger 
              value="details" 
              onClick={() => setActiveTab("details")}
            >
              Clinic Details
            </TabsTrigger>
            <TabsTrigger 
              value="doctors" 
              onClick={() => setActiveTab("doctors")}
            >
              Doctors
            </TabsTrigger>
            <TabsTrigger 
              value="attenders" 
              onClick={() => setActiveTab("attenders")}
            >
              Attenders
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Clinic Information</CardTitle>
                <CardDescription>
                  View and manage clinic details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 opacity-70" />
                      <span className="font-medium">Address</span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {clinic.address}, {clinic.city}, {clinic.state} {clinic.zipCode}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 opacity-70" />
                      <span className="font-medium">Phone</span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {clinic.phone}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 opacity-70" />
                      <span className="font-medium">Email</span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {clinic.email}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 opacity-70" />
                      <span className="font-medium">Opening Hours</span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {clinic.openingHours}
                    </p>
                  </div>
                </div>
                
                {clinic.description && (
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2 opacity-70" />
                      <span className="font-medium">About</span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {clinic.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="doctors" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Doctors</h3>
            </div>
            
            {isDoctorsLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : isDoctorsError ? (
              <p className="text-red-500">Error loading doctors</p>
            ) : doctors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <User className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No Doctors Found</h3>
                <p className="text-sm text-muted-foreground">
                  There are no doctors associated with this clinic yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {doctors.map((doctor: Doctor) => (
                  <Card key={doctor.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{doctor.name}</CardTitle>
                      <CardDescription>{doctor.specialty || "General Physician"}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 opacity-70" />
                          <span>{doctor.username}</span>
                        </div>
                        {doctor.bio && (
                          <p className="text-muted-foreground line-clamp-2">{doctor.bio}</p>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => navigate(`/doctor/${doctor.id}`)}
                      >
                        View Profile
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="attenders" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Attenders</h3>
              <Button
                size="sm"
                onClick={() => setIsAddAttenderDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Attender
              </Button>
            </div>
            
            {isAttendersLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : isAttendersError ? (
              <p className="text-red-500">Error loading attenders</p>
            ) : attenders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <User className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No Attenders Found</h3>
                <p className="text-sm text-muted-foreground">
                  There are no attenders associated with this clinic yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {attenders.map((attender: Attender) => (
                  <Card key={attender.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{attender.name}</CardTitle>
                      <CardDescription>Clinic Attender</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 opacity-70" />
                          <span>{attender.username}</span>
                        </div>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 opacity-70" />
                          <span>{attender.email}</span>
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2 opacity-70" />
                          <span>{attender.phone}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditAttender(attender)}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteAttender(attender)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Add Attender Dialog */}
        <Dialog open={isAddAttenderDialogOpen} onOpenChange={setIsAddAttenderDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Attender</DialogTitle>
              <DialogDescription>
                Create a new attender account for {clinic.name}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onAddAttenderSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter username" {...field} />
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
                        <Input 
                          type="password" 
                          placeholder="Enter password" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Enter email address" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddAttenderDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createAttenderMutation.isPending}
                  >
                    {createAttenderMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Attender
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Edit Attender Dialog */}
        <Dialog open={isEditAttenderDialogOpen} onOpenChange={setIsEditAttenderDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Attender</DialogTitle>
              <DialogDescription>
                Update attender information for {selectedAttender?.name}
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditAttenderSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter username" {...field} />
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
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Enter email address" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditAttenderDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateAttenderMutation.isPending}
                  >
                    {updateAttenderMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Attender'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Delete Attender Confirmation */}
        <AlertDialog open={isDeleteAttenderDialogOpen} onOpenChange={setIsDeleteAttenderDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the attender account for {selectedAttender?.name}.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDeleteAttender}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteAttenderMutation.isPending}
              >
                {deleteAttenderMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
